'use strict';

const express = require('express');
const Joi     = require('joi');
const { startSession, recordReading, stopSession, getSessionSummary } = require('../controllers/sessionController');
const { ChargingSession, PowerReading } = require('../models/Session');
const logger  = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Schemas ──────────────────────────────────────────────
const startSchema = Joi.object({
  booking_id:      Joi.string().uuid().required(),
  charger_id:      Joi.string().uuid().required(),
  energy_kwh_start: Joi.number().min(0).default(0),
  tariff_per_kwh:  Joi.number().min(0).default(2500)
});

const stopSchema = Joi.object({
  energy_kwh_end: Joi.number().min(0).required(),
  stop_reason:    Joi.string().valid('FULL', 'MANUAL', 'TIMEOUT', 'ERROR').default('MANUAL')
});

// ── POST /sessions/start — Mulai sesi pengisian ──────────
router.post('/start', requireAuth, async (req, res) => {
  const { error, value } = startSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const session = await startSession({
      bookingId:     value.booking_id,
      chargerId:     value.charger_id,
      userId:        req.userId,
      energyKwhStart: value.energy_kwh_start,
      tariffPerKwh:  value.tariff_per_kwh
    });
    return res.status(201).json(session);
  } catch (err) {
    logger.error(`Start session error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ── PUT /sessions/:id/stop — Selesaikan sesi pengisian ───
router.put('/:id/stop', requireAuth, async (req, res) => {
  const { error, value } = stopSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const session = await stopSession({
      sessionId:     req.params.id,
      energyKwhEnd:  value.energy_kwh_end,
      stopReason:    value.stop_reason
    });
    return res.json(session);
  } catch (err) {
    logger.error(`Stop session error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /sessions/:id — Detail sesi + ringkasan + grafik ─
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await getSessionSummary(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// ── GET /sessions — Riwayat sesi saya ──────────────────
router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const where = { user_id: req.userId };
  if (status) where.status = status;

  try {
    const { count, rows } = await ChargingSession.findAndCountAll({
      where,
      limit:  parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order:  [['created_at', 'DESC']]
    });
    return res.json({ sessions: rows, total: count, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /sessions/booking/:bookingId — Sesi berdasarkan booking ──
router.get('/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const session = await ChargingSession.findOne({
      where: { booking_id: req.params.bookingId },
      include: [{ model: PowerReading, as: 'readings', order: [['recorded_at', 'ASC']] }]
    });
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
