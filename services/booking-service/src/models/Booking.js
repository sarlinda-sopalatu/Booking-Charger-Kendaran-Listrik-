'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Booking = sequelize.define('Booking', {
  id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  user_id:  { type: DataTypes.UUID, allowNull: false },
  slot_id:  { type: DataTypes.UUID, allowNull: false },
  status:   {
    type: DataTypes.ENUM(
      'PENDING_PAYMENT', 'CONFIRMED', 'CHARGING', 'COMPLETED', 'CANCELLED', 'EXPIRED'
    ),
    defaultValue: 'PENDING_PAYMENT'
  },
  notes:         { type: DataTypes.TEXT, allowNull: true },
  expires_at:    { type: DataTypes.DATE, allowNull: true },
  cancelled_at:  { type: DataTypes.DATE, allowNull: true },
  cancel_reason: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'bookings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['user_id'] }, { fields: ['slot_id'] }, { fields: ['status'] }]
});

const BookingEvent = sequelize.define('BookingEvent', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id: { type: DataTypes.UUID, allowNull: false },
  event_type: { type: DataTypes.STRING(50), allowNull: false },
  data:       { type: DataTypes.JSONB, defaultValue: {} }
}, {
  tableName: 'booking_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

Booking.hasMany(BookingEvent, { foreignKey: 'booking_id', as: 'events' });
BookingEvent.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

module.exports = { Booking, BookingEvent };
