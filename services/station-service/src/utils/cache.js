'use strict';

/**
 * cache.js — Redis Cache Utility untuk station-service
 *
 * Strategi cache-aside:
 *   1. Cek Redis dulu (HIT → langsung return)
 *   2. Kalau MISS → ambil dari DB → simpan ke Redis dengan TTL
 *   3. Saat data berubah → hapus cache (invalidasi)
 *
 * PENTING:
 *   - Info stasiun & tarif: boleh di-cache (jarang berubah), TTL 60 detik
 *   - Status slot: JANGAN di-cache dengan TTL panjang, berubah tiap detik
 */

const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

redis.on('error', err => console.error(`[Cache] Redis error: ${err.message}`));

// -------------------------------------------------------------------------
// Ambil data stasiun (cache 60 detik)
// -------------------------------------------------------------------------
async function getStation(stationId, fetchFn) {
  const key = `station:${stationId}`;
  try {
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);                // HIT
    const data = await fetchFn();                         // MISS — ke DB
    await redis.set(key, JSON.stringify(data), 'EX', 60); // simpan 60 detik
    return data;
  } catch {
    return fetchFn(); // kalau Redis down, langsung ke DB
  }
}

// -------------------------------------------------------------------------
// Ambil tarif per kWh charger (cache 120 detik — jarang berubah)
// -------------------------------------------------------------------------
async function getTariff(chargerId, fetchFn) {
  const key = `tariff:${chargerId}`;
  try {
    const cached = await redis.get(key);
    if (cached) return parseFloat(cached);
    const tariff = await fetchFn();
    await redis.set(key, String(tariff), 'EX', 120);
    return tariff;
  } catch {
    return fetchFn();
  }
}

// -------------------------------------------------------------------------
// Hapus cache saat data berubah (invalidasi)
// Dipanggil setelah UPDATE stasiun atau UPDATE tarif
// -------------------------------------------------------------------------
async function invalidateStation(stationId) {
  try {
    await redis.del(`station:${stationId}`);
  } catch { /* abaikan error Redis saat invalidasi */ }
}

async function invalidateTariff(chargerId) {
  try {
    await redis.del(`tariff:${chargerId}`);
  } catch { /* abaikan */ }
}

// -------------------------------------------------------------------------
// Cache ketersediaan slot per charger per tanggal
// Ini opsional — exclusion constraint di DB sudah cukup untuk cegah
// double booking. Cache ini hanya untuk mempercepat query baca.
// -------------------------------------------------------------------------
async function getSlotAvailability(chargerId, date) {
  const key = `slots:avail:${chargerId}:${date}`;
  try {
    const val = await redis.get(key);
    return val !== null ? parseInt(val) : null; // null = belum ada cache
  } catch {
    return null;
  }
}

async function setSlotAvailability(chargerId, date, count) {
  const key = `slots:avail:${chargerId}:${date}`;
  try {
    // TTL 30 detik — cukup untuk mengurangi DB hit saat jam sibuk
    await redis.set(key, String(count), 'EX', 30);
  } catch { /* abaikan */ }
}

async function invalidateSlotAvailability(chargerId, date) {
  try {
    await redis.del(`slots:avail:${chargerId}:${date}`);
  } catch { /* abaikan */ }
}

module.exports = {
  redis,
  getStation,
  getTariff,
  invalidateStation,
  invalidateTariff,
  getSlotAvailability,
  setSlotAvailability,
  invalidateSlotAvailability
};
