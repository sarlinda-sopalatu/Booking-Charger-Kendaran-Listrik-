'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { User, RefreshToken } = require('../models/User');
const logger = require('../utils/logger');

// ---- Load JWT keys ----
let privateKey, publicKey;
try {
  privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '../../../keys/private.pem'), 'utf8');
  publicKey  = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH  || path.join(__dirname, '../../../keys/public.pem'),  'utf8');
} catch {
  privateKey = process.env.JWT_SECRET || 'dev-secret';
  publicKey  = process.env.JWT_SECRET || 'dev-secret';
}

const ACCESS_TOKEN_EXPIRE  = parseInt(process.env.ACCESS_TOKEN_EXPIRE  || '900');   // 15 menit
const REFRESH_TOKEN_EXPIRE = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '604800'); // 7 hari

// ============================================================
// Helper: Generate Tokens
// ============================================================
function generateAccessToken(user) {
  const algorithm = privateKey === publicKey ? 'HS256' : 'RS256';
  return jwt.sign(
    {
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role
    },
    privateKey,
    {
      algorithm,
      expiresIn: ACCESS_TOKEN_EXPIRE,
      issuer:   process.env.JWT_ISSUER   || 'ev-charging-user-service',
      audience:  process.env.JWT_AUDIENCE || 'ev-charging-system'
    }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================================
// REGISTER
// ============================================================
async function register({ email, password, name, phone, ev_plate }) {
  // Cek duplikat email
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    const err = new Error('Email sudah terdaftar');
    err.status = 409;
    throw err;
  }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, password_hash, name, phone, ev_plate });

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);

  await RefreshToken.create({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRE * 1000)
  });

  logger.info(`User registered: ${user.id}`);

  return {
    user: sanitizeUser(user),
    access_token:  accessToken,
    refresh_token: refreshToken,
    expires_in:    ACCESS_TOKEN_EXPIRE
  };
}

// ============================================================
// LOGIN
// ============================================================
async function login({ email, password }) {
  const user = await User.findOne({ where: { email, is_active: true } });
  if (!user) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    const err = new Error('Email atau password salah');
    err.status = 401;
    throw err;
  }

  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);

  await RefreshToken.create({
    user_id:    user.id,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRE * 1000)
  });

  logger.info(`User logged in: ${user.id}`);

  return {
    user:          sanitizeUser(user),
    access_token:  accessToken,
    refresh_token: refreshToken,
    expires_in:    ACCESS_TOKEN_EXPIRE
  };
}

// ============================================================
// REFRESH TOKEN
// ============================================================
async function refreshAccessToken(rawRefreshToken) {
  if (!rawRefreshToken) {
    const err = new Error('Refresh token diperlukan');
    err.status = 401;
    throw err;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await RefreshToken.findOne({
    where: {
      token_hash: tokenHash,
      expires_at: { [Op.gt]: new Date() }
    },
    include: [{ model: User, as: 'user', where: { is_active: true } }]
  });

  if (!stored) {
    const err = new Error('Refresh token tidak valid atau sudah expired');
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(stored.user);
  logger.info(`Access token refreshed for user: ${stored.user_id}`);

  return { access_token: accessToken, expires_in: ACCESS_TOKEN_EXPIRE };
}

// ============================================================
// LOGOUT
// ============================================================
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.destroy({ where: { token_hash: tokenHash } });
}

// ============================================================
// Helper: Remove sensitive fields
// ============================================================
function sanitizeUser(user) {
  const { password_hash, ...safe } = user.toJSON ? user.toJSON() : user;
  return safe;
}

module.exports = { register, login, refreshAccessToken, logout, sanitizeUser };
