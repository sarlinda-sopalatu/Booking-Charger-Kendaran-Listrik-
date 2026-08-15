'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

// ---- Charging Station ----
const Station = sequelize.define('Station', {
  id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name:       { type: DataTypes.STRING(255), allowNull: false },
  address:    { type: DataTypes.TEXT, allowNull: false },
  latitude:   { type: DataTypes.DECIMAL(10, 8), allowNull: false },
  longitude:  { type: DataTypes.DECIMAL(11, 8), allowNull: false },
  status:     { type: DataTypes.ENUM('ACTIVE', 'MAINTENANCE', 'CLOSED'), defaultValue: 'ACTIVE' },
  operator_id: { type: DataTypes.UUID, allowNull: true },
  phone:      { type: DataTypes.STRING(20), allowNull: true },
  opening_hours: { type: DataTypes.STRING(100), defaultValue: '24/7' },
  facilities:  { type: DataTypes.JSONB, defaultValue: [] } // ['parking', 'toilet', 'cafe']
}, {
  tableName: 'stations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ---- EV Charger ----
const Charger = sequelize.define('Charger', {
  id:              { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  station_id:      { type: DataTypes.UUID, allowNull: false },
  connector_type:  {
    type: DataTypes.ENUM('AC_TYPE1', 'AC_TYPE2', 'DC_CCS2', 'DC_CHAdeMO', 'DC_GB_T'),
    allowNull: false
  },
  max_power_kw:    { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  status:          {
    type: DataTypes.ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'FAULTED', 'OFFLINE'),
    defaultValue: 'AVAILABLE'
  },
  serial_number:   { type: DataTypes.STRING(100), unique: true, allowNull: true },
  ocpp_charge_point_id: { type: DataTypes.STRING(100), unique: true, allowNull: true }
}, {
  tableName: 'chargers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// ---- Time Slot ----
const Slot = sequelize.define('Slot', {
  id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  charger_id:   { type: DataTypes.UUID, allowNull: false },
  slot_date:    { type: DataTypes.DATEONLY, allowNull: false },
  start_time:   { type: DataTypes.TIME, allowNull: false },
  end_time:     { type: DataTypes.TIME, allowNull: false },
  status:       {
    type: DataTypes.ENUM('AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE'),
    defaultValue: 'AVAILABLE'
  },
  price_per_kwh: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 2500 }
}, {
  tableName: 'slots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['charger_id', 'slot_date', 'start_time'] }
  ]
});

// Associations
Station.hasMany(Charger, { foreignKey: 'station_id', as: 'chargers' });
Charger.belongsTo(Station, { foreignKey: 'station_id', as: 'station' });
Charger.hasMany(Slot, { foreignKey: 'charger_id', as: 'slots' });
Slot.belongsTo(Charger, { foreignKey: 'charger_id', as: 'charger' });

module.exports = { Station, Charger, Slot };
