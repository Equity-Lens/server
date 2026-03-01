import { Server as SocketIOServer, Socket } from 'socket.io';
import finnhubWebSocket from '../services/finnhubWebSocket';

export const initializeSocketHandlers = (io: SocketIOServer): void => {
  // Initialize Finnhub WebSocket connection
  finnhubWebSocket.initialize(io);

  // Handle client connections
  io.on('connection', (socket: Socket) => {
    console.log(` Client connected: ${socket.id}`);

    // Send connection confirmation to client
    socket.emit('connected', {
      message: 'Connected to trading platform',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Handle subscribe request from client
    socket.on('subscribe-stocks', (symbols: string[]) => {
      if (!Array.isArray(symbols)) {
        console.warn(` Invalid symbols from ${socket.id}:`, symbols);
        return;
      }

      console.log(` Client ${socket.id} subscribing to: ${symbols.join(', ')}`);

      symbols.forEach((symbol) => {
        if (typeof symbol === 'string' && symbol.trim()) {
          const upperSymbol = symbol.toUpperCase().trim();

          // Join the Socket.IO room for this symbol
          socket.join(`stock:${upperSymbol}`);

          // Subscribe to Finnhub for this symbol
          finnhubWebSocket.subscribe(upperSymbol);
        }
      });

      // Confirm subscription to client
      socket.emit('subscribed', {
        symbols: symbols.map((s) => s.toUpperCase()),
        timestamp: new Date().toISOString(),
      });
    });

    // Handle unsubscribe request from client
    socket.on('unsubscribe-stocks', (symbols: string[]) => {
      if (!Array.isArray(symbols)) {
        console.warn(` Invalid symbols from ${socket.id}:`, symbols);
        return;
      }

      console.log(` Client ${socket.id} unsubscribing from: ${symbols.join(', ')}`);

      symbols.forEach((symbol) => {
        if (typeof symbol === 'string' && symbol.trim()) {
          const upperSymbol = symbol.toUpperCase().trim();

          // Leave the Socket.IO room for this symbol
          socket.leave(`stock:${upperSymbol}`);
        }
      });

      // Confirm unsubscription to client
      socket.emit('unsubscribed', {
        symbols: symbols.map((s) => s.toUpperCase()),
        timestamp: new Date().toISOString(),
      });
    });

    // Handle request for connection status
    socket.on('get-status', () => {
      socket.emit('status', {
        finnhub: finnhubWebSocket.getStats(),
        socketId: socket.id,
        rooms: Array.from(socket.rooms),
        timestamp: new Date().toISOString(),
      });
    });

    // Handle client disconnect
    socket.on('disconnect', (reason: string) => {
      console.log(` Client disconnected: ${socket.id} (${reason})`);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error(` Socket error for ${socket.id}:`, error.message);
    });
  });

  // Log when Socket.IO server is ready
  console.log(' Socket.IO handlers initialized');
};

export default initializeSocketHandlers;