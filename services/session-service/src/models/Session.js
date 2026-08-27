'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

/**
 * ChargingSession — Sesi Pengisian Daya
 *
 * Tanggung jawab: Catat sesi pengisian mulai dari START hingga STOP,
 * termasuk total kWh yang terpakai dan riwayat pembacaan daya berkala.
 *
 * Data yang dimiliki (sesuai spesifikasi assignment):
 *   - Sesi pengisian (session_id, booking_id, charger_id, user_id)
 *   - Waktu mulai & selesai
 *   - kWh terpakai (energy_kwh_used)
 *   - Status sesi (WAITING → ACTIVE → COMPLETED / ERROR)
 */
const ChargingSession = sequelize.define('ChargingSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Referensi ke booking di booking-service'
  },
  charger_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Referensi ke charger di station-service'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'User pemilik sesi'
  },
  status: {
    type: DataTypes.ENUM('WAITING', 'ACTIVE', 'COMPLETED', 'ERROR'),
    defaultValue: 'WAITING',
    comment: 'WAITING=menunggu kendaraan, ACTIVE=sedang mengisi, COMPLETED=selesai, ERROR=gangguan'
  },
  // ── Waktu ──────────────────────────────────────────────
  started_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu pengisian mulai (kendaraan terdeteksi terhubung)'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Waktu pengisian selesai'
  },
  // ── Energi & Daya ──────────────────────────────────────
  energy_kwh_start: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
    comment: 'Meter kWh saat sesi dimulai (dari charger)'
  },
  energy_kwh_end: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
    comment: 'Meter kWh saat sesi selesai (dari charger)'
  },
  energy_kwh_used: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
    comment: 'Total kWh terpakai = energy_kwh_end - energy_kwh_start'
  },
  peak_power_kw: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Daya puncak selama sesi (kW)'
  },
  avg_power_kw: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0,
    comment: 'Daya rata-rata selama sesi (kW)'
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Durasi sesi dalam menit'
  },
  // ── Konteks ────────────────────────────────────────────
  stop_reason: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Alasan selesai: FULL, MANUAL, TIMEOUT, ERROR'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tariff_per_kwh: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 2500,
    comment: 'Tarif kWh saat sesi berlangsung (snapshot dari station-service)'
  },
  total_cost_idr: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    comment: 'Total biaya = energy_kwh_used × tariff_per_kwh (dikirim ke billing-service)'
  }
}, {
  tableName: 'charging_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['booking_id'] },
    { fields: ['charger_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['started_at'] }
  ]
});

/**
 * PowerReading — Pembacaan Daya Berkala
 *
 * Merekam pembacaan sensor charger setiap interval (default 10 detik).
 * Data ini dikirim dari hardware via OCPP atau simulator.
 */
const PowerReading = sequelize.define('PowerReading', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Referensi ke sesi aktif'
  },
  charger_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // ── Pembacaan Sensor ──────────────────────────────────
  power_kw: {
    type: DataTypes.DECIMAL(8, 3),
    defaultValue: 0,
    comment: 'Daya sesaat (kW)'
  },
  energy_kwh_cumulative: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0,
    comment: 'Total kWh kumulatif dari awal sesi'
  },
  voltage_v: {
    type: DataTypes.DECIMAL(7, 2),
    defaultValue: 0,
    comment: 'Tegangan (Volt)'
  },
  current_a: {
    type: DataTypes.DECIMAL(7, 2),
    defaultValue: 0,
    comment: 'Arus (Ampere)'
  },
  state_of_charge_pct: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Persentase baterai kendaraan (0–100%)'
  },
  temperature_c: {
    type: DataTypes.DECIMAL(6, 2),
    defaultValue: 0,
    comment: 'Suhu charger (°C)'
  },
  recorded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Waktu pembacaan'
  }
}, {
  tableName: 'power_readings',
  timestamps: false,
  indexes: [
    { fields: ['session_id', 'recorded_at'] },
    { fields: ['charger_id', 'recorded_at'] }
  ]
});

// Associations
ChargingSession.hasMany(PowerReading, { foreignKey: 'session_id', as: 'readings' });
PowerReading.belongsTo(ChargingSession, { foreignKey: 'session_id', as: 'session' });

module.exports = { ChargingSession, PowerReading };
