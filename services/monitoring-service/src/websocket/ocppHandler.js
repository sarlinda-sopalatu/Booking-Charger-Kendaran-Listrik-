'use strict';

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { ChargerReading, ChargingSession } = require('../models/ChargerReading');
const { broadcastReading, broadcastSessionEnded } = require('./socketHub');
const { publishEvent } = require('../messaging/publisher');

const ALERT_TEMP_THRESHOLD = parseFloat(process.env.ALERT_TEMP_THRESHOLD || '60');
const ALERT_VOLTAGE_MIN    = parseFloat(process.env.ALERT_VOLTAGE_MIN    || '200');

// Map: chargePointId → { ws, chargerId, sessionId, bookingId }
const connectedChargers = new Map();

/**
 * OCPP WebSocket Server — menerima koneksi dari hardware charger
 * Hardware connect ke ws://monitoring-service:3006/ocpp
 */
function startOCPPServer(io, redis) {
  const wss = new WebSocket.Server({ noServer: true, path: '/ocpp' });

  wss.on('connection', (ws, req) => {
    // Extract charge point ID dari URL: /ocpp/{chargePointId}
    const urlParts    = req.url?.split('/') || [];
    const chargePointId = urlParts[urlParts.length - 1] || uuidv4();

    logger.info(`OCPP: Charger connected — ${chargePointId}`);
    connectedChargers.set(chargePointId, { ws, sessionId: null, bookingId: null });

    // Kirim BootNotification accepted
    sendOCPP(ws, 'BootNotification', { status: 'Accepted', currentTime: new Date().toISOString(), heartbeatInterval: 60 });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // OCPP format: [messageType, uniqueId, action, payload]
        const [msgType, msgId, action, payload] = msg;

        if (msgType !== 2) return; // Hanya proses Call messages

        switch (action) {
          case 'Heartbeat':
            sendOCPP(ws, 'Heartbeat', { currentTime: new Date().toISOString() }, msgId);
            break;

          case 'StatusNotification':
            await handleStatusNotification(chargePointId, payload, io);
            sendOCPP(ws, 'StatusNotification', {}, msgId);
            break;

          case 'StartTransaction':
            await handleStartTransaction(chargePointId, payload, io, redis);
            sendOCPP(ws, 'StartTransaction', { transactionId: Date.now(), idTagInfo: { status: 'Accepted' } }, msgId);
            break;

          case 'MeterValues':
            await handleMeterValues(chargePointId, payload, io, redis);
            sendOCPP(ws, 'MeterValues', {}, msgId);
            break;

          case 'StopTransaction':
            await handleStopTransaction(chargePointId, payload, io, redis);
            sendOCPP(ws, 'StopTransaction', { idTagInfo: { status: 'Accepted' } }, msgId);
            break;

          default:
            logger.warn(`OCPP: Unknown action ${action}`);
        }
      } catch (err) {
        logger.error(`OCPP message error: ${err.message}`);
      }
    });

    ws.on('close', () => {
      logger.info(`OCPP: Charger disconnected — ${chargePointId}`);
      connectedChargers.delete(chargePointId);
    });

    ws.on('error', (err) => {
      logger.error(`OCPP WS error for ${chargePointId}: ${err.message}`);
    });
  });

  logger.info('OCPP WebSocket server started on /ocpp');
  return wss;
}

// ---- OCPP Handlers ----

async function handleStatusNotification(chargePointId, payload, io) {
  const status = payload.status; // Available, Charging, Faulted, etc.
  logger.info(`OCPP: ${chargePointId} status → ${status}`);
  io.to(`charger:${chargePointId}`).emit('status', { chargerId: chargePointId, status });
}

async function handleStartTransaction(chargePointId, payload, io, redis) {
  const sessionId = uuidv4();
  const charger   = connectedChargers.get(chargePointId);
  if (charger) charger.sessionId = sessionId;

  await ChargingSession.create({
    session_id: sessionId,
    charger_id: chargePointId,
    booking_id: payload.idTag || 'UNKNOWN', // idTag dipakai sebagai booking ID
    user_id:    'UNKNOWN',
    status:     'ACTIVE',
    start_time: new Date(payload.timestamp || Date.now())
  });

  logger.info(`OCPP: Session started — ${sessionId} on charger ${chargePointId}`);
}

