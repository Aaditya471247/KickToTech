/**
 * Field hardware simulator. Pretends to be the three sensor nodes of one 10 m crop row and posts readings
 * to the real HTTP ingest endpoint every few seconds.  Run:  npm run simulate  [-- <farmId>]
 *
 * Physics (simplified, accelerated so you can watch a full cycle in a few minutes):
 *  - Soil dries a little every tick.
 *  - While the valve is open, water arrives first at 0 m and last at 10 m, so END rises slowest.
 */
import 'dotenv/config';
import { prisma } from './config/database';
import { env } from './config/env';

const API = `http://localhost:${env.PORT}/api/v1/iot/telemetry`;
const TICK_MS = Number(process.env.SIM_TICK_MS ?? 3000);
const DRY_PER_TICK = 1.0;
const WET_PER_TICK: Record<string, number> = { START_0M: 2.6, MID_5M: 1.8, END_10M: 1.1 };
const START_MOISTURE: Record<string, number> = { START_0M: 33, MID_5M: 30, END_10M: 27 };

async function main() {
  const farmId = process.argv[2];
  const farm = await prisma.farm.findFirst({ where: farmId ? { id: farmId } : {}, include: { sensors: true }, orderBy: { createdAt: 'asc' } });
  if (!farm) throw new Error('No farm found. Run the seed or register a user first.');
  console.log(`Simulating ${farm.sensors.length} sensors for "${farm.name}" every ${TICK_MS / 1000}s. Ctrl+C to stop.`);

  const moisture: Record<string, number> = {};
  const battery: Record<string, number> = {};
  for (const s of farm.sensors) {
    moisture[s.id] = START_MOISTURE[s.sensorType];
    battery[s.id] = s.batteryLevel;
  }

  setInterval(async () => {
    const { valveOpen } = await prisma.farm.findUniqueOrThrow({ where: { id: farm.id }, select: { valveOpen: true } });
    for (const s of farm.sensors) {
      const noise = (Math.random() - 0.5) * 0.4;
      moisture[s.id] = Math.min(95, Math.max(5, moisture[s.id] + (valveOpen ? WET_PER_TICK[s.sensorType] : -DRY_PER_TICK) + noise));
      battery[s.id] = Math.max(1, battery[s.id] - 0.01);
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-key': env.DEVICE_API_KEY },
        body: JSON.stringify({
          sensorId: s.id,
          moisture: Number(moisture[s.id].toFixed(1)),
          temperature: Number((27 + Math.random() * 3).toFixed(1)),
          batteryLevel: Number(battery[s.id].toFixed(1)),
          signalQuality: Math.round(70 + Math.random() * 25),
        }),
      }).catch((e) => ({ ok: false, status: 0, statusText: (e as Error).message }));
      if (!res.ok) console.error(`POST failed for ${s.sensorType}: ${res.status} ${res.statusText}`);
    }
    console.log(`valve ${valveOpen ? 'OPEN ' : 'closed'} | ` + farm.sensors.map((s) => `${s.sensorType} ${moisture[s.id].toFixed(1)}%`).join('  '));
  }, TICK_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
