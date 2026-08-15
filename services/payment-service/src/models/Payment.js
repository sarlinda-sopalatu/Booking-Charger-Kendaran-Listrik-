'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Payment = sequelize.define('Payment', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id:   { type: DataTypes.UUID, allowNull: false, unique: true },
  user_id:      { type: DataTypes.UUID, allowNull: false },
  amount_idr:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  method:       {
    type: DataTypes.ENUM('QRIS', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'EXPIRED'),
    defaultValue: 'PENDING'
  },
  external_ref:  { type: DataTypes.STRING(255), allowNull: true },
  payment_url:   { type: DataTypes.TEXT, allowNull: true },
  qr_string:     { type: DataTypes.TEXT, allowNull: true },
  expires_at:    { type: DataTypes.DATE, allowNull: true },
  completed_at:  { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['booking_id'] },
    { fields: ['user_id'] },
    { fields: ['external_ref'] }
  ]
});

const Invoice = sequelize.define('Invoice', {
  id:             { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  payment_id:     { type: DataTypes.UUID, allowNull: false, unique: true },
  invoice_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  items:          { type: DataTypes.JSONB, defaultValue: [] },
  subtotal_idr:   { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  tax_idr:        { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_idr:      { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  issued_at:      { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'invoices',
  timestamps: false
});

Payment.hasOne(Invoice, { foreignKey: 'payment_id', as: 'invoice' });
Invoice.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

module.exports = { Payment, Invoice };
