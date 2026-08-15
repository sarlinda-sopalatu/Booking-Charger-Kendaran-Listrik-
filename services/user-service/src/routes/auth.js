'use strict';

const express = require('express');
const Joi = require('joi');
const { register, login, refreshAccessToken, logout } = require('../controllers/authController');
const logger = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name:     Joi.string().min(2).max(100).required(),
  phone:    Joi.string().pattern(/^\+?[\d\s-]{8,20}$/).optional(),
  ev_plate: Joi.string().max(20).optional()
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required()
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'ValidationError', message: error.details[0].message });
  }

  try {
    const result = await register(value);

    // Set refresh token sebagai HttpOnly cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000 // 7 hari
    });

    return res.status(201).json({
      user:        result.user,
      access_token: result.access_token,
      expires_in:  result.expires_in
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: 'ValidationError', message: error.details[0].message });
  }

  try {
    const result = await login(value);

    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      user:        result.user,
      access_token: result.access_token,
      expires_in:  result.expires_in
    });
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token;
  try {
    const result = await refreshAccessToken(rawToken);
    return res.json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  const rawToken = req.cookies?.refresh_token;
  try {
    await logout(rawToken);
    res.clearCookie('refresh_token');
    return res.json({ message: 'Logout berhasil' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
