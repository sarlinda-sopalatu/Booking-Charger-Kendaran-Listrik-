'use strict';

const { Server } = require('socket.io');
const logger = require('../utils/logger');

function setupSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || '*',
      credentials: true
    },
    pingTimeout:  60000,
    pingInterval: 25000
  });

  // Auth: gunakan userId dari query param (dikirim frontend setelah login)
  io.use((socket, next) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (!userId) return next(new Error('userId diperlukan'));
    socket.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    logger.info(`Session WS connected: ${socket.userId}`);

    // User subscribe ke room-nya sendiri untuk notifikasi personal
    socket.join(`user:${socket.userId}`);

    // Subscribe ke sesi tertentu
    socket.on('subscribe:session', (sessionId) => {
      socket.join(`session:${sessionId}`);
      logger.info(`User ${socket.userId} subscribed to session ${sessionId}`);
      socket.emit('subscribed', { sessionId });
    });

    socket.on('unsubscribe:session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Session WS disconnected: ${socket.userId}, reason: ${reason}`);
    });
  });

  return io;
}

/**
 * Broadcast update sesi ke subscriber
 */
function broadcastSessionUpdate(io, sessionId, data) {
  io.to(`session:${sessionId}`).emit('session_update', {
    sessionId,
    ...data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcast sesi selesai
 */
function broadcastSessionEnded(io, sessionId, summary) {
  io.to(`session:${sessionId}`).emit('session_ended', summary);
}

module.exports = { setupSocketIO, broadcastSessionUpdate, broadcastSessionEnded };
