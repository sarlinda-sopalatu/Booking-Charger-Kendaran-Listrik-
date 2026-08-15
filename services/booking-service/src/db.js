'use strict';
const { Sequelize } = require('sequelize');
const logger = require('./utils/logger');
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://ev_user:ev_password@localhost:5432/ev_db', {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
});
module.exports = { sequelize };
