'use strict';

const express = require('express');
const { joinQueue, leaveQueue, getPosition, getStationQueue } = require('../controllers/queueController');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /queue/join
router.post('/join', requireAuth, async (req, res) => {
  const { station_id, slot_date, connector_type } = req.body;
  if (!station_id || !slot_date) {
    return res.status(400).json({ error: 'station_id dan slot_date wajib diisi' });
  }
  try {
    const result = await joinQueue(req.redis, {
      userId: req.userId,
      stationId: station_id,
      slotDate: slot_date,
      connectorType: connector_type
    });
    return res.json(result);
  } catch (err) {
    logger.error(`Join queue error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /queue/station/:stationId
router.get('/station/:stationId', async (req, res) => {
  try {
    const { date } = req.query;
    const result = await getStationQueue(req.redis, req.params.stationId, date);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /queue/position/me
router.get('/position/me', requireAuth, async (req, res) => {
  try {
    const result = await getPosition(req.redis, req.userId);
    if (!result) return res.status(404).json({ error: 'Anda tidak ada di antrian manapun' });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /queue/leave
router.delete('/leave', requireAuth, async (req, res) => {
  try {
    await leaveQueue(req.redis, { userId: req.userId });
    return res.json({ message: 'Berhasil keluar dari antrian' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
