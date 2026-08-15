'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const proxy = require('express-http-proxy');
const { v4: uuidv4 } = require('uuid');

const logger = require('./middleware/logger');
const { verifyToken } = require('./middleware/auth');
const { createRateLimiter, authRateLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// Middleware global
// ============================================================
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID untuk tracing
app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  next();
});

// HTTP logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// ============================================================
// Health check (no auth required)
// ============================================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ============================================================
// Auth endpoints — strict rate limiting, no JWT required
// ============================================================
const authProxy = proxy(process.env.USER_SERVICE_URL, {
  proxyReqPathResolver: (req) => req.url.replace('/api/auth', '/auth'),
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Auth proxy error: ${err.message}`);
    res.status(502).json({ error: 'Gateway Error', message: 'User service unavailable' });
  }
});

app.use('/api/auth', authRateLimiter, authProxy);

// ============================================================
// JWT Middleware — semua endpoint di bawah ini wajib auth
// ============================================================
app.use('/api', createRateLimiter(), verifyToken);

// ============================================================
// Proxy Routes (setelah auth berhasil)
// ============================================================
const createProxy = (targetUrl, pathPrefix, serviceReplacement) =>
  proxy(targetUrl, {
    proxyReqPathResolver: (req) =>
      req.url.replace(pathPrefix, serviceReplacement),

    // Forward info user dari JWT ke service downstream
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['X-User-Id'] = srcReq.user?.sub || '';
      proxyReqOpts.headers['X-User-Email'] = srcReq.user?.email || '';
      proxyReqOpts.headers['X-User-Role'] = srcReq.user?.role || '';
      proxyReqOpts.headers['X-Request-Id'] = srcReq.id;
      return proxyReqOpts;
    },

    proxyErrorHandler: (err, res, _next) => {
      logger.error(`Proxy error to ${targetUrl}: ${err.message}`);
      res.status(502).json({ error: 'Gateway Error', message: 'Service temporarily unavailable' });
    }
  });

// Route mapping
app.use('/api/users',      createProxy(process.env.USER_SERVICE_URL,       '/api/users',      '/users'));
app.use('/api/stations',   createProxy(process.env.STATION_SERVICE_URL,    '/api/stations',   '/stations'));
app.use('/api/bookings',   createProxy(process.env.BOOKING_SERVICE_URL,    '/api/bookings',   '/bookings'));
app.use('/api/queue',      createProxy(process.env.QUEUE_SERVICE_URL,      '/api/queue',      '/queue'));
app.use('/api/payments',   createProxy(process.env.PAYMENT_SERVICE_URL,    '/api/payments',   '/payments'));
app.use('/api/monitoring', createProxy(process.env.MONITORING_SERVICE_URL, '/api/monitoring', '/monitoring'));

// ============================================================
// 404 Handler
// ============================================================
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route tidak ditemukan' });
});

// ============================================================
// Global Error Handler
// ============================================================
app.use((err, _req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error', message: 'Terjadi kesalahan internal' });
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
