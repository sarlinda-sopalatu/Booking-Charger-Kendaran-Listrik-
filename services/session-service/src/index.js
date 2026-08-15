'use strict';

require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const logger    = require('./utils/logger');
const { sequelize } = require('./db');
const sessionRoutes  = require('./routes/sessions');
const readingRoutes  = require('./routes/readings');
const internalRoutes = require('./routes/internal');
const { connectRabbitMQ } = require('./messaging/publisher');
const { startConsumer }   = require('./messaging/consumer');
const { setupSocketIO }   = require('./websocket/socketHub');

const app        = express();
const httpServer = http.createServer(app);
const PORT       = process.env.PORT || 3005;

// Socket.io untuk broadcast pembacaan daya real-time
const io = setupSocketIO(httpServer);
app.set('io', io);

const redis = new (require('ioredis'))(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', err => logger.error(`Redis: ${err.message}`));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.http(m.trim()) } }));

app.use((req, _res, next) => {
  req.redis    = redis;
  req.io       = io;
  req.userId   = req.headers['x-user-id']   || null;
  req.userRole = req.headers['x-user-role'] || null;
  next();
});

// ── Routes ──────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'session-service', timestamp: new Date().toISOString() })
);

app.use('/sessions',  sessionRoutes);   // Sesi pengisian
app.use('/readings',  readingRoutes);   // Pembacaan daya berkala
app.use('/internal',  internalRoutes);  // Dipanggil service lain

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// ── Start ────────────────────────────────────────────────
async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('Session Service DB synced');
  await connectRabbitMQ();
  await startConsumer(io, redis);
  httpServer.listen(PORT, () => logger.info(`Session Service running on port ${PORT}`));
}

start().catch(err => { logger.error(err.message); process.exit(1); });
module.exports = { app, httpServer };
