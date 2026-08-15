'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { sequelize } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const internalRoutes = require('./routes/internal');

const app = express();
const PORT = process.env.PORT || 3001;

// ============================================================
// Middleware
// ============================================================
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', { stream: { write: (m) => logger.http(m.trim()) } }));

// Ambil user info dari header yang di-inject API Gateway
app.use((req, _res, next) => {
  req.userId    = req.headers['x-user-id']    || null;
  req.userEmail = req.headers['x-user-email'] || null;
  req.userRole  = req.headers['x-user-role']  || null;
  next();
});

// ============================================================
// Routes
// ============================================================
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() })
);

app.use('/auth',      authRoutes);
app.use('/users',     userRoutes);
app.use('/internal',  internalRoutes); // Endpoint internal untuk service lain

// ============================================================
// 404 & Error Handler
// ============================================================
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

app.use((err, _req, res, _next) => {
  logger.error(err.message, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

// ============================================================
// Start
// ============================================================
async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('Database synced');

    app.listen(PORT, () => logger.info(`User Service running on port ${PORT}`));
  } catch (err) {
    logger.error(`Startup failed: ${err.message}`);
    process.exit(1);
  }
}

start();
module.exports = app;
