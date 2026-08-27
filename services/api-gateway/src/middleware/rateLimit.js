'use strict';

const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;

try {
  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true
  });

  redisClient.on('error', (err) => {
    logger.warn(`Rate limiter Redis error: ${err.message} — falling back to memory store`);
    redisClient = null;
  });
} catch (err) {
  logger.warn(`Could not create Redis client for rate limiting: ${err.message}`);
  redisClient = null;
}

/**
 * Buat rate limiter umum untuk semua API endpoint.
 * Default: 300 requests per menit per user (berdasarkan X-User-Id header).
 */
function createRateLimiter(options = {}) {
  const config = {
    windowMs: 60 * 1000, // 1 menit
    max: options.max || 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.sub || req.ip,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'TooManyRequests',
        message: 'Terlalu banyak request. Silakan coba lagi dalam 1 menit.'
      });
    },
    ...options
  };

  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    });
  }

  return rateLimit(config);
}

/**
 * Rate limiter ketat untuk auth endpoints (login, register).
 * 150 requests per menit per IP.
 */
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (_req, res) => {
    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.'
    });
  },
  ...(redisClient && {
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: 'rl:auth:'
    })
  })
});

module.exports = { createRateLimiter, authRateLimiter };
