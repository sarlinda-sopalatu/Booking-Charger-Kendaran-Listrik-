'use strict';

const amqplib = require('amqplib');
const axios   = require('axios');
const { Booking, BookingEvent } = require('../models/Booking');
const logger = require('../utils/logger');

const STATION_SERVICE = process.env.STATION_SERVICE_URL || 'http://station-service:3002';

async function connectConsumer() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn    = await amqplib.connect(url);
      const channel = await conn.createChannel();

      await channel.assertExchange('payment', 'topic', { durable: true });

      const { queue } = await channel.assertQueue('booking.payment.events', { durable: true });
      await channel.bindQueue(queue, 'payment', 'payment.completed');
      await channel.bindQueue(queue, 'payment', 'payment.failed');

      channel.prefetch(1);
      channel.consume(queue, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());

          if (event.eventType === 'payment.completed') {
            await handlePaymentCompleted(event.data);
          } else if (event.eventType === 'payment.failed') {
            await handlePaymentFailed(event.data);
          }

          channel.ack(msg);
        } catch (err) {
          logger.error(`Booking consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => logger.error(`Booking consumer conn error: ${err.message}`));
      conn.on('close', () => {
        logger.warn('Booking consumer disconnected. Reconnecting in 5s...');
        setTimeout(() => connectConsumer(), 5000);
      });

      logger.info('Booking consumer connected — listening for payment events');
      return;
    } catch (err) {
      logger.warn(`Booking consumer attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Booking consumer: could not connect after 10 attempts');
}

async function handlePaymentCompleted({ bookingId, userId }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return logger.warn(`payment.completed: booking ${bookingId} not found`);
  if (booking.status !== 'PENDING_PAYMENT') return; // sudah diproses

  await booking.update({ status: 'CONFIRMED' });
  await BookingEvent.create({
    booking_id: bookingId,
    event_type: 'PAYMENT_CONFIRMED',
    data:       { userId }
  });

  logger.info(`Booking ${bookingId} status → CONFIRMED`);
}

async function handlePaymentFailed({ bookingId }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return logger.warn(`payment.failed: booking ${bookingId} not found`);
  if (booking.status !== 'PENDING_PAYMENT') return;

  await booking.update({ status: 'CANCELLED', cancel_reason: 'Pembayaran gagal' });
  await BookingEvent.create({
    booking_id: bookingId,
    event_type: 'PAYMENT_FAILED',
    data:       {}
  });

  // Lepaskan slot kembali
  await axios.put(`${STATION_SERVICE}/internal/slots/${booking.slot_id}/release`).catch(() => {});

  logger.info(`Booking ${bookingId} status → CANCELLED (payment failed)`);
}

module.exports = { connectConsumer };
