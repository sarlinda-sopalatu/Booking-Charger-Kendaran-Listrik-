'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { sequelize } = require('./db');
const bookingRoutes = require('./routes/bookings');
const internalRoutes = require('./routes/internal');
const { connectRabbitMQ } = require('./messaging/publisher');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet()); app.use(cors()); app.use(express.json());
app.use(morgan('combined', { stream: { write: (m) => logger.http(m.trim()) } }));

app.use((req, _res, next) => {
  req.userId    = req.headers['x-user-id']    || null;
  req.userEmail = req.headers['x-user-email'] || null;
  req.userRole  = req.headers['x-user-role']  || null;
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'booking-service', timestamp: new Date().toISOString() })
);

app.use('/bookings',  bookingRoutes);
app.use('/internal',  internalRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));
app.use((err, _req, res, _next) => {
  logger.error(err.message);
  res.status(err.status || 500).json({ error: err.message });
});

async function start() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  logger.info('Booking Service DB synced');
  await connectRabbitMQ();
  app.listen(PORT, () => logger.info(`Booking Service running on port ${PORT}`));
}

start().catch((err) => { logger.error(err.message); process.exit(1); });
module.exports = app;
