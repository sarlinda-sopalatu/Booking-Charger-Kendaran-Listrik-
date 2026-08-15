'use strict';

const express = require('express');
const Joi = require('joi');
const { Payment, Invoice } = require('../models/Payment');
const { initiatePayment } = require('../controllers/paymentController');
const logger = require('../utils/logger');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// POST /payments/initiate — Mulai proses pembayaran
const initiateSchema = Joi.object({
  booking_id: Joi.string().uuid().required(),
  method:     Joi.string().valid('QRIS', 'BANK_TRANSFER', 'E_WALLET').required()
});

router.post('/initiate', requireAuth, async (req, res) => {
  const { error, value } = initiateSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const result = await initiatePayment(req.redis, {
      userId:    req.userId,
      userEmail: req.userEmail,
      bookingId: value.booking_id,
      method:    value.method
    });
    return res.json(result);
  } catch (err) {
    logger.error(`Initiate payment error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /payments/:id — Status pembayaran
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id, user_id: req.userId },
      include: [{ model: Invoice, as: 'invoice' }]
    });
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    return res.json(payment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /payments/booking/:bookingId — Pembayaran berdasarkan booking
router.get('/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { booking_id: req.params.bookingId, user_id: req.userId },
      include: [{ model: Invoice, as: 'invoice' }]
    });
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    return res.json(payment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /payments — Riwayat pembayaran saya
router.get('/', requireAuth, async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const { count, rows } = await Payment.findAndCountAll({
      where:   { user_id: req.userId },
      limit:   parseInt(limit),
      offset:  (parseInt(page) - 1) * parseInt(limit),
      order:   [['created_at', 'DESC']],
      include: [{ model: Invoice, as: 'invoice' }]
    });
    return res.json({ payments: rows, total: count, page: parseInt(page) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
