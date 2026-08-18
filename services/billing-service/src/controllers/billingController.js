'use strict';

const { Billing } = require('../models/Billing');
const logger = require('../utils/logger');

// ============================================================
// Hitung tagihan dari data sesi
// Dipanggil oleh: session-service via RabbitMQ event "session.completed"
// ============================================================
async function createBilling({ bookingId, sessionId, userId, energyKwh, tariffPerKwh }) {
  // Cegah tagihan dobel untuk booking yang sama
  const existing = await Billing.findOne({ where: { booking_id: bookingId } });
  if (existing) {
    logger.warn(`Billing sudah ada untuk booking ${bookingId}`);
    return existing;
  }

  const subtotal = parseFloat(energyKwh) * parseFloat(tariffPerKwh);
  const tax      = Math.round(subtotal * 0.11); // PPN 11%
  const total    = subtotal + tax;

  const invoiceNumber = `INV-${Date.now()}-${bookingId.slice(0, 8).toUpperCase()}`;

  const billing = await Billing.create({
    booking_id:     bookingId,
    session_id:     sessionId,
    user_id:        userId,
    energy_kwh:     energyKwh,
    tariff_per_kwh: tariffPerKwh,
    subtotal_idr:   Math.round(subtotal),
    tax_idr:        tax,
    total_idr:      Math.round(total),
    status:         'ISSUED',
    invoice_number: invoiceNumber,
    issued_at:      new Date()
  });

  logger.info(`Billing created: ${billing.id} for booking ${bookingId}, total: Rp${Math.round(total)}`);
  return billing;
}

// ============================================================
// Ambil tagihan berdasarkan booking_id
// ============================================================
async function getBillingByBooking(bookingId) {
  const billing = await Billing.findOne({ where: { booking_id: bookingId } });
  if (!billing) {
    const e = new Error('Tagihan tidak ditemukan');
    e.status = 404;
    throw e;
  }
  return billing;
}

// ============================================================
// Riwayat tagihan user (dengan paginasi keyset — Lapisan 3)
// ============================================================
async function getBillingHistory({ userId, cursor, limit = 20 }) {
  const safeLimit = Math.min(parseInt(limit) || 20, 20);

  const where = { user_id: userId };
  if (cursor) {
    const { Op } = require('sequelize');
    where.created_at = { [Op.lt]: new Date(cursor) };
  }

  const items = await Billing.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: safeLimit + 1 // ambil satu lebih untuk deteksi halaman berikutnya
  });

  const hasMore   = items.length > safeLimit;
  const result    = hasMore ? items.slice(0, safeLimit) : items;
  const nextCursor = hasMore ? result[result.length - 1].created_at.toISOString() : null;

  return {
    items: result,
    limit: safeLimit,
    next_cursor: nextCursor,
    has_more: hasMore
  };
}

module.exports = { createBilling, getBillingByBooking, getBillingHistory };
