import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { initSocket } from './config/socket';
import { closeMqtt, initMqtt } from './config/mqtt';
import { telemetrySchema } from './modules/iot/iot.controller';
import { ingestTelemetry } from './modules/iot/iot.service';

/**
 * Architecture:  sensors --HTTP or MQTT--> iot.service (store, valve rules) --Socket.io--> React dashboard
 *                                                                  \--MQTT command--> valve relay
 */
const server = http.createServer(createApp());
initSocket(server);
initMqtt((payload) => ingestTelemetry(telemetrySchema.parse(payload)));

server.listen(env.PORT, () => console.log(`JalMitra API listening on http://localhost:${env.PORT}/api/v1`));

async function shutdown() {
  console.log('Shutting down...');
  closeMqtt();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
