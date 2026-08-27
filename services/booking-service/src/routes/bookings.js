'use strict';

const express = require('express');
const Joi = require('joi');
const { createBooking, cancelBooking } = require('../controllers/bookingController');
const { Booking, BookingEvent } = require('../models/Booking');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /bookings — Buat booking baru
const createSchema = Joi.object({
  slot_id: Joi.string().uuid().required(),
  notes:   Joi.string().max(500).allow('').optional()
});

router.post('/', requireAuth, async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const booking = await createBooking({
      userId:    req.userId,
      userEmail: req.userEmail,
      slotId:    value.slot_id,
      notes:     value.notes
    });
    return res.status(201).json(booking);
  } catch (err) {
    logger.error(`Create booking error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /bookings — Daftar booking saya
router.get('/', requireAuth, async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const where = { user_id: req.userId };
  if (status) where.status = status;

  try {
    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
      order:   [['created_at', 'DESC']]
    });
    return res.json({ bookings: rows, total: count, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /bookings/:id — Detail booking
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: BookingEvent, as: 'events' }]
    });
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /bookings/:id/cancel — Batalkan booking
router.put('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await cancelBooking({
      bookingId: req.params.id,
      userId:    req.userId,
      reason:    req.body.reason
    });
    return res.json({ message: 'Booking berhasil dibatalkan', booking });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
