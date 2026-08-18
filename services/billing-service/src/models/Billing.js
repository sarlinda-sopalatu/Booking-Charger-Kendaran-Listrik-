'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

// -------------------------------------------------------------------------
// Billing — tagihan dari kWh terpakai
// -------------------------------------------------------------------------
const Billing = sequelize.define('Billing', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id:     { type: DataTypes.UUID, allowNull: false, unique: true },
  session_id:     { type: DataTypes.UUID, allowNull: false, unique: true },
  user_id:        { type: DataTypes.UUID, allowNull: false },
  energy_kwh:     { type: DataTypes.DECIMAL(10, 4), allowNull: false, defaultValue: 0 },
  tariff_per_kwh: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 2500 },
  subtotal_idr:   { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  tax_idr:        { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_idr:      { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
  status:         {
    type: DataTypes.ENUM('DRAFT', 'ISSUED', 'PAID', 'CANCELLED'),
    defaultValue: 'DRAFT'
  },
  invoice_number: { type: DataTypes.STRING(50), unique: true, allowNull: true },
  issued_at:      { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'billings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['booking_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

module.exports = { Billing };
