'use strict';

const express = require('express');
const Joi = require('joi');
const { Payment, Invoice } = require('../models/Payment');
const { initiatePayment } = require('../controllers/paymentController');
const { publishEvent } = require('../messaging/publisher');
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

// POST /payments/:id/simulate-confirm — Simulasi konfirmasi pembayaran (development only)
router.post('/:id/simulate-confirm', requireAuth, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Tidak tersedia di production' });
  }
  try {
    const payment = await Payment.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' });
    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: `Status pembayaran sudah: ${payment.status}` });
    }

    // Generate invoice
    const invoiceNumber = `INV-${Date.now()}-${payment.id.slice(0, 8).toUpperCase()}`;
    await Invoice.create({
      payment_id:     payment.id,
      invoice_number: invoiceNumber,
      items: [{
        description: 'Layanan Pengisian Daya Kendaraan Listrik (Simulasi)',
        quantity: 1,
        unit_price: payment.amount_idr,
        total: payment.amount_idr
      }],
      subtotal_idr: payment.amount_idr,
      tax_idr:      Math.round(payment.amount_idr * 0.11),
      total_idr:    Math.round(payment.amount_idr * 1.11),
      issued_at:    new Date()
    });

    await payment.update({ status: 'COMPLETED', completed_at: new Date() });

    await publishEvent('payment', 'payment.completed', {
      paymentId:    payment.id,
      bookingId:    payment.booking_id,
      userId:       payment.user_id,
      amount:       payment.amount_idr,
      invoiceNumber
    });

    logger.info(`Payment ${payment.id} SIMULATED as COMPLETED`);
    return res.json({ message: 'Pembayaran berhasil disimulasikan', status: 'COMPLETED' });
  } catch (err) {
    logger.error(`Simulate confirm error: ${err.message}`);
    return res.status(500).json({ error: err.message });
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
