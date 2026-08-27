'use strict';

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Load public key sekali saat startup
let publicKey;
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
try {
  const keyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../keys/public.pem');
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  // Validasi apakah ini benar-benar RSA key
  if (keyContent.includes('BEGIN') && keyContent.includes('PUBLIC KEY')) {
    publicKey = keyContent;
    logger.info('JWT public key loaded successfully');
  } else {
    throw new Error('File bukan RSA public key yang valid');
  }
} catch (err) {
  logger.warn(`Could not load JWT public key from file: ${err.message}. Using JWT_SECRET.`);
  publicKey = jwtSecret;
}

/**
 * Middleware: Verifikasi JWT access token dari Authorization header.
 * Jika valid, inject req.user = { sub, email, name, role }.
 * Jika tidak valid, return 401.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token diperlukan'
    });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256', 'HS256'], // Support keduanya untuk dev
      issuer: process.env.JWT_ISSUER || 'ev-charging-user-service',
      audience: process.env.JWT_AUDIENCE || 'ev-charging-system'
    });

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Access token sudah expired. Silakan refresh token.'
      });
    }

    logger.warn(`JWT verification failed: ${err.message}`);
    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Access token tidak valid'
    });
  }
}

module.exports = { verifyToken, publicKey };
