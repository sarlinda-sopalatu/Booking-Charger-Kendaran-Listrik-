'use strict';

const express = require('express');
const Joi = require('joi');
const { Op } = require('sequelize');
const { Station, Charger, Slot } = require('../models/Station');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================================
// GET /stations — Cari stasiun (dengan filter lokasi & tipe)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 10, status = 'ACTIVE', connector_type, min_power_kw } = req.query;

    const where = {};
    if (status !== 'ALL') where.status = status;

    const chargerWhere = {};
    if (connector_type) chargerWhere.connector_type = connector_type;
    if (min_power_kw)   chargerWhere.max_power_kw = { [Op.gte]: parseFloat(min_power_kw) };

    const stations = await Station.findAll({
      where,
      include: [{
        model: Charger,
        as: 'chargers',
        where: Object.keys(chargerWhere).length ? chargerWhere : undefined,
        required: false
      }],
      limit: 50
    });

    // Hitung jarak jika koordinat diberikan
    let result = stations;
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      result = stations
        .map(s => {
          const dist = calcDistance(userLat, userLng, parseFloat(s.latitude), parseFloat(s.longitude));
          return { ...s.toJSON(), distance_km: Math.round(dist * 10) / 10 };
        })
        .filter(s => s.distance_km <= parseFloat(radius))
        .sort((a, b) => a.distance_km - b.distance_km);
    }

    return res.json({ stations: result, total: result.length });
  } catch (err) {
    logger.error(`Get stations error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /stations/:id — Detail stasiun
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const station = await Station.findByPk(req.params.id, {
      include: [{ model: Charger, as: 'chargers' }]
    });
    if (!station) return res.status(404).json({ error: 'Stasiun tidak ditemukan' });
    return res.json(station);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /stations/:id/slots — Slot per stasiun per tanggal
// ============================================================
router.get('/:id/slots', async (req, res) => {
  const { date, connector_type } = req.query;
  if (!date) return res.status(400).json({ error: 'Parameter date wajib diisi (YYYY-MM-DD)' });

  try {
    const station = await Station.findByPk(req.params.id);
    if (!station) return res.status(404).json({ error: 'Stasiun tidak ditemukan' });

    const chargerWhere = { station_id: req.params.id };
    if (connector_type) chargerWhere.connector_type = connector_type;

    const chargers = await Charger.findAll({
      where: chargerWhere,
      include: [{
        model: Slot,
        as: 'slots',
        where: { slot_date: date },
        required: false
      }]
    });

    return res.json({ date, station_id: req.params.id, chargers });
  } catch (err) {
    logger.error(`Get slots error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /stations — Tambah stasiun (OPERATOR/ADMIN only)
// ============================================================
const stationSchema = Joi.object({
  name:       Joi.string().min(3).required(),
  address:    Joi.string().required(),
  latitude:   Joi.number().min(-90).max(90).required(),
  longitude:  Joi.number().min(-180).max(180).required(),
  phone:      Joi.string().optional(),
  opening_hours: Joi.string().optional(),
  facilities: Joi.array().items(Joi.string()).optional()
});

router.post('/', async (req, res) => {
  if (!['OPERATOR', 'ADMIN'].includes(req.userRole)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { error, value } = stationSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const station = await Station.create({ ...value, operator_id: req.userId });
    return res.status(201).json(station);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Helper: Haversine formula untuk jarak (km)
// ============================================================
function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(d) { return d * Math.PI / 180; }

module.exports = router;
