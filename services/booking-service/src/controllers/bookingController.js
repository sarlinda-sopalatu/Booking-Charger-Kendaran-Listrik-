'use strict';

const axios = require('axios');
const { Booking, BookingEvent } = require('../models/Booking');
const { publishEvent } = require('../messaging/publisher');
const logger = require('../utils/logger');
const { sequelize } = require('../db');

const STATION_SERVICE = process.env.STATION_SERVICE_URL || 'http://station-service:3002';
const USER_SERVICE    = process.env.USER_SERVICE_URL    || 'http://user-service:3001';
const EXPIRY_MINUTES  = parseInt(process.env.BOOKING_EXPIRY_MINUTES || '30');

// ============================================================
// CREATE BOOKING — Saga choreography
// ============================================================
async function createBooking({ userId, userEmail, slotId, notes }) {
  // Step 1: Validasi user
  let user;
  try {
    const { data } = await axios.get(`${USER_SERVICE}/internal/users/${userId}`);
    user = data;
  } catch (err) {
    const e = new Error('User tidak ditemukan');
    e.status = 404;
    throw e;
  }

  // Step 2: Cek slot detail
  let slotData;
  try {
    const { data } = await axios.get(`${STATION_SERVICE}/internal/slots/${slotId}`);
    slotData = data;
  } catch (err) {
    const e = new Error('Slot tidak ditemukan');
    e.status = 404;
    throw e;
  }

  if (slotData.status !== 'AVAILABLE') {
    const e = new Error('Slot sudah tidak tersedia');
    e.status = 409;
    throw e;
  }

  // Step 3: Reserve slot (atomic update di Station Service)
  try {
    await axios.put(`${STATION_SERVICE}/internal/slots/${slotId}/reserve`);
  } catch (err) {
    if (err.response?.status === 409) {
      const e = new Error('Slot sudah tidak tersedia');
      e.status = 409;
      throw e;
    }
    throw err;
  }

  // Step 3b: Cek apakah user sudah punya booking aktif di tanggal yang sama
  if (slotData.slot_date) {
    const existing = await Booking.findOne({
      where: {
        user_id:   userId,
        slot_date: slotData.slot_date,
        status:    ['PENDING_PAYMENT', 'CONFIRMED', 'CHARGING']
      }
    });
    if (existing) {
      // Kembalikan slot yang baru di-reserve
      await axios.put(`${STATION_SERVICE}/internal/slots/${slotId}/release`).catch(() => {});
      const e = new Error(
        `Anda sudah memiliki booking aktif pada tanggal ${slotData.slot_date} (ID: ${existing.id})`
      );
      e.status = 409;
      e.existingBookingId = existing.id;
      e.existingSlotDate  = slotData.slot_date;
      throw e;
    }
  }

  // Step 4: Buat booking record
  let booking;
  try {
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
    booking = await Booking.create({
      user_id:        userId,
      slot_id:        slotId,
      status:         'PENDING_PAYMENT',
      notes,
      slot_date:      slotData.slot_date          || null,
      slot_start_time:slotData.start_time         || null,
      slot_end_time:  slotData.end_time           || null,
      charger_id:     slotData.charger_id || slotData.charger?.id || null,
      expires_at:     expiresAt
    });

    await BookingEvent.create({
      booking_id: booking.id,
      event_type: 'CREATED',
      data:       { userId, slotId, expiresAt }
    });
  } catch (err) {
    // Compensating transaction: release slot
    await axios.put(`${STATION_SERVICE}/internal/slots/${slotId}/release`).catch(() => {});
    throw err;
  }

  // Step 5: Publish booking.created event
  const estimatedAmount = calculateEstimatedCost(slotData);
  await publishEvent('booking', 'booking.created', {
    bookingId:       booking.id,
    userId,
    userEmail,
    userName:        user.name,
    userPhone:       user.phone,
    slotId,
    stationName:     slotData.charger?.station?.name || 'N/A',
    chargerType:     slotData.charger?.connector_type || 'N/A',
    slotDate:        slotData.slot_date,
    startTime:       slotData.start_time,
    endTime:         slotData.end_time,
    pricePerKwh:     slotData.price_per_kwh,
    estimatedAmount,
    expiresAt:       booking.expires_at
  });

  logger.info(`Booking created: ${booking.id} for user ${userId}`);
  return booking;
}

// ============================================================
// CANCEL BOOKING
// ============================================================
async function cancelBooking({ bookingId, userId, reason }) {
  const booking = await Booking.findOne({ where: { id: bookingId, user_id: userId } });

  if (!booking) {
    const e = new Error('Booking tidak ditemukan');
    e.status = 404;
    throw e;
  }

  if (['COMPLETED', 'CANCELLED', 'CHARGING'].includes(booking.status)) {
    const e = new Error(`Booking dengan status "${booking.status}" tidak bisa dibatalkan`);
    e.status = 400;
    throw e;
  }

  await booking.update({
    status:        'CANCELLED',
    cancelled_at:  new Date(),
    cancel_reason: reason
  });

  await BookingEvent.create({
    booking_id: bookingId,
    event_type: 'CANCELLED',
    data:       { reason }
  });

  // Release slot
  await axios.put(`${STATION_SERVICE}/internal/slots/${booking.slot_id}/release`).catch(() => {});

  // Publish event
  await publishEvent('booking', 'booking.cancelled', {
    bookingId,
    userId,
    slotId:         booking.slot_id,
    wasPaymentMade: booking.status === 'CONFIRMED'
  });

  logger.info(`Booking cancelled: ${bookingId}`);
  return booking;
}

// ============================================================
// Helper
// ============================================================
function calculateEstimatedCost(slot) {
  if (!slot || !slot.start_time || !slot.end_time) return 0;
  const [sh, sm] = slot.start_time.split(':').map(Number);
  const [eh, em] = slot.end_time.split(':').map(Number);
  const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
  const powerKw = slot.charger?.max_power_kw || 22;
  const energyKwh = powerKw * durationHours;
  return Math.round(energyKwh * parseFloat(slot.price_per_kwh || 2500));
}

module.exports = { createBooking, cancelBooking };
