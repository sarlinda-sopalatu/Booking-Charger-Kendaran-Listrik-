'use strict';

// Internal routes — dipanggil billing-service dan booking-service
const express = require('express');
const { ChargingSession } = require('../models/Session');
const { startSession, stopSession } = require('../controllers/sessionController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /internal/sessions/booking/:bookingId — Cek sesi berdasarkan booking
router.get('/sessions/booking/:bookingId', async (req, res) => {
  try {
    const session = await ChargingSession.findOne({
      where: { booking_id: req.params.bookingId }
    });
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /internal/sessions/:id — Detail sesi untuk billing-service
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await ChargingSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /internal/sessions/start — Dipanggil oleh booking-service saat kendaraan terdeteksi
router.post('/sessions/start', async (req, res) => {
  try {
    const { booking_id, charger_id, user_id, energy_kwh_start, tariff_per_kwh,
            slot_date, slot_start_time } = req.body;

    // Validasi: pastikan waktu slot sudah tiba (WIB = UTC+7)
    if (slot_date && slot_start_time) {
      const slotStart = new Date(`${slot_date}T${slot_start_time}+07:00`);
      if (new Date() < slotStart) {
        return res.status(400).json({
          error: `Sesi belum bisa dimulai. Jadwal slot: ${slot_date} ${slot_start_time}`
        });
      }
    }

    const session = await startSession({
      bookingId:      booking_id,
      chargerId:      charger_id,
      userId:         user_id,
      energyKwhStart: energy_kwh_start,
      tariffPerKwh:   tariff_per_kwh
    });
    return res.status(201).json(session);
  } catch (err) {
    logger.error(`Internal start session: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// PUT /internal/sessions/:id/stop — Dipanggil saat pengisian selesai
router.put('/sessions/:id/stop', async (req, res) => {
  try {
    const session = await stopSession({
      sessionId:    req.params.id,
      energyKwhEnd: req.body.energy_kwh_end,
      stopReason:   req.body.stop_reason || 'MANUAL'
    });
    return res.json(session);
  } catch (err) {
    logger.error(`Internal stop session: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
