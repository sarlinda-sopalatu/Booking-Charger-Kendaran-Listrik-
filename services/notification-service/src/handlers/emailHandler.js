'use strict';

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

sgMail.setApiKey(process.env.SENDGRID_API_KEY || 'SG.dev-key');

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@ev-charging.id';
const FROM_NAME  = process.env.SENDGRID_FROM_NAME  || 'EV Charging System';

// Simple HTML templates (dalam production gunakan Handlebars/mjml)
const templates = {
  'booking-created': (data) => `
    <h2>Booking Berhasil Dibuat!</h2>
    <p>Halo ${data.userName},</p>
    <p>Booking Anda telah berhasil dibuat dengan detail berikut:</p>
    <table>
      <tr><td><b>ID Booking</b></td><td>${data.bookingId?.slice(0, 8).toUpperCase()}</td></tr>
      <tr><td><b>Stasiun</b></td><td>${data.stationName}</td></tr>
      <tr><td><b>Tipe Charger</b></td><td>${data.chargerType}</td></tr>
      <tr><td><b>Tanggal</b></td><td>${data.slotDate}</td></tr>
      <tr><td><b>Waktu</b></td><td>${data.startTime} - ${data.endTime}</td></tr>
      <tr><td><b>Estimasi Biaya</b></td><td>Rp ${data.estimatedAmount?.toLocaleString('id-ID')}</td></tr>
    </table>
    <p><b>Selesaikan pembayaran sebelum ${new Date(data.expiresAt).toLocaleString('id-ID')}.</b></p>
    <p>Terima kasih telah menggunakan EV Charging System!</p>
  `,
  'payment-completed': (data) => `
    <h2>Pembayaran Berhasil!</h2>
    <p>Invoice: <b>${data.invoiceNumber}</b></p>
    <p>Jumlah: <b>Rp ${data.amount?.toLocaleString('id-ID')}</b></p>
    <p>Booking Anda telah dikonfirmasi. Selamat mengisi daya!</p>
  `,
  'booking-cancelled': (data) => `
    <h2>Booking Dibatalkan</h2>
    <p>Booking #${data.bookingId?.slice(0, 8).toUpperCase()} telah dibatalkan.</p>
    <p>Jika Anda sudah melakukan pembayaran, refund akan diproses dalam 3-7 hari kerja.</p>
  `,
  'session-ended': (data) => `
    <h2>Pengisian Daya Selesai!</h2>
    <p>Total energi: <b>${data.energyTotal?.toFixed(2)} kWh</b></p>
    <p>Terima kasih telah menggunakan EV Charging System. Selamat berkendara!</p>
  `,
  'charger-alert': (data) => `
    <h2>[ALERT] ${data.type}</h2>
    <p>Charger: ${data.chargerId}</p>
    <p>Nilai: ${data.value} (threshold: ${data.threshold})</p>
    <p>Waktu: ${new Date().toLocaleString('id-ID')}</p>
  `,
  'payment-failed': (data) => `
    <h2>Pembayaran Gagal</h2>
    <p>Mohon maaf, pembayaran Anda gagal diproses.</p>
    <p>Alasan: ${data.reason || 'Tidak diketahui'}</p>
    <p>Silakan coba lagi atau hubungi customer service kami.</p>
  `,
  'booking-confirmed': (data) => `
    <h2>Booking Dikonfirmasi!</h2>
    <p>Halo ${data.userName || ''},</p>
    <p>Pembayaran diterima dan booking Anda telah dikonfirmasi.</p>
    <p>Silakan datang ke stasiun sesuai jadwal yang sudah dipesan. Selamat mengisi daya!</p>
  `
};

async function sendEmail({ to, subject, template, data }) {
  if (!to) {
    logger.warn(`Email skipped: no recipient for template ${template}`);
    return;
  }

  const html = templates[template] ? templates[template](data) : `<p>${subject}</p>`;

  try {
    await sgMail.send({
      to,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      html
    });
    logger.info(`Email sent: ${template} → ${to}`);
  } catch (err) {
    logger.error(`Email failed (${template} → ${to}): ${err.message}`);
    throw err;
  }
}

module.exports = { sendEmail };
