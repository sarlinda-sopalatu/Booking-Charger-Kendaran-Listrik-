'use strict';

const amqplib = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

let channel = null;

const EXCHANGES = ['booking', 'payment', 'charger', 'queue'];

async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      channel = await conn.createChannel();

      // Deklarasikan semua exchange
      for (const ex of EXCHANGES) {
        await channel.assertExchange(ex, 'topic', { durable: true });
      }

      conn.on('error',  (err) => { logger.error(`RabbitMQ conn error: ${err.message}`); channel = null; });
      conn.on('close',  ()    => { logger.warn('RabbitMQ connection closed. Reconnecting...'); reconnect(); });

      logger.info('Connected to RabbitMQ');
      return;
    } catch (err) {
      logger.warn(`RabbitMQ connect attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Could not connect to RabbitMQ after 10 attempts');
}

async function reconnect() {
  channel = null;
  await new Promise(r => setTimeout(r, 5000));
  await connectRabbitMQ();
}

async function publishEvent(exchange, routingKey, data) {
  if (!channel) {
    logger.warn(`RabbitMQ not connected, event ${routingKey} dropped`);
    return;
  }

  const message = {
    eventId:       uuidv4(),
    eventType:     routingKey,
    timestamp:     new Date().toISOString(),
    version:       '1.0',
    source:        'booking-service',
    correlationId: uuidv4(),
    data
  };

  const content = Buffer.from(JSON.stringify(message));

  channel.publish(exchange, routingKey, content, {
    persistent:  true,
    contentType: 'application/json',
    messageId:   message.eventId
  });

  logger.info(`Event published: ${routingKey}`, { eventId: message.eventId });
}

module.exports = { connectRabbitMQ, publishEvent };
