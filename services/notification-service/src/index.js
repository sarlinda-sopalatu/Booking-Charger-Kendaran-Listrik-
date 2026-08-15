'use strict';

require('dotenv').config();
const express = require('express');
const amqplib = require('amqplib');
const logger = require('./utils/logger');
const { handleEvent } = require('./handlers/eventHandler');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() })
);

// ============================================================
// RabbitMQ Consumer Setup
// ============================================================
const QUEUES = [
  { name: 'notif.booking',   exchange: 'booking',   pattern: 'booking.*' },
  { name: 'notif.payment',   exchange: 'payment',   pattern: 'payment.*' },
  { name: 'notif.charger',   exchange: 'charger',   pattern: 'charger.*' },
  { name: 'notif.queue',     exchange: 'queue',     pattern: 'queue.slot.available' }
];

async function startConsumer() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn    = await amqplib.connect(url);
      const channel = await conn.createChannel();

      channel.prefetch(10);

      for (const { name, exchange, pattern } of QUEUES) {
        await channel.assertExchange(exchange, 'topic', { durable: true });
        const q = await channel.assertQueue(name, {
          durable: true,
          deadLetterExchange: `${name}.dlx`,
          messageTtl: 86400000 // 24 jam
        });
        await channel.bindQueue(q.queue, exchange, pattern);

        channel.consume(q.queue, async (msg) => {
          if (!msg) return;
          try {
            const event = JSON.parse(msg.content.toString());
            await handleEvent(event);
            channel.ack(msg);
          } catch (err) {
            logger.error(`Failed to process event: ${err.message}`);
            channel.nack(msg, false, false); // Masuk DLQ
          }
        });
      }

      conn.on('error', (err) => { logger.error(`RabbitMQ error: ${err.message}`); });
      conn.on('close', () => { logger.warn('RabbitMQ closed, reconnecting...'); setTimeout(startConsumer, 5000); });

      logger.info('Notification Service connected to RabbitMQ, consuming all event queues');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ connect attempt ${attempt} failed. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

app.listen(PORT, () => logger.info(`Notification Service running on port ${PORT}`));
startConsumer().catch((err) => logger.error(`Consumer failed: ${err.message}`));
module.exports = app;
