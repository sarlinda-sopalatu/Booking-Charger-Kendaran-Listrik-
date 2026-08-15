'use strict';

const { ChargingSession, PowerReading } = require('../models/Session');
const { publishEvent } = require('../messaging/publisher');
const logger = require('../utils/logger');
const { sequelize } = require('../db');

// ============================================================
// START SESSION — Dipanggil saat kendaraan mulai mengisi daya
// ============================================================
async function startSession({ bookingId, chargerId, userId, energyKwhStart, tariffPerKwh }) {
  // Cegah duplikasi: 1 booking = 1 sesi
  const existing = await ChargingSession.findOne({ where: { booking_id: bookingId } });
  if (existing) {
    if (existing.status === 'ACTIVE') return existing; // idempotent
    const err = new Error(`Sesi untuk booking ${bookingId} sudah ada dengan status ${existing.status}`);
    err.status = 409;
    throw err;
  }

  const session = await ChargingSession.create({
    booking_id:       bookingId,
    charger_id:       chargerId,
    user_id:          userId,
    status:           'ACTIVE',
    started_at:       new Date(),
    energy_kwh_start: energyKwhStart || 0,
    tariff_per_kwh:   tariffPerKwh || 2500
  });

  logger.info(`Session STARTED: ${session.id} | Charger: ${chargerId} | User: ${userId}`);

  // Publish event → billing-service dan booking-service bisa update status
  await publishEvent('session', 'session.started', {
    sessionId:  session.id,
    bookingId,
    chargerId,
    userId,
    startedAt:  session.started_at.toISOString()
  });

  return session;
}

// ============================================================
// RECORD READING — Catat pembacaan daya berkala (setiap ~10 detik)
// ============================================================
async function recordReading(sessionId, readingData) {
  const session = await ChargingSession.findByPk(sessionId);
  if (!session) {
    const err = new Error('Sesi tidak ditemukan');
    err.status = 404;
    throw err;
  }
  if (session.status !== 'ACTIVE') {
    const err = new Error(`Sesi sudah ${session.status}, tidak bisa menerima pembacaan`);
    err.status = 400;
    throw err;
  }

  // Simpan satu baris pembacaan
  const reading = await PowerReading.create({
    session_id:              sessionId,
    charger_id:              session.charger_id,
    power_kw:                readingData.power_kw        || 0,
    energy_kwh_cumulative:   readingData.energy_kwh      || 0,
    voltage_v:               readingData.voltage_v       || 0,
    current_a:               readingData.current_a       || 0,
    state_of_charge_pct:     readingData.soc_pct         || 0,
    temperature_c:           readingData.temperature_c   || 0,
    recorded_at:             readingData.recorded_at ? new Date(readingData.recorded_at) : new Date()
  });

  // Update peak power di sesi
  if (parseFloat(readingData.power_kw) > parseFloat(session.peak_power_kw)) {
    await session.update({ peak_power_kw: readingData.power_kw });
  }

  return reading;
}

// ============================================================
// STOP SESSION — Sesi selesai, hitung total kWh dan kirim ke billing
// ============================================================
async function stopSession({ sessionId, energyKwhEnd, stopReason }) {
  const t = await sequelize.transaction();
  try {
    const session = await ChargingSession.findByPk(sessionId, { transaction: t });
    if (!session) {
      await t.rollback();
      const err = new Error('Sesi tidak ditemukan');
      err.status = 404;
      throw err;
    }
    if (session.status === 'COMPLETED') {
      await t.rollback();
      return session; // Idempotent
    }

    const endTime      = new Date();
    const startTime    = new Date(session.started_at);
    const durationMin  = Math.round((endTime - startTime) / 60000);

    // Hitung kWh terpakai
    const kwhStart    = parseFloat(session.energy_kwh_start);
    const kwhEnd      = parseFloat(energyKwhEnd || session.energy_kwh_end);
    const kwhUsed     = Math.max(0, kwhEnd - kwhStart);
    const totalCost   = Math.round(kwhUsed * parseFloat(session.tariff_per_kwh));

    // Hitung rata-rata daya dari semua pembacaan
    const avgResult = await PowerReading.findOne({
      where: { session_id: sessionId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('power_kw')), 'avg_power']
      ],
      raw: true,
      transaction: t
    });
    const avgPower = parseFloat(avgResult?.avg_power || 0);

    await session.update({
      status:           'COMPLETED',
      completed_at:     endTime,
      energy_kwh_end:   kwhEnd,
      energy_kwh_used:  kwhUsed,
      avg_power_kw:     avgPower,
      duration_minutes: durationMin,
      stop_reason:      stopReason || 'MANUAL',
      total_cost_idr:   totalCost
    }, { transaction: t });

    await t.commit();

    logger.info(`Session COMPLETED: ${sessionId} | ${kwhUsed.toFixed(3)} kWh | Rp ${totalCost.toLocaleString('id-ID')} | ${durationMin} menit`);

    // Publish ke billing-service untuk generate tagihan
    await publishEvent('session', 'session.completed', {
      sessionId:       session.id,
      bookingId:       session.booking_id,
      chargerId:       session.charger_id,
      userId:          session.user_id,
      energyKwhUsed:   kwhUsed,
      tariffPerKwh:    parseFloat(session.tariff_per_kwh),
      totalCostIdr:    totalCost,
      durationMinutes: durationMin,
      startedAt:       session.started_at.toISOString(),
      completedAt:     endTime.toISOString(),
      stopReason:      stopReason || 'MANUAL'
    });

    return await ChargingSession.findByPk(sessionId, {
      include: [{ model: PowerReading, as: 'readings', limit: 5, order: [['recorded_at', 'DESC']] }]
    });

  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// ============================================================
// GET SESSION SUMMARY — Ringkasan sesi dengan grafik pembacaan
// ============================================================
async function getSessionSummary(sessionId) {
  const session = await ChargingSession.findByPk(sessionId, {
    include: [{ model: PowerReading, as: 'readings', order: [['recorded_at', 'ASC']] }]
  });
  if (!session) {
    const err = new Error('Sesi tidak ditemukan');
    err.status = 404;
    throw err;
  }

  const readings = session.readings || [];
  return {
    session,
    summary: {
      totalReadings:    readings.length,
      energyKwhUsed:    session.energy_kwh_used,
      durationMinutes:  session.duration_minutes,
      peakPowerKw:      session.peak_power_kw,
      avgPowerKw:       session.avg_power_kw,
      totalCostIdr:     session.total_cost_idr,
      finalSocPct:      readings.length > 0 ? readings[readings.length - 1].state_of_charge_pct : null
    },
    // Data untuk grafik daya (format: [{time, power_kw, soc}])
    chartData: readings.map(r => ({
      time:     new Date(r.recorded_at).toLocaleTimeString('id-ID'),
      power_kw: parseFloat(r.power_kw),
      soc_pct:  parseFloat(r.state_of_charge_pct),
      energy:   parseFloat(r.energy_kwh_cumulative)
    }))
  };
}

module.exports = { startSession, recordReading, stopSession, getSessionSummary };
