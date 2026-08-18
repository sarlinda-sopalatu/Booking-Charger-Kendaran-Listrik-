'use strict';

require('dotenv').config();
const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const logger   = require('./utils/logger');
const { sequelize } = require('./db');
const billingRoutes = require('./routes/billing');

const app  = express();
const PORT = process.env.PORT || 3008;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: m => logger.http(m.trim()) } }));

// Header dari API Gateway
app.use((req, _res, next) => {
  req.userId   = req.headers['x-user-id']   || null;
  req.userRole = req.headers['x-user-role'] || null;
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'billing-service', timestamp: new Date().toISOString() })
);

app.use('/billing', billingRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('Billing Service DB synced');
  app.listen(PORT, () => logger.info(`Billing Service running on port ${PORT}`));
}

start().catch(err => { logger.error(err.message); process.exit(1); });
module.exports = app;
