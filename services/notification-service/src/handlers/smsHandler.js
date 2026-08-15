'use strict';

const twilio = require('twilio');
const logger = require('../utils/logger');

const client      = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || '+628000000000';

async function sendSMS({ to, message }) {
  if (!to) {
    logger.warn('SMS skipped: no phone number provided');
    return;
  }

  try {
    if (process.env.NODE_ENV !== 'production') {
      // Development mode: hanya log, tidak kirim SMS asli
      logger.info(`[DEV] SMS to ${to}: ${message}`);
      return;
    }

    await client.messages.create({ body: message, from: FROM_NUMBER, to });
    logger.info(`SMS sent to ${to}`);
  } catch (err) {
    logger.error(`SMS failed (to ${to}): ${err.message}`);
    // Jangan throw — SMS gagal tidak boleh menghentikan proses
  }
}

module.exports = { sendSMS };