async function handleMeterValues(chargePointId, payload, io, redis) {
  const charger    = connectedChargers.get(chargePointId);
  const meterValue = payload.meterValue?.[0] || {};
  const samples    = meterValue.sampledValue || [];

  const getValue = (measurand) => {
    const s = samples.find(sv => sv.measurand === measurand);
    return s ? parseFloat(s.value) || 0 : 0;
  };

  const reading = {
    power_kw:        getValue('Power.Active.Import') / 1000 || getValue('Power.Offered') / 1000,
    energy_kwh:      getValue('Energy.Active.Import.Register') / 1000,
    voltage_v:       getValue('Voltage'),
    current_a:       getValue('Current.Import'),
    state_of_charge: getValue('SoC'),
    temperature_c:   getValue('Temperature')
  };

  // Simpan ke MongoDB
  await ChargerReading.create({
    charger_id:       chargePointId,
    session_id:       charger?.sessionId,
    booking_id:       charger?.bookingId,
    timestamp:        new Date(meterValue.timestamp || Date.now()),
    ...reading
  });

  // Update Redis cache (latest state, expire 30 detik)
  await redis.setex(`charger:latest:${chargePointId}`, 30, JSON.stringify({
    chargerId:   chargePointId,
    ...reading,
    etaMinutes:  estimateETA(reading),
    updatedAt:   new Date().toISOString()
  }));

  // Broadcast ke frontend via Socket.io
  broadcastReading(io, chargePointId, { ...reading, etaMinutes: estimateETA(reading) });

  // Alert engine
  await checkAlerts(chargePointId, reading, io);
}

async function handleStopTransaction(chargePointId, payload, io, redis) {
  const charger    = connectedChargers.get(chargePointId);
  const sessionId  = charger?.sessionId;
  const energyTotal = (payload.meterStop || 0) / 1000; // Wh → kWh
  const duration   = 0; // Hitung dari session start

  if (sessionId) {
    const session = await ChargingSession.findOneAndUpdate(
      { session_id: sessionId },
      {
        status:           'COMPLETED',
        end_time:         new Date(),
        energy_total_kwh: energyTotal,
        stop_reason:      payload.reason || 'Unknown'
      },
      { new: true }
    );

    // Publish session ended event
    await publishEvent('charger', 'charger.session.ended', {
      chargerId:    chargePointId,
      sessionId,
      bookingId:    session?.booking_id || charger?.bookingId,
      energyTotal,
      duration:     duration,
      stopReason:   payload.reason
    });

    // Broadcast ke frontend
    broadcastSessionEnded(io, chargePointId, {
      sessionId,
      energyUsedKwh: energyTotal,
      stopReason:    payload.reason
    });
  }

  await redis.del(`charger:latest:${chargePointId}`);
  if (charger) charger.sessionId = null;

  logger.info(`OCPP: Session ended on charger ${chargePointId}`);
}

// ---- Helpers ----

function estimateETA(reading) {
  if (!reading.state_of_charge || reading.state_of_charge >= 100) return 0;
  if (!reading.power_kw || reading.power_kw <= 0) return null;
  // Asumsi baterai 60 kWh (bisa dikonfigurasi)
  const batteryCapacity = 60;
  const remainingKwh = batteryCapacity * (1 - reading.state_of_charge / 100);
  return Math.round((remainingKwh / reading.power_kw) * 60);
}

async function checkAlerts(chargePointId, reading, io) {
  if (reading.temperature_c > ALERT_TEMP_THRESHOLD) {
    logger.warn(`ALERT: Overheat on charger ${chargePointId}: ${reading.temperature_c}°C`);
    io.to(`charger:${chargePointId}`).emit('alert', {
      type: 'OVERHEAT', value: reading.temperature_c, threshold: ALERT_TEMP_THRESHOLD, chargerId: chargePointId
    });
    await publishEvent('charger', 'charger.alert', {
      chargerId: chargePointId, type: 'OVERHEAT', value: reading.temperature_c
    });
  }

  if (reading.voltage_v > 0 && reading.voltage_v < ALERT_VOLTAGE_MIN) {
    logger.warn(`ALERT: Low voltage on charger ${chargePointId}: ${reading.voltage_v}V`);
    io.to(`charger:${chargePointId}`).emit('alert', {
      type: 'LOW_VOLTAGE', value: reading.voltage_v, threshold: ALERT_VOLTAGE_MIN, chargerId: chargePointId
    });
  }
}

function sendOCPP(ws, action, payload, msgId = uuidv4()) {
  const msg = JSON.stringify([3, msgId, payload]); // [CallResult, uniqueId, payload]
  if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

module.exports = { startOCPPServer, connectedChargers };
