'use strict';

const express = require('express');
const { ChargerReading, ChargingSession } = require('../models/ChargerReading');
const logger = require('../utils/logger');

const router = express.Router();

// GET /monitoring/chargers/:chargerId/readings
// Ambil riwayat pembacaan charger (max 500 titik untuk chart)
router.get('/chargers/:chargerId/readings', async (req, res) => {
  try {
    const { chargerId } = req.params;
    const { from, to, limit = 200 } = req.query;

    const match = { charger_id: chargerId };
    if (from || to) {
      match.timestamp = {};
      if (from) match.timestamp.$gte = new Date(from);
      if (to)   match.timestamp.$lte = new Date(to);
    }

    const safeLimit = Math.min(parseInt(limit) || 200, 500);

    const readings = await ChargerReading.find(match)
      .sort({ timestamp: -1 })
      .limit(safeLimit)
      .lean();

    return res.json({ charger_id: chargerId, count: readings.length, readings: readings.reverse() });
  } catch (err) {
    logger.error(`GET readings error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /monitoring/chargers/:chargerId/latest
// Ambil pembacaan terakhir dari Redis atau MongoDB
router.get('/chargers/:chargerId/latest', async (req, res) => {
  try {
    const { chargerId } = req.params;

    // Coba Redis cache dulu
    const cached = await req.redis.get(`charger:latest:${chargerId}`);
    if (cached) return res.json(JSON.parse(cached));

    // Fallback ke MongoDB
    const reading = await ChargerReading.findOne({ charger_id: chargerId })
      .sort({ timestamp: -1 })
      .lean();

    if (!reading) return res.status(404).json({ error: 'Data tidak ditemukan' });
    return res.json(reading);
  } catch (err) {
    logger.error(`GET latest reading error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /monitoring/sessions
// Daftar sesi pengisian aktif
router.get('/sessions', async (req, res) => {
  try {
    const { status = 'ACTIVE', charger_id, limit = 20 } = req.query;
    const filter = { status };
    if (charger_id) filter.charger_id = charger_id;

    const sessions = await ChargingSession.find(filter)
      .sort({ start_time: -1 })
      .limit(Math.min(parseInt(limit) || 20, 100))
      .lean();

    return res.json({ sessions, count: sessions.length });
  } catch (err) {
    logger.error(`GET sessions error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /monitoring/sessions/:sessionId
// Detail sesi tertentu
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await ChargingSession.findOne({ session_id: req.params.sessionId }).lean();
    if (!session) return res.status(404).json({ error: 'Sesi tidak ditemukan' });

    // Ambil readings untuk sesi ini
    const readings = await ChargerReading.find({ session_id: req.params.sessionId })
      .sort({ timestamp: 1 })
      .limit(500)
      .lean();

    return res.json({ ...session, readings });
  } catch (err) {
    logger.error(`GET session detail error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /monitoring/stats
// Statistik umum untuk dashboard admin
router.get('/stats', async (req, res) => {
  try {
    const [activeSessions, completedToday] = await Promise.all([
      ChargingSession.countDocuments({ status: 'ACTIVE' }),
      ChargingSession.countDocuments({
        status:   'COMPLETED',
        end_time: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      })
    ]);

    const energyToday = await ChargingSession.aggregate([
      { $match: { status: 'COMPLETED', end_time: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } } },
      { $group: { _id: null, total: { $sum: '$energy_total_kwh' } } }
    ]);

    return res.json({
      active_sessions:    activeSessions,
      completed_today:    completedToday,
      energy_kwh_today:   energyToday[0]?.total || 0,
      timestamp:          new Date().toISOString()
    });
  } catch (err) {
    logger.error(`GET stats error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
