'use strict';

// Endpoint untuk catat pembacaan daya berkala dari hardware/simulator
const express = require('express');
const Joi     = require('joi');
const { recordReading } = require('../controllers/sessionController');
const { PowerReading, ChargingSession } = require('../models/Session');
const logger  = require('../utils/logger');

const router = express.Router();

const readingSchema = Joi.object({
  power_kw:       Joi.number().min(0).required(),
  energy_kwh:     Joi.number().min(0).required(),
  voltage_v:      Joi.number().min(0).default(0),
  current_a:      Joi.number().min(0).default(0),
  soc_pct:        Joi.number().min(0).max(100).default(0),
  temperature_c:  Joi.number().default(0),
  recorded_at:    Joi.string().isoDate().optional()
});

// ── POST /readings/:sessionId — Catat satu pembacaan ────
// Dipanggil oleh hardware charger atau OCPP adapter setiap ~10 detik
router.post('/:sessionId', async (req, res) => {
  const { error, value } = readingSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const reading = await recordReading(req.params.sessionId, value);

    // Broadcast real-time ke frontend via Socket.io
    const io = req.app.get('io');
    if (io) {
      const session = await ChargingSession.findByPk(req.params.sessionId);
      if (session) {
        io.to(`session:${req.params.sessionId}`).emit('reading', {
          sessionId:    req.params.sessionId,
          bookingId:    session.booking_id,
          chargerId:    session.charger_id,
          power_kw:     value.power_kw,
          energy_kwh:   value.energy_kwh,
          soc_pct:      value.soc_pct,
          voltage_v:    value.voltage_v,
          current_a:    value.current_a,
          temperature_c: value.temperature_c,
          timestamp:    new Date().toISOString(),
          // Estimasi waktu selesai
          eta_minutes:  estimateETA(value.soc_pct, value.power_kw)
        });
      }
    }

    // Update Redis cache untuk query cepat
    const redis = req.redis;
    if (redis) {
      await redis.setex(
        `session:live:${req.params.sessionId}`,
        30, // expire 30 detik
        JSON.stringify({ ...value, timestamp: new Date().toISOString() })
      );
    }

    return res.status(201).json({ recorded: true, reading_id: reading.id });
  } catch (err) {
    logger.error(`Record reading error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /readings/:sessionId — Semua pembacaan satu sesi ─
router.get('/:sessionId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { session_id: req.params.sessionId };
    if (from || to) {
      const { Op } = require('sequelize');
      where.recorded_at = {};
      if (from) where.recorded_at[Op.gte] = new Date(from);
      if (to)   where.recorded_at[Op.lte] = new Date(to);
    }

    const readings = await PowerReading.findAll({
      where,
      order: [['recorded_at', 'ASC']],
      limit: 1000 // max 1000 titik data untuk chart
    });
    return res.json({ session_id: req.params.sessionId, count: readings.length, readings });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /readings/:sessionId/latest — Pembacaan terbaru ─
router.get('/:sessionId/latest', async (req, res) => {
  try {
    // Coba Redis cache dulu
    const cached = await req.redis?.get(`session:live:${req.params.sessionId}`);
    if (cached) return res.json({ source: 'cache', data: JSON.parse(cached) });

    // Fallback ke database
    const reading = await PowerReading.findOne({
      where: { session_id: req.params.sessionId },
      order: [['recorded_at', 'DESC']]
    });
    if (!reading) return res.status(404).json({ error: 'Belum ada pembacaan' });
    return res.json({ source: 'db', data: reading });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper: estimasi waktu selesai
function estimateETA(socPct, powerKw) {
  if (!socPct || socPct >= 100 || !powerKw || powerKw <= 0) return null;
  const batteryCapacity = 60; // kWh (default, bisa dikonfigurasi per kendaraan)
  const remaining = batteryCapacity * (1 - socPct / 100);
  return Math.round((remaining / powerKw) * 60); // menit
}

module.exports = router;
