'use strict';

const logger = require('../utils/logger');
const { sendEmail } = require('./emailHandler');
const { sendSMS }   = require('./smsHandler');

/**
 * Route event ke handler yang sesuai
 */
async function handleEvent(event) {
  logger.info(`Processing event: ${event.eventType}`, { eventId: event.eventId });

  switch (event.eventType) {

    // ---- BOOKING EVENTS ----
    case 'booking.created':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: `Konfirmasi Booking #${event.data.bookingId.slice(0, 8).toUpperCase()}`,
          template: 'booking-created',
          data:    event.data
        }),
        sendSMS({
          to:      event.data.userPhone,
          message: `[EV Charging] Booking Anda berhasil dibuat untuk slot ${event.data.slotDate} ${event.data.startTime}-${event.data.endTime} di ${event.data.stationName}. Selesaikan pembayaran sebelum ${new Date(event.data.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`
        })
      ]);
      break;

    case 'booking.cancelled':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: `Booking Dibatalkan #${event.data.bookingId?.slice(0, 8).toUpperCase()}`,
          template: 'booking-cancelled',
          data:    event.data
        })
      ]);
      break;

    case 'booking.confirmed':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: `Booking Dikonfirmasi — Siap Mengisi Daya!`,
          template: 'booking-confirmed',
          data:    event.data
        }),
        sendSMS({
          to:      event.data.userPhone,
          message: `[EV Charging] Pembayaran diterima! Booking Anda dikonfirmasi. Datangi stasiun sesuai jadwal.`
        })
      ]);
      break;

    // ---- PAYMENT EVENTS ----
    case 'payment.completed':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: `Pembayaran Berhasil — Invoice #${event.data.invoiceNumber}`,
          template: 'payment-completed',
          data:    event.data
        }),
        sendSMS({
          to:      event.data.userPhone,
          message: `[EV Charging] Pembayaran berhasil! Invoice: ${event.data.invoiceNumber}. Selamat mengisi daya!`
        })
      ]);
      break;

    case 'payment.failed':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: 'Pembayaran Gagal — Mohon Coba Lagi',
          template: 'payment-failed',
          data:    event.data
        })
      ]);
      break;

    // ---- CHARGER EVENTS ----
    case 'charger.session.ended':
      await Promise.allSettled([
        sendEmail({
          to:      event.data.userEmail,
          subject: 'Pengisian Daya Selesai!',
          template: 'session-ended',
          data:    event.data
        }),
        sendSMS({
          to:      event.data.userPhone,
          message: `[EV Charging] Pengisian selesai! Energi: ${event.data.energyTotal?.toFixed(2)} kWh. Terima kasih!`
        })
      ]);
      break;

    case 'charger.alert':
      await sendEmail({
        to:      event.data.operatorEmail || process.env.SENDGRID_FROM_EMAIL,
        subject: `[ALERT] ${event.data.type} pada charger ${event.data.chargerId}`,
        template: 'charger-alert',
        data:    event.data
      });
      break;

    // ---- QUEUE EVENTS ----
    case 'queue.slot.available':
      await sendSMS({
        to:      event.data.userPhone,
        message: `[EV Charging] Giliran Anda! Slot tersedia di stasiun ${event.data.stationId}. Segera pesan sekarang, berlaku 15 menit.`
      });
      break;

    default:
      logger.warn(`Unhandled event type: ${event.eventType}`);
  }
}

module.exports = { handleEvent };
