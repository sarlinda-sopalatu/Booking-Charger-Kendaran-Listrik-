'use strict';

const amqplib = require('amqplib');
const { leaveQueue } = require('../controllers/queueController');
const logger = require('../utils/logger');

let channel = null;

async function startConsumer(redis) {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      channel = await conn.createChannel();

      await channel.assertExchange('booking', 'topic', { durable: true });
      await channel.assertExchange('payment', 'topic', { durable: true });

      // Queue: booking confirmed → keluarkan user dari antrian
      const { queue: bookingQueue } = await channel.assertQueue('queue.booking.events', {
        durable: true
      });
      await channel.bindQueue(bookingQueue, 'booking', 'booking.confirmed');
      await channel.bindQueue(bookingQueue, 'booking', 'booking.cancelled');

      // Queue: payment completed → keluarkan user dari antrian
      const { queue: paymentQueue } = await channel.assertQueue('queue.payment.completed', {
        durable: true
      });
      await channel.bindQueue(paymentQueue, 'payment', 'payment.completed');

      channel.prefetch(5);

      // Konsumsi booking events
      channel.consume(bookingQueue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const { data, eventType } = event;

          if (data?.userId) {
            await leaveQueue(redis, {
              userId:    data.userId,
              stationId: data.stationId || null,
              slotDate:  data.slotDate  || null
            });
            logger.info(`Queue: user ${data.userId} removed after ${eventType}`);
          }
          channel.ack(msg);
        } catch (err) {
          logger.error(`Queue booking consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      // Konsumsi payment completed
      channel.consume(paymentQueue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const { data } = event;

          if (data?.userId) {
            await leaveQueue(redis, { userId: data.userId });
            logger.info(`Queue: user ${data.userId} removed after payment.completed`);
          }
          channel.ack(msg);
        } catch (err) {
          logger.error(`Queue payment consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => { logger.error(`Queue consumer conn error: ${err.message}`); channel = null; });
      conn.on('close', () => {
        logger.warn('Queue consumer disconnected. Reconnecting in 5s...');
        channel = null;
        setTimeout(() => startConsumer(redis), 5000);
      });

      logger.info('Queue consumer connected – listening for booking & payment events');
      return;
    } catch (err) {
      logger.warn(`Queue consumer attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Queue consumer: could not connect after 10 attempts');
}

module.exports = { startConsumer };
