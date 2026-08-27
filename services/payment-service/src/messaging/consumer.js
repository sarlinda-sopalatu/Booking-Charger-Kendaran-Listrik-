'use strict';

const amqplib = require('amqplib');
const axios = require('axios');
const { Payment } = require('../models/Payment');
const logger = require('../utils/logger');

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003';

let channel = null;

async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      channel = await conn.createChannel();

      await channel.assertExchange('payment', 'topic', { durable: true });
      await channel.assertExchange('booking', 'topic', { durable: true });

      conn.on('error', (err) => { logger.error(`Payment RabbitMQ error: ${err.message}`); channel = null; });
      conn.on('close', () => {
        logger.warn('Payment RabbitMQ closed. Reconnecting...');
        channel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      logger.info('Payment Service connected to RabbitMQ');
      return;
    } catch (err) {
      logger.warn(`Payment RabbitMQ attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Payment Service: could not connect to RabbitMQ after 10 attempts');
}

async function startConsumer() {
  if (!channel) {
    logger.warn('Payment consumer: channel not ready, retrying in 3s...');
    await new Promise(r => setTimeout(r, 3000));
    return startConsumer();
  }

  // Queue: booking cancelled → batalkan payment yang PENDING
  const { queue: cancelQueue } = await channel.assertQueue('payment.booking.cancelled', {
    durable: true
  });
  await channel.bindQueue(cancelQueue, 'booking', 'booking.cancelled');

  channel.prefetch(5);

  channel.consume(cancelQueue, async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      const { data } = event;

      if (data?.bookingId) {
        // Batalkan payment pending untuk booking ini
        const payment = await Payment.findOne({
          where: { booking_id: data.bookingId, status: 'PENDING' }
        });
        if (payment) {
          await payment.update({ status: 'CANCELLED' });
          logger.info(`Payment ${payment.id} cancelled due to booking cancellation`);
        }
      }
      channel.ack(msg);
    } catch (err) {
      logger.error(`Payment booking.cancelled consumer error: ${err.message}`);
      channel.nack(msg, false, false);
    }
  });

  logger.info('Payment consumer ready – listening for booking.cancelled');
}

module.exports = { connectRabbitMQ, startConsumer };
