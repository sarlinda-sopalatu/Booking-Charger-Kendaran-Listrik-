'use strict';

const axios = require('axios');
const { Payment } = require('../models/Payment');
const { publishEvent } = require('../messaging/publisher');
const logger = require('../utils/logger');

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://booking-service:3003';

// Tarif per kWh (default)
const DEFAULT_PRICE_PER_KWH = 2500;

// ============================================================
// INITIATE PAYMENT — dengan idempotency check
// ============================================================
async function initiatePayment(redis, { userId, userEmail, bookingId, method }) {
  // Idempotency: cek apakah sudah ada payment untuk booking ini
  const existing = await Payment.findOne({
    where: { booking_id: bookingId, user_id: userId }
  });

  if (existing && ['PENDING', 'PROCESSING', 'COMPLETED'].includes(existing.status)) {
    return existing; // Return yang sudah ada
  }

  // Dapatkan detail booking
  let booking;
  try {
    const { data } = await axios.get(`${BOOKING_SERVICE}/internal/bookings/${bookingId}`);
    booking = data;
  } catch (err) {
    const e = new Error('Booking tidak ditemukan');
    e.status = 404;
    throw e;
  }

  if (booking.status !== 'PENDING_PAYMENT') {
    const e = new Error(`Booking dengan status "${booking.status}" tidak perlu pembayaran`);
    e.status = 400;
    throw e;
  }

  // Hitung amount (dalam production, ini dari booking data yang sudah dihitung)
  const amount = 75000; // Placeholder — dalam production ambil dari booking

  // Buat payment record
  const payment = await Payment.create({
    booking_id: bookingId,
    user_id:    userId,
    amount_idr: amount,
    method,
    status:     'PENDING',
    expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 menit
  });

  // Simulasi response payment gateway (dalam production, panggil Midtrans API)
  const gatewayResponse = await simulatePaymentGateway(payment, method, userEmail);

  await payment.update({
    external_ref: gatewayResponse.transaction_id,
    payment_url:  gatewayResponse.payment_url,
    qr_string:    gatewayResponse.qr_string
  });

  await publishEvent('payment', 'payment.initiated', {
    paymentId: payment.id,
    bookingId,
    userId,
    amount,
    method
  });

  logger.info(`Payment initiated: ${payment.id} for booking ${bookingId}`);
  return payment;
}

// Simulasi response Midtrans (untuk development)
async function simulatePaymentGateway(payment, method) {
  const txId = `TXN-${Date.now()}-${payment.id.slice(0, 8).toUpperCase()}`;

  if (method === 'QRIS') {
    return {
      transaction_id: txId,
      qr_string: `00020101021226580014ID.CO.QRIS.WWW011893600914${txId}0215ID${txId}0303UMI51440014ID.LINKAJA.WWW0215${txId}0303UMI5204999953033605405${payment.amount_idr}5802ID5913EV-Charging6007Jakarta6304ABCD`,
      payment_url: null
    };
  }

  return {
    transaction_id: txId,
    qr_string:     null,
    payment_url:   `https://app.sandbox.midtrans.com/snap/v2/vtweb/${txId}`
  };
}

module.exports = { initiatePayment };
