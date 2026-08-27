'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const logger = require('./utils/logger');
const { sequelize } = require('./db');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhook');
const { connectRabbitMQ, startConsumer } = require('./messaging/consumer');
const { connectRabbitMQ: connectPublisher } = require('./messaging/publisher');
const Redis = require('ioredis');

const app = express();
const PORT = process.env.PORT || 3005;

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

app.use(helmet()); app.use(cors());

// Webhook route butuh raw body untuk verifikasi signature
app.use('/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json());
app.use((req, _res, next) => {
  req.redis    = redis;
  req.userId   = req.headers['x-user-id']    || null;
  req.userEmail = req.headers['x-user-email'] || null;
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'payment-service', timestamp: new Date().toISOString() })
);

app.use('/payments', paymentRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('Payment Service DB synced');
  await connectRabbitMQ();
  await connectPublisher();
  await startConsumer();
  app.listen(PORT, () => logger.info(`Payment Service running on port ${PORT}`));
}

start().catch((err) => { logger.error(err.message); process.exit(1); });
module.exports = app;
