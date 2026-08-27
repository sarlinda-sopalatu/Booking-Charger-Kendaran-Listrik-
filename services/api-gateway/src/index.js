'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');

const logger = require('./middleware/logger');
const { verifyToken } = require('./middleware/auth');
const { createRateLimiter, authRateLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: (origin, cb) => cb(null, origin || '*'),
  credentials: true
}));

app.use((req, _res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  next();
});

app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) }
}));

// ============================================================
// Health check
// ============================================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ============================================================
// Forward helper — stream request/response tanpa buffer body
// ============================================================
function forward(targetBase, pathPrefix, pathReplacement, extraHeaders) {
  return (req, res) => {
    const base = new URL(targetBase);
    const upstreamPath = req.url.replace(pathPrefix, pathReplacement);
    const options = {
      hostname: base.hostname,
      port:     base.port || (base.protocol === 'https:' ? 443 : 80),
      path:     upstreamPath,
      method:   req.method,
      headers:  { ...req.headers, host: base.host, ...(extraHeaders || {}) }
    };

    const transport = base.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(options, (proxyRes) => {
      if (res.headersSent) return;
      const responseHeaders = {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin':      req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods':     'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type,Authorization,X-Request-Id'
      };
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      logger.error(`Forward error to ${targetBase}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Gateway Error', message: 'Service temporarily unavailable' });
      }
    });

    req.pipe(proxyReq, { end: true });
  };
}

// ============================================================
// Auth endpoints — no JWT required
// ============================================================
app.use('/api/auth', authRateLimiter, forward(
  process.env.USER_SERVICE_URL,
  /^/,
  '/auth'
));

// ============================================================
// JWT + rate limit untuk semua endpoint selanjutnya
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', createRateLimiter(), verifyToken);

// ============================================================
// Protected routes — body sudah di-parse oleh express.json(),
// jadi tulis req.body langsung ke proxyReq, jangan pipe req
// ============================================================
function protectedForward(targetBase, pathPrefix, pathReplacement) {
  return (req, res) => {
    const base = new URL(targetBase);
    const upstreamPath = req.url.replace(pathPrefix, pathReplacement);
    const bodyStr = (req.body && Object.keys(req.body).length > 0)
      ? JSON.stringify(req.body)
      : null;

    const headers = {
      ...req.headers,
      host:             base.host,
      'X-User-Id':      req.user?.sub   || '',
      'X-User-Email':   req.user?.email || '',
      'X-User-Role':    req.user?.role  || '',
      'X-Request-Id':   req.id          || ''
    };
    if (bodyStr) {
      headers['content-type']   = 'application/json';
      headers['content-length'] = Buffer.byteLength(bodyStr).toString();
    } else {
      delete headers['content-length'];
    }

    const options = {
      hostname: base.hostname,
      port:     base.port || (base.protocol === 'https:' ? 443 : 80),
      path:     upstreamPath,
      method:   req.method,
      headers
    };

    const transport = base.protocol === 'https:' ? https : http;
    const proxyReq = transport.request(options, (proxyRes) => {
      if (res.headersSent) return;
      const responseHeaders = {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin':      req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods':     'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':     'Content-Type,Authorization,X-Request-Id'
      };
      res.writeHead(proxyRes.statusCode, responseHeaders);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      logger.error(`Forward error to ${targetBase}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Gateway Error', message: 'Service temporarily unavailable' });
      }
    });

    if (bodyStr) {
      proxyReq.write(bodyStr);
    }
    proxyReq.end();
  };
}

app.use('/api/users',      protectedForward(process.env.USER_SERVICE_URL,       /^/, '/users'));
app.use('/api/stations',   protectedForward(process.env.STATION_SERVICE_URL,    /^/, '/stations'));
app.use('/api/bookings',   protectedForward(process.env.BOOKING_SERVICE_URL,    /^/, '/bookings'));
app.use('/api/queue',      protectedForward(process.env.QUEUE_SERVICE_URL,      /^/, '/queue'));
app.use('/api/payments',   protectedForward(process.env.PAYMENT_SERVICE_URL,    /^/, '/payments'));
app.use('/api/monitoring', protectedForward(process.env.MONITORING_SERVICE_URL, /^/, '/monitoring'));

// ============================================================
// 404 & error handlers
// ============================================================
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route tidak ditemukan' });
});

app.use((err, _req, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Terjadi kesalahan internal' });
  }
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
