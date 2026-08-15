'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const STATION_SERVICE = process.env.STATION_SERVICE_URL || 'http://station-service:3002';
let publishEvent;

// Lazy import to avoid circular dependency
function getPublisher() {
  if (!publishEvent) {
    publishEvent = require('../messaging/publisher').publishEvent;
  }
  return publishEvent;
}

// Redis key helpers
const queueKey  = (stationId, date) => `queue:${stationId}:${date}`;
const detailKey = (userId) => `booking:queue:${userId}`;

// ============================================================
// JOIN QUEUE
// ============================================================
async function joinQueue(redis, { userId, stationId, slotDate, connectorType }) {
  const key = queueKey(stationId, slotDate);
  const score = Date.now(); // timestamp sebagai score (FIFO)

  await redis.zadd(key, 'NX', score, userId);
  const position = await redis.zrank(key, userId);
  const total    = await redis.zcard(key);

  const estimatedWaitMinutes = (position + 1) * 30; // estimasi kasar 30 menit per antrean

  await redis.hset(detailKey(userId), {
    position:    position + 1,
    stationId,
    slotDate,
    connectorType: connectorType || 'ANY',
    joinedAt:    new Date().toISOString(),
    estimatedWaitMinutes
  });

  // Set TTL 24 jam
  await redis.expire(key, 86400);
  await redis.expire(detailKey(userId), 86400);

  logger.info(`User ${userId} joined queue for station ${stationId} on ${slotDate} at position ${position + 1}`);

  return { stationId, slotDate, position: position + 1, total, estimatedWaitMinutes };
}

// ============================================================
// LEAVE QUEUE
// ============================================================
async function leaveQueue(redis, { userId, stationId, slotDate }) {
  const detail = await redis.hgetall(detailKey(userId));
  const sid    = stationId || detail?.stationId;
  const date   = slotDate  || detail?.slotDate;

  if (sid && date) {
    await redis.zrem(queueKey(sid, date), userId);
  }
  await redis.del(detailKey(userId));

  logger.info(`User ${userId} left queue`);
}

// ============================================================
// GET QUEUE POSITION
// ============================================================
async function getPosition(redis, userId) {
  const detail = await redis.hgetall(detailKey(userId));
  if (!detail || !detail.stationId) return null;

  const key       = queueKey(detail.stationId, detail.slotDate);
  const rank      = await redis.zrank(key, userId);
  const total     = await redis.zcard(key);

  if (rank === null) return null;

  return {
    userId,
    stationId:           detail.stationId,
    slotDate:            detail.slotDate,
    position:            rank + 1,
    total_in_queue:      total,
    estimatedWaitMinutes: (rank + 1) * 30,
    joinedAt:            detail.joinedAt
  };
}

// ============================================================
// GET STATION QUEUE
// ============================================================
async function getStationQueue(redis, stationId, slotDate) {
  const date = slotDate || new Date().toISOString().split('T')[0];
  const key  = queueKey(stationId, date);
  const entries = await redis.zrangebyscore(key, '-inf', '+inf', 'WITHSCORES');

  const queue = [];
  for (let i = 0; i < entries.length; i += 2) {
    queue.push({ userId: entries[i], joinedAt: new Date(parseInt(entries[i+1])).toISOString(), position: i / 2 + 1 });
  }

  return { stationId, slotDate: date, queue, total: queue.length };
}

// ============================================================
// SLOT WATCHER — Pantau slot yang baru tersedia dan notifikasi user pertama di antrian
// ============================================================
function startSlotWatcher(redis) {
  const interval = 30 * 1000; // setiap 30 detik

  setInterval(async () => {
    try {
      // Ambil semua antrian yang aktif
      const keys = await redis.keys('queue:*');
      for (const key of keys) {
        const parts     = key.split(':'); // queue:stationId:date
        const stationId = parts[1];
        const slotDate  = parts[2];

        if (!stationId || !slotDate) continue;

        const queueSize = await redis.zcard(key);
        if (queueSize === 0) continue;

        // Cek apakah ada slot tersedia di stasiun ini
        let hasAvailableSlot = false;
        try {
          const { data } = await axios.get(`${STATION_SERVICE}/stations/${stationId}/slots?date=${slotDate}`);
          hasAvailableSlot = data.chargers?.some(c => c.slots?.some(s => s.status === 'AVAILABLE'));
        } catch { continue; }

        if (hasAvailableSlot) {
          // Notifikasi user pertama di antrian
          const firstEntries = await redis.zrangebyscore(key, '-inf', '+inf', 'LIMIT', 0, 1);
          if (firstEntries.length > 0) {
            const userId = firstEntries[0];
            const detail = await redis.hgetall(detailKey(userId));

            await getPublisher()('queue', 'queue.slot.available', {
              userId,
              stationId,
              slotDate,
              userPhone: detail?.phone || null
            });

            logger.info(`Notified user ${userId} of available slot at station ${stationId}`);
          }
        }
      }
    } catch (err) {
      logger.error(`Slot watcher error: ${err.message}`);
    }
  }, interval);

  logger.info('Queue slot watcher started (interval: 30s)');
}

module.exports = { joinQueue, leaveQueue, getPosition, getStationQueue, startSlotWatcher };
