'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const Redis = require('ioredis');
const monitoringRoutes = require('./routes/monitoring');
const { setupSocketIO } = require('./websocket/socketHub');
const { startOCPPServer } = require('./websocket/ocppHandler');
const { connectRabbitMQ } = require('./messaging/publisher');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3006;

// Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// Inject redis ke req
app.use((req, _res, next) => {
  req.redis  = redis;
  req.userId = req.headers['x-user-id'] || null;
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'monitoring-service', timestamp: new Date().toISOString() })
);

app.use('/monitoring', monitoringRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

// Socket.io setup
const io = setupSocketIO(httpServer, redis);
app.set('io', io);

async function start() {
  // MongoDB
  await mongoose.connect(process.env.MONGODB_URL || 'mongodb://ev_user:ev_password@localhost:27017/ev_monitoring?authSource=admin');
  logger.info('MongoDB connected');

  // RabbitMQ
  await connectRabbitMQ(io);

  // OCPP WebSocket Server (charger hardware)
  startOCPPServer(io, redis);

  httpServer.listen(PORT, () => logger.info(`Monitoring Service running on port ${PORT}`));
}

start().catch((err) => { logger.error(err.message); process.exit(1); });
module.exports = { app, httpServer };
