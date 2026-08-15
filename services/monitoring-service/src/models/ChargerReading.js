'use strict';

const mongoose = require('mongoose');

// ---- Charger Reading (time-series data) ----
const ChargerReadingSchema = new mongoose.Schema({
  charger_id:           { type: String, required: true, index: true },
  session_id:           { type: String, index: true },
  booking_id:           { type: String, index: true },
  timestamp:            { type: Date, default: Date.now, index: true },
  power_kw:             { type: Number, default: 0 },
  energy_kwh:           { type: Number, default: 0 },  // Total energi dalam sesi ini
  voltage_v:            { type: Number, default: 0 },
  current_a:            { type: Number, default: 0 },
  state_of_charge:      { type: Number, default: 0 },  // % baterai EV
  temperature_c:        { type: Number, default: 0 },
  connector_temp_c:     { type: Number, default: 0 }
}, {
  timeseries: {
    timeField:   'timestamp',
    metaField:   'charger_id',
    granularity: 'seconds'
  }
});

// TTL: hapus data lebih dari 1 tahun
ChargerReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 3600 });

// ---- Charging Session ----
const ChargingSessionSchema = new mongoose.Schema({
  session_id:    { type: String, required: true, unique: true },
  charger_id:    { type: String, required: true },
  booking_id:    { type: String, required: true },
  user_id:       { type: String, required: true },
  status:        { type: String, enum: ['ACTIVE', 'COMPLETED', 'ERROR'], default: 'ACTIVE' },
  start_time:    { type: Date, default: Date.now },
  end_time:      { type: Date },
  energy_total_kwh: { type: Number, default: 0 },
  peak_power_kw:    { type: Number, default: 0 },
  duration_minutes: { type: Number, default: 0 },
  stop_reason:      { type: String }
}, { timestamps: true });

ChargingSessionSchema.index({ charger_id: 1, status: 1 });
ChargingSessionSchema.index({ booking_id: 1 }, { unique: true });

const ChargerReading  = mongoose.model('ChargerReading',  ChargerReadingSchema);
const ChargingSession = mongoose.model('ChargingSession', ChargingSessionSchema);

module.exports = { ChargerReading, ChargingSession };
