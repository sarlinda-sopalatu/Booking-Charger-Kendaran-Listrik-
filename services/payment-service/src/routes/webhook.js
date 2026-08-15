'use strict';

const crypto = require('crypto');
const express = require('express');
const { Payment, Invoice } = require('../models/Payment');
const { publishEvent } = require('../messaging/publisher');
const logger = require('../utils/logger');

const router = express.Router();

// POST /webhook/midtrans — Terima callback dari Midtrans
router.post('/midtrans', async (req, res) => {
  try {
    const body       = JSON.parse(req.body.toString());
    const serverKey  = process.env.MIDTRANS_SERVER_KEY || '';
    const signatureKey = crypto
      .createHash('sha512')
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
      .digest('hex');

    // Verifikasi signature
    if (signatureKey !== body.signature_key) {
      logger.warn('Midtrans webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const externalRef = body.order_id;
    const payment = await Payment.findOne({ where: { external_ref: externalRef } });

    if (!payment) {
      logger.warn(`Midtrans webhook: payment not found for ${externalRef}`);
      return res.status(200).json({ status: 'ignored' }); // Return 200 agar Midtrans tidak retry
    }

    const transactionStatus = body.transaction_status;
    const fraudStatus       = body.fraud_status;

    let newStatus = payment.status;

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        newStatus = 'COMPLETED';
      }
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      newStatus = 'FAILED';
    } else if (transactionStatus === 'refund') {
      newStatus = 'REFUNDED';
    }

    if (newStatus !== payment.status) {
      await payment.update({
        status:       newStatus,
        completed_at: newStatus === 'COMPLETED' ? new Date() : null
      });

      if (newStatus === 'COMPLETED') {
        // Generate invoice
        const invoiceNumber = `INV-${Date.now()}-${payment.id.slice(0, 8).toUpperCase()}`;
        await Invoice.create({
          payment_id:     payment.id,
          invoice_number: invoiceNumber,
          items: [{
            description: 'Layanan Pengisian Daya Kendaraan Listrik',
            quantity: 1,
            unit_price: payment.amount_idr,
            total: payment.amount_idr
          }],
          subtotal_idr: payment.amount_idr,
          tax_idr:      Math.round(payment.amount_idr * 0.11), // PPN 11%
          total_idr:    Math.round(payment.amount_idr * 1.11),
          issued_at:    new Date()
        });

        await publishEvent('payment', 'payment.completed', {
          paymentId:  payment.id,
          bookingId:  payment.booking_id,
          userId:     payment.user_id,
          amount:     payment.amount_idr,
          invoiceNumber
        });

      } else if (newStatus === 'FAILED') {
        await publishEvent('payment', 'payment.failed', {
          paymentId: payment.id,
          bookingId: payment.booking_id,
          userId:    payment.user_id,
          reason:    transactionStatus
        });
      }

      logger.info(`Payment ${payment.id} status → ${newStatus}`);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    logger.error(`Webhook error: ${err.message}`);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
