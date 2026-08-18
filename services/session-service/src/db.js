'use strict';

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://ev_user:ev_password@localhost:5434/ev_sessions',
  {
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
  }
);

module.exports = { sequelize };
