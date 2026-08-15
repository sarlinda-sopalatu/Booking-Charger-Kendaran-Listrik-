'use strict';

const express = require('express');
const Joi = require('joi');
const { User } = require('../models/User');
const { sanitizeUser } = require('../controllers/authController');
const logger = require('../utils/logger');

const router = express.Router();

// Helper: require authentication (user info dari API Gateway header)
function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /users/me — Profil saya
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    return res.json(sanitizeUser(user));
  } catch (err) {
    logger.error(`Get profile error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /users/me — Update profil
const updateSchema = Joi.object({
  name:     Joi.string().min(2).max(100).optional(),
  phone:    Joi.string().pattern(/^\+?[\d\s-]{8,20}$/).optional(),
  ev_plate: Joi.string().max(20).optional()
}).min(1);

router.put('/me', requireAuth, async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'ValidationError', message: error.details[0].message });
  }

  try {
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    await user.update(value);
    return res.json(sanitizeUser(user));
  } catch (err) {
    logger.error(`Update profile error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
