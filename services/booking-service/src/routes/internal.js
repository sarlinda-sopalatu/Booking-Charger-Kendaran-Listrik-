'use strict';

// Internal routes untuk booking service — dipanggil service lain
const express = require('express');
const { Booking, BookingEvent } = require('../models/Booking');
const logger = require('../utils/logger');

const router = express.Router();

// PUT /internal/bookings/:id/status — Update status booking
router.put('/bookings/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status wajib diisi' });

  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    const oldStatus = booking.status;
    await booking.update({ status });
    await BookingEvent.create({
      booking_id: booking.id,
      event_type: 'STATUS_CHANGED',
      data:       { from: oldStatus, to: status }
    });

    logger.info(`Booking ${req.params.id} status: ${oldStatus} → ${status}`);
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /internal/bookings/:id
router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
