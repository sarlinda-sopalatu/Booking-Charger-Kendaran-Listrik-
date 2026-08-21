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
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174', 'http://frontend:5173'];

// ============================================================
// Middleware global
// ============================================================
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS blocked for this origin'));
  },
  credentials: true
}));
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
app.use('/api/auth', authRateLimiter, async (req, res, next) => {
  const targetUrl = `${USER_SERVICE_URL}/auth${req.url}`;

  try {
    const headers = {
      'x-request-id': req.id
    };

    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const requestInit = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      requestInit.body = JSON.stringify(req.body || {});
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
      }
    }

    const upstreamResponse = await fetch(targetUrl, requestInit);
    const responseText = await upstreamResponse.text();

    const setCookie = upstreamResponse.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('set-cookie', setCookie);
    }

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    res.status(upstreamResponse.status).send(responseText);
  } catch (err) {
    logger.error(`Auth proxy error: ${err.message}`);
    if (res.headersSent || res.writableEnded) {
      return;
    }

    res.status(502).json({ error: 'Gateway Error', message: 'User service unavailable' });
    return;
  }
});

// ============================================================
// JWT Middleware — semua endpoint di bawah ini wajib auth
// ============================================================
app.use('/api', createRateLimiter(), verifyToken);

// ============================================================
// Proxy Routes (setelah auth berhasil)
// ============================================================
const createProxy = (targetUrl, pathPrefix, serviceReplacement) =>
  proxy(targetUrl, {
    proxyReqPathResolver: (req) => {
      const suffix = req.url === '/' ? '' : req.url;
      return `${serviceReplacement}${suffix}`;
    },

    // Forward info user dari JWT ke service downstream
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers['X-User-Id'] = srcReq.user?.sub || '';
      proxyReqOpts.headers['X-User-Email'] = srcReq.user?.email || '';
      proxyReqOpts.headers['X-User-Role'] = srcReq.user?.role || '';
      proxyReqOpts.headers['X-Request-Id'] = srcReq.id;
      return proxyReqOpts;
    },

    proxyErrorHandler: (err, res, next) => {
      logger.error(`Proxy error to ${targetUrl}: ${err.message}`);
      try {
        if (res.headersSent || res.writableEnded) {
          return;
        }

        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Gateway Error', message: 'Service temporarily unavailable' }));
      } catch (writeErr) {
        logger.error(`Proxy error response write failed: ${writeErr.message}`);
        if (!res.writableEnded) {
          return next(writeErr);
        }
      }
    }
  });

app.use('/api/bookings', async (req, res) => {
  const targetUrl = `${process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003'}/bookings${req.url === '/' ? '' : req.url}`;

  try {
    const headers = {
      'x-request-id': req.id,
      'x-user-id': req.user?.sub || '',
      'x-user-email': req.user?.email || '',
      'x-user-role': req.user?.role || ''
    };

    if (req.headers.cookie) {
      headers.cookie = req.headers.cookie;
    }

    if (req.headers['content-type']) {
      headers['content-type'] = req.headers['content-type'];
    }

    const requestInit = {
      method: req.method,
      headers,
      redirect: 'manual'
    };

    if (!['GET', 'HEAD'].includes(req.method)) {
      requestInit.body = JSON.stringify(req.body || {});
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
      }
    }

    const upstreamResponse = await fetch(targetUrl, requestInit);
    const responseText = await upstreamResponse.text();

    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    res.status(upstreamResponse.status).send(responseText);
  } catch (err) {
    logger.error(`Proxy error to booking service: ${err.message}`);
    if (!res.headersSent && !res.writableEnded) {
      res.status(502).json({ error: 'Gateway Error', message: 'Booking service temporarily unavailable' });
    }
  }
});

// Route mapping
app.use('/api/users',      createProxy(process.env.USER_SERVICE_URL,       '/api/users',      '/users'));
app.use('/api/stations',   createProxy(process.env.STATION_SERVICE_URL,    '/api/stations',   '/stations'));
app.use('/api/queue',      createProxy(process.env.QUEUE_SERVICE_URL,      '/api/queue',      '/queue'));
app.use('/api/payments',   createProxy(process.env.PAYMENT_SERVICE_URL,    '/api/payments',   '/payments'));
app.use('/api/sessions',   createProxy(process.env.SESSION_SERVICE_URL,    '/api/sessions',   '/sessions'));
app.use('/api/billing',    createProxy(process.env.BILLING_SERVICE_URL,    '/api/billing',    '/billing'));
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

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Bad Request', message: 'Format JSON tidak valid' });
  }

  res.status(500).json({ error: 'Internal Server Error', message: 'Terjadi kesalahan internal' });
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
