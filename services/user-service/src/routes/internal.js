'use strict';

// Internal routes — dipanggil oleh service lain (Booking, Payment, dsb.)
// Tidak perlu JWT — hanya accessible dari internal network (Docker)
const express = require('express');
const { User } = require('../models/User');
const { sanitizeUser } = require('../controllers/authController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /internal/users/:id — Dapatkan data user (untuk service lain)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user || !user.is_active) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    return res.json(sanitizeUser(user));
  } catch (err) {
    logger.error(`Internal get user error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// GET /internal/users/email/:email
router.get('/users/email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.params.email, is_active: true } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    return res.json(sanitizeUser(user));
  } catch (err) {
    logger.error(`Internal get user by email error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
