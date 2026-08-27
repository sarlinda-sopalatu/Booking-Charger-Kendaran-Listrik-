'use strict';

const amqplib = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

let channel = null;

const EXCHANGES = ['session', 'charger', 'booking'];

async function connectRabbitMQ() {
  const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672/ev_vhost';

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const conn = await amqplib.connect(url);
      channel = await conn.createChannel();

      for (const ex of EXCHANGES) {
        await channel.assertExchange(ex, 'topic', { durable: true });
      }

      conn.on('error', (err) => { logger.error(`Session publisher conn error: ${err.message}`); channel = null; });
      conn.on('close', () => {
        logger.warn('Session publisher disconnected. Reconnecting...');
        channel = null;
        setTimeout(() => connectRabbitMQ(), 5000);
      });

      logger.info('Session publisher connected to RabbitMQ');
      return;
    } catch (err) {
      logger.warn(`Session publisher attempt ${attempt} failed: ${err.message}. Retry in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  logger.error('Session publisher: could not connect after 10 attempts');
}

async function publishEvent(exchange, routingKey, data) {
  if (!channel) {
    logger.warn(`RabbitMQ not connected, event ${routingKey} dropped`);
    return;
  }

  const message = {
    eventId:   uuidv4(),
    eventType: routingKey,
    timestamp: new Date().toISOString(),
    version:   '1.0',
    source:    'session-service',
    data
  };

  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    persistent:  true,
    contentType: 'application/json',
    messageId:   message.eventId
  });

  logger.info(`Event published: ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishEvent };
