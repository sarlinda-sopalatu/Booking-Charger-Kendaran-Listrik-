'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

let publicKey;
try {
  publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '../../../keys/public.pem'), 'utf8');
} catch {
  publicKey = process.env.JWT_SECRET || 'dev-secret';
}

function setupSocketIO(httpServer, redis) {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || '*',
      credentials: true
    },
    pingTimeout:  60000,
    pingInterval: 25000
  });

  // ---- Auth middleware ----
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token diperlukan'));

    try {
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256', 'HS256'] });
      socket.userId   = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Token tidak valid'));
    }
  });

  // ---- Connection handler ----
  io.on('connection', (socket) => {
    logger.info(`WS connected: ${socket.userId}`);

    // Subscribe ke charger tertentu
    socket.on('subscribe:charger', async (chargerId) => {
      socket.join(`charger:${chargerId}`);
      logger.info(`User ${socket.userId} subscribed to charger ${chargerId}`);

      // Kirim data terbaru dari Redis cache segera
      try {
        const cached = await redis.get(`charger:latest:${chargerId}`);
        if (cached) {
          socket.emit('reading:latest', JSON.parse(cached));
        }
      } catch (err) {
        logger.warn(`Redis cache miss for charger ${chargerId}`);
      }

      socket.emit('subscribed', { chargerId });
    });

    // Unsubscribe
    socket.on('unsubscribe:charger', (chargerId) => {
      socket.leave(`charger:${chargerId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WS disconnected: ${socket.userId}, reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Broadcast data pembacaan charger ke semua client yang subscribe
 */
function broadcastReading(io, chargerId, data) {
  io.to(`charger:${chargerId}`).emit('reading', {
    chargerId,
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast session ended event
 */
function broadcastSessionEnded(io, chargerId, summary) {
  io.to(`charger:${chargerId}`).emit('session_ended', summary);
}

module.exports = { setupSocketIO, broadcastReading, broadcastSessionEnded };
