'use strict';

// Internal routes — dipanggil service lain (Booking Service)
const express = require('express');
const { sequelize } = require('../db');
const { Slot, Charger, Station } = require('../models/Station');
const logger = require('../utils/logger');

const router = express.Router();

// PUT /internal/slots/:id/reserve — Reserve slot (atomic update)
router.put('/slots/:id/reserve', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const [rowsUpdated, [slot]] = await Slot.update(
      { status: 'RESERVED' },
      {
        where: { id: req.params.id, status: 'AVAILABLE' },
        returning: true,
        transaction: t
      }
    );

    if (rowsUpdated === 0) {
      await t.rollback();
      return res.status(409).json({ error: 'Slot tidak tersedia' });
    }

    await t.commit();
    logger.info(`Slot reserved: ${req.params.id}`);
    return res.json({ slot });
  } catch (err) {
    await t.rollback();
    logger.error(`Reserve slot error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

// PUT /internal/slots/:id/release — Release slot (setelah booking dibatalkan)
router.put('/slots/:id/release', async (req, res) => {
  try {
    await Slot.update(
      { status: 'AVAILABLE' },
      { where: { id: req.params.id, status: { $ne: 'OCCUPIED' } } }
    );
    logger.info(`Slot released: ${req.params.id}`);
    return res.json({ message: 'Slot dirilis' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /internal/slots/:id/occupy — Tandai slot sebagai sedang digunakan
router.put('/slots/:id/occupy', async (req, res) => {
  try {
    await Slot.update({ status: 'OCCUPIED' }, { where: { id: req.params.id } });
    return res.json({ message: 'Slot dioccupied' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /internal/slots/:id/complete — Selesai pengisian
router.put('/slots/:id/complete', async (req, res) => {
  try {
    await Slot.update({ status: 'AVAILABLE' }, { where: { id: req.params.id } });
    return res.json({ message: 'Slot kembali tersedia' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /internal/slots/:id — Cek ketersediaan slot
router.get('/slots/:id', async (req, res) => {
  try {
    const slot = await Slot.findByPk(req.params.id, {
      include: [{
        model: Charger,
        as: 'charger',
        include: [{ model: Station, as: 'station' }]
      }]
    });
    if (!slot) return res.status(404).json({ error: 'Slot tidak ditemukan' });
    return res.json(slot);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
