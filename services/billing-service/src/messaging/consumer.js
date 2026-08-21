'use strict';

const amqplib = require('amqplib');
const { createBilling } = require('../controllers/billingController');
const logger = require('../utils/logger');

async function connectConsumer() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn    = await amqplib.connect(url);
      const channel = await conn.createChannel();

      // Exchange sudah di-declare oleh session-service
      await channel.assertExchange('charger', 'topic', { durable: true });

      // Dead-letter exchange untuk pesan gagal
      await channel.assertExchange('billing.dlx', 'fanout', { durable: true });

      const { queue } = await channel.assertQueue('billing.session.completed', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'billing.dlx',
          'x-message-ttl': 86400000 // 24 jam
        }
      });

      await channel.bindQueue(queue, 'charger', 'session.completed');

      channel.prefetch(1);
      channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const { data } = event;

          await createBilling({
            bookingId:    data.bookingId,
            sessionId:    data.sessionId,
            userId:       data.userId,
            energyKwh:    data.energyKwh,
            tariffPerKwh: data.tariffPerKwh
          });

          channel.ack(msg);
          logger.info(`Billing created from session.completed event: booking ${data.bookingId}`);
        } catch (err) {
          logger.error(`Billing consumer error: ${err.message}`);
          channel.nack(msg, false, false); // kirim ke DLQ
        }
      });

      conn.on('error', (err) => logger.error(`Billing consumer conn error: ${err.message}`));
      conn.on('close', () => {
        logger.warn('Billing consumer disconnected. Reconnecting in 5s...');
        setTimeout(() => connectConsumer(), 5000);
      });

      logger.info('Billing consumer connected — listening for session.completed');
      return;
    } catch (err) {
      logger.warn(`Billing consumer attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Billing consumer: could not connect after 10 attempts');
}

module.exports = { connectConsumer };
