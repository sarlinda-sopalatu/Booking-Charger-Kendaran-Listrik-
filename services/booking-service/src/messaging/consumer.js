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

      // ── Payment exchange ──────────────────────────────────
      await channel.assertExchange('payment', 'topic', { durable: true });
      const { queue: payQ } = await channel.assertQueue('booking.payment.events', { durable: true });
      await channel.bindQueue(payQ, 'payment', 'payment.completed');
      await channel.bindQueue(payQ, 'payment', 'payment.failed');

      // ── Session exchange ──────────────────────────────────
      await channel.assertExchange('session', 'topic', { durable: true });
      const { queue: sessQ } = await channel.assertQueue('booking.session.events', { durable: true });
      await channel.bindQueue(sessQ, 'session', 'session.started');
      await channel.bindQueue(sessQ, 'session', 'session.completed');

      channel.prefetch(1);

      channel.consume(payQ, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          if (event.eventType === 'payment.completed') await handlePaymentCompleted(event.data);
          else if (event.eventType === 'payment.failed')    await handlePaymentFailed(event.data);
          channel.ack(msg);
        } catch (err) {
          logger.error(`Booking payment consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      channel.consume(sessQ, async (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          if (event.eventType === 'session.started')   await handleSessionStarted(event.data);
          else if (event.eventType === 'session.completed') await handleSessionCompleted(event.data);
          channel.ack(msg);
        } catch (err) {
          logger.error(`Booking session consumer error: ${err.message}`);
          channel.nack(msg, false, false);
        }
      });

      conn.on('error', (err) => logger.error(`Booking consumer conn error: ${err.message}`));
      conn.on('close', () => {
        logger.warn('Booking consumer disconnected. Reconnecting in 5s...');
        setTimeout(() => connectConsumer(), 5000);
      });

      logger.info('Booking consumer connected — listening for payment + session events');
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
  if (booking.status !== 'PENDING_PAYMENT') return;

  await booking.update({ status: 'CONFIRMED' });
  await BookingEvent.create({ booking_id: bookingId, event_type: 'PAYMENT_CONFIRMED', data: { userId } });
  logger.info(`Booking ${bookingId} status → CONFIRMED`);
}

async function handlePaymentFailed({ bookingId }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return logger.warn(`payment.failed: booking ${bookingId} not found`);
  if (booking.status !== 'PENDING_PAYMENT') return;

  await booking.update({ status: 'CANCELLED', cancel_reason: 'Pembayaran gagal' });
  await BookingEvent.create({ booking_id: bookingId, event_type: 'PAYMENT_FAILED', data: {} });
  await axios.put(`${STATION_SERVICE}/internal/slots/${booking.slot_id}/release`).catch(() => {});
  logger.info(`Booking ${bookingId} status → CANCELLED (payment failed)`);
}

async function handleSessionStarted({ bookingId }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return logger.warn(`session.started: booking ${bookingId} not found`);
  if (booking.status !== 'CONFIRMED') return; // hanya dari CONFIRMED

  await booking.update({ status: 'CHARGING' });
  await BookingEvent.create({ booking_id: bookingId, event_type: 'CHARGING_STARTED', data: {} });
  logger.info(`Booking ${bookingId} status → CHARGING`);
}

async function handleSessionCompleted({ bookingId, energyKwhUsed, totalCostIdr, durationMinutes }) {
  const booking = await Booking.findByPk(bookingId);
  if (!booking) return logger.warn(`session.completed: booking ${bookingId} not found`);
  if (booking.status === 'COMPLETED') return; // idempotent

  await booking.update({ status: 'COMPLETED' });
  await BookingEvent.create({
    booking_id: bookingId,
    event_type: 'CHARGING_COMPLETED',
    data: { energyKwhUsed, totalCostIdr, durationMinutes }
  });
  logger.info(`Booking ${bookingId} status → COMPLETED (${energyKwhUsed} kWh, Rp ${totalCostIdr})`);
}

module.exports = { connectConsumer };
