'use strict';

const express = require('express');
const { createBilling, getBillingByBooking, getBillingHistory } = require('../controllers/billingController');
const router = express.Router();

// GET /billing/history — riwayat tagihan user (paginasi keyset)
router.get('/history', async (req, res) => {
  try {
    const result = await getBillingHistory({
      userId: req.userId,
      cursor: req.query.cursor,
      limit:  req.query.limit
    });
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /billing/booking/:bookingId — tagihan berdasarkan booking
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const billing = await getBillingByBooking(req.params.bookingId);
    return res.json(billing);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
