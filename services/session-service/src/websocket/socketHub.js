'use strict';

const { Server } = require('socket.io');

function setupSocketIO(httpServer) {
    return new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });
}

module.exports = { setupSocketIO };