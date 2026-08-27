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
// CORS harus paling pertama sebelum semua middleware lain
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cookie');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
// Jangan parse body untuk auth routes — biarkan proxy meneruskan body stream langsung
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) return next();
  express.json({ limit: '10mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth')) return next();
  express.urlencoded({ extended: true })(req, res, next);
});

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
// Manual forward untuk auth (express-http-proxy tidak kompatibel dengan global CORS headers)
const http = require('http');
const { URL } = require('url');

function forwardToUserService(req, res) {
  const userServiceUrl = new URL(process.env.USER_SERVICE_URL);
  const targetPath = '/auth' + req.url;
  const chunks = [];

  const options = {
    hostname: userServiceUrl.hostname,
    port: userServiceUrl.port || 3001,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-Request-Id': req.id || ''
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    // Salin headers dari upstream kecuali yang sudah di-set global
    Object.entries(proxyRes.headers).forEach(([key, val]) => {
      if (!['access-control-allow-origin','access-control-allow-credentials'].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });
    proxyRes.on('data', (chunk) => chunks.push(chunk));
    proxyRes.on('end', () => {
      const body = Buffer.concat(chunks);
      res.end(body);
    });
  });

  proxyReq.on('error', (err) => {
    logger.error(`Auth forward error: ${err.message}`);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gateway Error', message: 'User service unavailable' });
    }
  });

  // Pipe body langsung
  req.pipe(proxyReq);
}

app.use('/api/auth', authRateLimiter, forwardToUserService);

// ============================================================
// JWT Middleware — semua endpoint di bawah ini wajib auth
// ============================================================
app.use('/api', createRateLimiter(), verifyToken);

// ============================================================
// Manual HTTP Forwarding (mengganti express-http-proxy yang bermasalah)
// ============================================================
function createForwarder(targetUrl, pathPrefix, serviceReplacement) {
  const parsed = new URL(targetUrl);
  return function(req, res) {
    const targetPath = serviceReplacement + req.url;
    const bodyData = req.body ? JSON.stringify(req.body) : null;

    const headers = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'X-User-Id': req.user?.sub || '',
      'X-User-Email': req.user?.email || '',
      'X-User-Role': req.user?.role || '',
      'X-Request-Id': req.id || ''
    };
    if (bodyData) headers['Content-Length'] = Buffer.byteLength(bodyData);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 80,
      path: targetPath,
      method: req.method,
      headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      if (!res.headersSent) {
        res.status(proxyRes.statusCode);
        Object.entries(proxyRes.headers).forEach(([key, val]) => {
          const lower = key.toLowerCase();
          if (!['access-control-allow-origin','access-control-allow-credentials',
                'access-control-allow-methods','access-control-allow-headers'].includes(lower)) {
            res.setHeader(key, val);
          }
        });
      }
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      logger.error(`Forward error to ${targetUrl}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Gateway Error', message: 'Service temporarily unavailable' });
      }
    });

    if (bodyData) {
      proxyReq.write(bodyData);
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  };
}

// Route mapping
app.use('/api/users',      createForwarder(process.env.USER_SERVICE_URL,       '/api/users',      '/users'));
app.use('/api/stations',   createForwarder(process.env.STATION_SERVICE_URL,    '/api/stations',   '/stations'));
app.use('/api/bookings',   createForwarder(process.env.BOOKING_SERVICE_URL,    '/api/bookings',   '/bookings'));
app.use('/api/sessions',   createForwarder(process.env.SESSION_SERVICE_URL,    '/api/sessions',   '/sessions'));
app.use('/api/queue',      createForwarder(process.env.QUEUE_SERVICE_URL,      '/api/queue',      '/queue'));
app.use('/api/payments',   createForwarder(process.env.PAYMENT_SERVICE_URL,    '/api/payments',   '/payments'));
app.use('/api/monitoring', createForwarder(process.env.MONITORING_SERVICE_URL, '/api/monitoring', '/monitoring'));

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
