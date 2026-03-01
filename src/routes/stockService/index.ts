import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = Router();

const STOCK_SERVICE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:8080';

// Proxy all /v1/stock/* requests to Spring Boot /api/stock/*
router.use(
  '/',
  createProxyMiddleware({
    target: STOCK_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/': '/api/stock/',
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(` [Proxy] ${req.method} ${STOCK_SERVICE_URL}/api/stock${req.url}`);
      },
      proxyRes: (proxyRes, req, res) => {
        console.log(` [Proxy] Response: ${proxyRes.statusCode}`);
      },
      error: (err, req, res) => {
        console.error(' [Proxy] Stock Service Error:', err.message);
        (res as any).status(502).json({
          success: false,
          error: 'Stock service unavailable',
        });
      },
    },
  })
);

export default router;