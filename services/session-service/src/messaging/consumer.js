'use strict';

const amqplib = require('amqplib');
const { startSession } = require('../controllers/sessionController');
const logger = require('../utils/logger');

async function startConsumer(io, redis) {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      const channel = await conn.createChannel();

      await channel.assertExchange('payment', 'topic', { durable: true });
      await channel.assertExchange('booking', 'topic', { durable: true });

      // Queue: payment.completed → mulai sesi pengisian
      const { queue: paymentQueue } = await channel.assertQueue('session.payment.completed', {
        durable: true,
        arguments: { 'x-dead-letter-exchange': 'session.dlx' }
      });
      await channel.assertExchange('session.dlx', 'fanout', { durable: true });
      await channel.bindQueue(paymentQueue, 'payment', 'payment.completed');

      // Queue: booking.cancelled → tidak ada aksi (sesi belum dimulai)
      // Sesi hanya dimulai saat kendaraan terhubung secara fisik (OCPP),
      // namun kita siapkan consumer untuk payment.completed agar booking → CONFIRMED

      channel.prefetch(5);

      channel.consume(paymentQueue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const { data } = event;

          // Sesi dimulai manual via OCPP; di sini hanya log
          logger.info(`Session consumer: payment.completed for booking ${data?.bookingId}`);

          // Broadcast ke frontend bahwa pembayaran berhasil (jika ada userId)
          if (io && data?.userId) {
            io.to(`user:${data.userId}`).emit('payment_confirmed', {
              bookingId: data.bookingId,
              paymentId: data.paymentId
            });
          }

          channel.ack(msg);
        } catch (err) {
          logger.error(`Session payment consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => { logger.error(`Session consumer conn error: ${err.message}`); });
      conn.on('close', () => {
        logger.warn('Session consumer disconnected. Reconnecting in 5s...');
        setTimeout(() => startConsumer(io, redis), 5000);
      });

      logger.info('Session consumer connected – listening for payment.completed');
      return;
    } catch (err) {
      logger.warn(`Session consumer attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Session consumer: could not connect after 10 attempts');
}

module.exports = { startConsumer };
