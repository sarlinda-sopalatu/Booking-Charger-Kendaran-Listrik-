'use strict';

const express = require('express');
const Joi = require('joi');
const axios = require('axios');
const { createBooking, cancelBooking } = require('../controllers/bookingController');
const { Booking, BookingEvent } = require('../models/Booking');
const logger = require('../utils/logger');

const STATION_SERVICE = process.env.STATION_SERVICE_URL || 'http://station-service:3002';
const USER_SERVICE    = process.env.USER_SERVICE_URL    || 'http://user-service:3001';

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
    return res.status(err.status || 500).json({
      error:             err.message,
      existingBookingId: err.existingBookingId || null,
      existingSlotDate:  err.existingSlotDate  || null,
    });
  }
});

// GET /bookings — Daftar booking (admin: semua user, user biasa: milik sendiri)
router.get('/', requireAuth, async (req, res) => {
  const { status, page = 1, limit = 10, all } = req.query;
  const isAdmin = req.userRole === 'ADMIN';

  const where = {};
  if (!isAdmin || all !== 'true') where.user_id = req.userId;
  if (status) where.status = status;

  try {
    const { count, rows } = await Booking.findAndCountAll({
      where,
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
      order:   [['created_at', 'DESC']]
    });

    // Enrich station name & charger_id untuk semua booking
    let bookings = rows.map(r => r.toJSON());
    const slotIds = [...new Set(bookings.map(b => b.slot_id).filter(Boolean))];
    const slotMap = {};
    await Promise.all(slotIds.map(async (sid) => {
      try {
        const { data: slot } = await axios.get(`${STATION_SERVICE}/internal/slots/${sid}`);
        const station = slot?.charger?.station;
        slotMap[sid] = {
          station_name: station?.name || null,
          charger_id:   slot?.charger_id || null,
        };
      } catch (_) {}
    }));
    bookings = bookings.map(b => ({
      ...b,
      station_name: slotMap[b.slot_id]?.station_name || null,
      charger_id:   b.charger_id || slotMap[b.slot_id]?.charger_id || null,
    }));

    // Enrich user name jika admin
    if (isAdmin && all === 'true') {
      const userIds = [...new Set(bookings.map(b => b.user_id))];
      const userMap = {};
      await Promise.all(userIds.map(async (uid) => {
        try {
          const { data } = await axios.get(`${USER_SERVICE}/internal/users/${uid}`);
          userMap[uid] = { name: data.name, email: data.email, phone: data.phone };
        } catch (_) {}
      }));
      bookings = bookings.map(b => ({ ...b, user: userMap[b.user_id] || null }));
    }

    return res.json({ bookings, total: count, page: parseInt(page) });
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

    // Enrich dengan data slot dari station-service
    const result = booking.toJSON();
    try {
      const { data: slot } = await axios.get(`${STATION_SERVICE}/internal/slots/${booking.slot_id}`);
      const charger  = slot.charger || {};
      const station  = charger.station || {};

      // Hitung estimasi biaya
      let totalAmount = 0;
      if (slot.start_time && slot.end_time) {
        const [sh, sm] = slot.start_time.split(':').map(Number);
        const [eh, em] = slot.end_time.split(':').map(Number);
        const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        const powerKw  = charger.max_power_kw || 22;
        const energyKwh = powerKw * durationHours;
        totalAmount = Math.round(energyKwh * parseFloat(slot.price_per_kwh || 2500));
      }

      result.station_name  = station.name || charger.station_name || '—';

      // Jika station masih kosong, fetch langsung dari station_id
      if (result.station_name === '—' && charger.station_id) {
        try {
          const { data: st } = await axios.get(`${STATION_SERVICE}/internal/stations/${charger.station_id}`);
          result.station_name = st.name || '—';
        } catch (_) {}
      }
      result.charger_id    = slot.charger_id || charger.id || null;
      result.slot_label    = slot.start_time && slot.end_time
        ? `${slot.start_time.slice(0,5)} – ${slot.end_time.slice(0,5)} (${slot.slot_date || ''})`
        : '—';
      result.total_amount  = totalAmount;
      result.charger_type  = charger.connector_type || '—';
      result.slot_date     = slot.slot_date || null;
    } catch (err) {
      logger.warn(`Could not enrich booking ${booking.id}: ${err.message}`);
    }

    return res.json(result);
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
