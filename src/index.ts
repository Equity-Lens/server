import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';
import pool from './config/database';
import UserModel from './models/User';
import { initializeSocketHandlers } from './socket/socketHandler';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize Socket handlers for real-time stock updates
initializeSocketHandlers(io);

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
});

app.use('/v1/', limiter);

// Request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW()');

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      dbTime: dbResult.rows[0].now,
      websocket: {
        status: 'active',
        connectedClients: io.engine.clientsCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Trading Platform API',
    version: '1.0.0',
    features: {
      rest: true,
      websocket: true,
    },
    endpoints: {
      health: '/health',
      api: '/v1',
      websocket: 'ws://localhost:' + PORT,
    },
  });
});

app.use(notFound);
app.use(errorHandler);

httpServer.listen(PORT, () => {
  console.log('========================================');
  console.log(' Trading Platform Server');
  console.log('========================================');
  console.log(` PORT: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` REST API: http://localhost:${PORT}`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log('========================================');
});

const shutdown = async () => {
  console.log('\n Shutting down...');

  // Close all Socket.IO connections
  io.close(() => {
    console.log(' WebSocket server closed');
  });

  httpServer.close(async () => {
    await pool.end();
    console.log(' Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Clean expired tokens every hour
setInterval(async () => {
  try {
    await UserModel.cleanExpiredTokens();
    console.log(' Cleaned expired tokens');
  } catch (error) {
    console.error('Failed to clean tokens:', error);
  }
}, 3600000);

export { app, io };