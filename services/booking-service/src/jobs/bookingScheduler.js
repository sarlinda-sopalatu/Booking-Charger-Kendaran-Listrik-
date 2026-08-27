'use strict';

const { Op } = require('sequelize');
const axios   = require('axios');
const { Booking, BookingEvent } = require('../models/Booking');
const logger = require('../utils/logger');

const STATION_SERVICE  = process.env.STATION_SERVICE_URL  || 'http://station-service:3002';
const SESSION_SERVICE  = process.env.SESSION_SERVICE_URL  || 'http://session-service:3009';
const INTERVAL_MS      = 60 * 1000; // setiap menit

// ─── Helper: waktu lokal sekarang dalam format HH:MM:SS ──────────────────────
function nowTime() {
  // Gunakan waktu lokal server (bukan UTC)
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const ss  = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function todayDate() {
  // Gunakan tanggal lokal server (bukan UTC)
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ─── 1. Auto-START: CONFIRMED → panggil session-service, status → CHARGING ──
async function autoStartSessions() {
  const today   = todayDate();
  const timeNow = nowTime();

  // Cari booking CONFIRMED yang slot_date = hari ini dan start_time sudah lewat
  const toStart = await Booking.findAll({
    where: {
      status:          'CONFIRMED',
      slot_date:       today,
      slot_start_time: { [Op.ne]: null, [Op.lte]: timeNow },
      charger_id:      { [Op.ne]: null }
    }
  });

  for (const booking of toStart) {
    try {
      // Cek apakah session sudah ada (idempotent)
      const existing = await axios.get(
        `${SESSION_SERVICE}/internal/sessions/booking/${booking.id}`
      ).catch(() => null);

      if (existing?.data?.id) {
        logger.info(`[Scheduler] Session sudah ada untuk booking ${booking.id}, skip auto-start`);
        continue;
      }

      // Ambil tarif dari slot
      let tariff = 2500;
      try {
        const { data: slot } = await axios.get(`${STATION_SERVICE}/internal/slots/${booking.slot_id}`);
        tariff = parseFloat(slot.price_per_kwh) || 2500;
      } catch (_) {}

      // Panggil session-service untuk mulai sesi
      await axios.post(`${SESSION_SERVICE}/internal/sessions/start`, {
        booking_id:       booking.id,
        charger_id:       booking.charger_id,
        user_id:          booking.user_id,
        energy_kwh_start: 0,
        tariff_per_kwh:   tariff,
        slot_date:        booking.slot_date,
        slot_start_time:  booking.slot_start_time
      });

      logger.info(`[Scheduler] Auto-START session untuk booking ${booking.id} (slot ${booking.slot_date} ${booking.slot_start_time})`);
    } catch (err) {
      logger.error(`[Scheduler] Auto-start error booking ${booking.id}: ${err.message}`);
    }
  }
}

// ─── 2. Auto-STOP: CHARGING → panggil session-service stop, status → COMPLETED ─
async function autoStopSessions() {
  const today   = todayDate();
  const timeNow = nowTime();

  // Cari booking CHARGING yang slot_end_time sudah lewat
  const toStop = await Booking.findAll({
    where: {
      status:        'CHARGING',
      slot_date:     { [Op.ne]: null },
      slot_end_time: { [Op.ne]: null },
      [Op.or]: [
        { slot_date: { [Op.lt]: today } },
        { slot_date: today, slot_end_time: { [Op.lte]: timeNow } }
      ]
    }
  });

  for (const booking of toStop) {
    try {
      // Ambil session aktif dari session-service
      const { data: session } = await axios.get(
        `${SESSION_SERVICE}/internal/sessions/booking/${booking.id}`
      );

      if (!session?.id || session.status === 'COMPLETED') continue;

      // Hitung estimasi kWh (dari charger power × durasi)
      let kwhEnd = 0;
      try {
        const { data: slot } = await axios.get(`${STATION_SERVICE}/internal/slots/${booking.slot_id}`);
        const powerKw = slot.charger?.max_power_kw || 22;
        const [sh, sm] = booking.slot_start_time.split(':').map(Number);
        const [eh, em] = booking.slot_end_time.split(':').map(Number);
        const durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        kwhEnd = parseFloat(session.energy_kwh_start || 0) + (powerKw * durationHours);
      } catch (_) {}

      // Panggil session-service untuk selesaikan sesi
      await axios.put(`${SESSION_SERVICE}/internal/sessions/${session.id}/stop`, {
        energy_kwh_end: parseFloat(kwhEnd.toFixed(3)),
        stop_reason:    'TIMEOUT'
      });

      logger.info(`[Scheduler] Auto-STOP session ${session.id} untuk booking ${booking.id} (${kwhEnd.toFixed(2)} kWh)`);
    } catch (err) {
      logger.error(`[Scheduler] Auto-stop error booking ${booking.id}: ${err.message}`);
    }
  }
}

// ─── 3. Auto-EXPIRE: PENDING_PAYMENT yang lewat expires_at ──────────────────
async function autoExpireBookings() {
  const now = new Date();

  const pendingExpired = await Booking.findAll({
    where: { status: 'PENDING_PAYMENT', expires_at: { [Op.lt]: now } }
  });

  for (const booking of pendingExpired) {
    await booking.update({ status: 'EXPIRED' });
    await BookingEvent.create({
      booking_id: booking.id,
      event_type: 'EXPIRED',
      data:       { expires_at: booking.expires_at }
    });
    await axios.put(`${STATION_SERVICE}/internal/slots/${booking.slot_id}/release`).catch(() => {});
    logger.info(`[Scheduler] Booking ${booking.id} auto-EXPIRED`);
  }
}

// ─── 4. Auto-COMPLETE fallback: CONFIRMED yg slot sudah lewat tanpa sesi ─────
async function autoCompleteOrphans() {
  const today   = todayDate();
  const timeNow = nowTime();

  const orphans = await Booking.findAll({
    where: {
      status:        'CONFIRMED',
      slot_date:     { [Op.ne]: null },
      slot_end_time: { [Op.ne]: null },
      [Op.or]: [
        { slot_date: { [Op.lt]: today } },
        { slot_date: today, slot_end_time: { [Op.lte]: timeNow } }
      ]
    }
  });

  for (const booking of orphans) {
    // Pastikan tidak ada sesi aktif
    const existing = await axios.get(
      `${SESSION_SERVICE}/internal/sessions/booking/${booking.id}`
    ).catch(() => null);

    if (existing?.data?.id && existing.data.status !== 'COMPLETED') continue;

    await booking.update({ status: 'COMPLETED' });
    await BookingEvent.create({
      booking_id: booking.id,
      event_type: 'AUTO_COMPLETED',
      data:       { slot_date: booking.slot_date, slot_end_time: booking.slot_end_time }
    });
    logger.info(`[Scheduler] Booking ${booking.id} auto-COMPLETED (orphan, slot sudah lewat)`);
  }
}

// ─── Main runner ─────────────────────────────────────────────────────────────
async function runScheduler() {
  try {
    await autoExpireBookings();
    await autoStartSessions();
    await autoStopSessions();
    await autoCompleteOrphans();
  } catch (err) {
    logger.error(`[Scheduler] Error: ${err.message}`);
  }
}

function startScheduler() {
  logger.info('[Scheduler] Booking scheduler started (interval: 60s)');
  runScheduler(); // jalankan segera saat startup
  setInterval(runScheduler, INTERVAL_MS);
}

module.exports = { startScheduler };
