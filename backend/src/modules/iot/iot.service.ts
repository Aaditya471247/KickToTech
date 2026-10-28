import { CropStage, Farm, SensorStatus, SensorType } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { emitToFarm } from '../../config/socket';
import { publishValveCommand } from '../../config/mqtt';
import { HttpError } from '../../lib/http';
import { assertFarmOwner, SENSOR_POSITION_M } from '../farms/farm.service';

/**
 * Valve thresholds (soil moisture, % volumetric).
 *  - OPEN_BELOW: in AUTO mode the drip valve opens when the row average drops under this.
 *  - FIELD_CAPACITY: when the END (10 m) sensor reaches this, the valve shuts off automatically.
 *    The end of the row is the last place water arrives, so it is the right signal that the whole row is wet.
 */
export const THRESHOLDS = { OPEN_BELOW: 25, FIELD_CAPACITY: 65 } as const;

const STALE_MS = 15 * 60 * 1000; // ignore readings older than this when making valve decisions
const LOW_BATTERY = 15;

export interface TelemetryInput {
  sensorId: string;
  moisture: number;
  temperature: number;
  batteryLevel?: number;
  signalQuality?: number;
}

export interface SensorReading {
  sensorId: string;
  sensorType: SensorType;
  positionM: number;
  status: SensorStatus;
  batteryLevel: number;
  signalQuality: number;
  moisture: number | null;
  temperature: number | null;
  timestamp: string | null;
}

const valveState = (f: Pick<Farm, 'valveOpen' | 'valveMode' | 'valveOpenedAt'>) => ({
  valveOpen: f.valveOpen,
  valveMode: f.valveMode,
  valveOpenedAt: f.valveOpenedAt,
});

/** Latest reading per sensor, ordered along the row (0 m, 5 m, 10 m). */
export async function getLatestReadings(farmId: string): Promise<SensorReading[]> {
  const sensors = await prisma.sensor.findMany({
    where: { farmId },
    include: { telemetry: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });
  return sensors
    .map((s) => {
      const t = s.telemetry[0];
      return {
        sensorId: s.id,
        sensorType: s.sensorType,
        positionM: SENSOR_POSITION_M[s.sensorType],
        status: s.status,
        batteryLevel: s.batteryLevel,
        signalQuality: s.signalQuality,
        moisture: t?.moisture ?? null,
        temperature: t?.temperature ?? null,
        timestamp: t ? t.timestamp.toISOString() : null,
      };
    })
    .sort((a, b) => a.positionM - b.positionM);
}

/** Entry point for HTTP and MQTT: store the reading, broadcast it, then run the valve rules. */
export async function ingestTelemetry(input: TelemetryInput) {
  const sensor = await prisma.sensor.findUnique({ where: { id: input.sensorId } });
  if (!sensor) throw new HttpError(404, 'Unknown sensor');

  const now = new Date();
  const battery = input.batteryLevel ?? sensor.batteryLevel;
  await prisma.$transaction([
    prisma.telemetry.create({ data: { sensorId: sensor.id, moisture: input.moisture, temperature: input.temperature, timestamp: now } }),
    prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        batteryLevel: battery,
        signalQuality: input.signalQuality ?? sensor.signalQuality,
        status: battery < LOW_BATTERY ? 'LOW_BATTERY' : 'ONLINE',
        lastSeenAt: now,
      },
    }),
  ]);

  emitToFarm(sensor.farmId, 'telemetry', {
    farmId: sensor.farmId,
    sensorId: sensor.id,
    sensorType: sensor.sensorType,
    moisture: input.moisture,
    temperature: input.temperature,
    batteryLevel: battery,
    signalQuality: input.signalQuality ?? sensor.signalQuality,
    timestamp: now.toISOString(),
  });

  const decision = await evaluateValve(sensor.farmId);
  return { stored: true, valve: decision };
}

/**
 * Core auto-valve logic, run after every reading.
 *  1. Safety (always, even in MANUAL mode): shut off when END (10 m) hits field capacity, or the run exceeds the failsafe timer.
 *  2. AUTO mode only: open when average moisture < OPEN_BELOW (and the end of the row is not already full).
 */
export async function evaluateValve(farmId: string): Promise<{ action: 'OPENED' | 'CLOSED' | 'NONE'; reason?: string }> {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) return { action: 'NONE' };

  const readings = (await getLatestReadings(farmId)).filter(
    (r) => r.moisture !== null && r.timestamp && Date.now() - new Date(r.timestamp).getTime() < STALE_MS,
  );
  const end = readings.find((r) => r.sensorType === 'END_10M');
  const endFull = !!end && (end.moisture as number) >= THRESHOLDS.FIELD_CAPACITY;

  if (farm.valveOpen) {
    if (endFull) {
      const reason = `AUTO SHUTOFF: End (10 m) sensor reached field capacity (${THRESHOLDS.FIELD_CAPACITY}%)`;
      await setValve(farmId, false, reason);
      return { action: 'CLOSED', reason };
    }
    const minutes = farm.valveOpenedAt ? (Date.now() - farm.valveOpenedAt.getTime()) / 60000 : 0;
    if (minutes >= env.MAX_VALVE_RUN_MINUTES) {
      const reason = `SAFETY TIMEOUT: valve ran for ${env.MAX_VALVE_RUN_MINUTES} minutes`;
      await setValve(farmId, false, reason);
      return { action: 'CLOSED', reason };
    }
    return { action: 'NONE' };
  }

  if (farm.valveMode === 'AUTO' && readings.length > 0 && !endFull) {
    const avg = readings.reduce((sum, r) => sum + (r.moisture as number), 0) / readings.length;
    if (avg < THRESHOLDS.OPEN_BELOW) {
      const reason = `AUTO OPEN: average soil moisture ${avg.toFixed(1)}% fell below ${THRESHOLDS.OPEN_BELOW}%`;
      await setValve(farmId, true, reason);
      return { action: 'OPENED', reason };
    }
  }
  return { action: 'NONE' };
}

/**
 * Opens/closes the valve, logs the event, and on close credits the litres delivered
 * (minutes open x flow rate) to the farm's active crop portfolios for the water audit.
 */
async function setValve(farmId: string, open: boolean, reason: string): Promise<Farm> {
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
  if (farm.valveOpen === open) return farm;

  let litres: number | null = null;
  if (!open && farm.valveOpenedAt) {
    const minutes = (Date.now() - farm.valveOpenedAt.getTime()) / 60000;
    litres = Math.round(minutes * farm.flowRateLpm * 10) / 10;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const f = await tx.farm.update({ where: { id: farmId }, data: { valveOpen: open, valveOpenedAt: open ? new Date() : null } });
    await tx.valveEvent.create({ data: { farmId, action: open ? 'OPEN' : 'CLOSE', reason, litres } });
    if (litres && litres > 0) {
      const where = { farmId, status: { not: CropStage.HARVEST } };
      const active = await tx.cropPortfolio.count({ where });
      if (active > 0) await tx.cropPortfolio.updateMany({ where, data: { totalWaterUsed: { increment: litres / active } } });
    }
    return f;
  });

  emitToFarm(farmId, 'valve', { ...valveState(updated), reason, litres, at: new Date().toISOString() });
  publishValveCommand(farmId, open ? 'OPEN' : 'CLOSE'); // no-op unless MQTT is configured
  return updated;
}

/** Manual control from the app. OPEN/CLOSE switch to MANUAL mode; AUTO hands control back to the rules. */
export async function controlValve(userId: string, farmId: string, action: 'OPEN' | 'CLOSE' | 'AUTO') {
  await assertFarmOwner(userId, farmId);
  if (action === 'AUTO') {
    await prisma.farm.update({ where: { id: farmId }, data: { valveMode: 'AUTO' } });
    await evaluateValve(farmId);
  } else {
    await prisma.farm.update({ where: { id: farmId }, data: { valveMode: 'MANUAL' } });
    await setValve(farmId, action === 'OPEN', `Manual ${action === 'OPEN' ? 'open' : 'close'} from the app`);
  }
  const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
  emitToFarm(farmId, 'valve', { ...valveState(farm), reason: action === 'AUTO' ? 'Switched to automatic mode' : null, litres: null, at: new Date().toISOString() });
  return valveState(farm);
}

/** Latest telemetry for the three nodes plus the valve state, for the dashboard. */
export async function getSensorSnapshot(userId: string, farmId: string) {
  const farm = await assertFarmOwner(userId, farmId);
  return {
    farm: { id: farm.id, name: farm.name, flowRateLpm: farm.flowRateLpm, ...valveState(farm) },
    thresholds: THRESHOLDS,
    sensors: await getLatestReadings(farmId),
  };
}

/** Time series for the live chart, bucketed to 10 s so the three sensors line up on one x value. */
export async function getHistory(userId: string, farmId: string, minutes: number) {
  await assertFarmOwner(userId, farmId);
  const since = new Date(Date.now() - minutes * 60000);
  const rows = await prisma.telemetry.findMany({
    where: { timestamp: { gte: since }, sensor: { farmId } },
    include: { sensor: { select: { sensorType: true } } },
    orderBy: { timestamp: 'asc' },
    take: 3000,
  });
  const buckets = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const t = Math.floor(r.timestamp.getTime() / 10000) * 10000;
    const b = buckets.get(t) ?? { t };
    b[r.sensor.sensorType] = r.moisture;
    buckets.set(t, b);
  }
  return [...buckets.values()];
}

export async function getValveEvents(userId: string, farmId: string) {
  await assertFarmOwner(userId, farmId);
  return prisma.valveEvent.findMany({ where: { farmId }, orderBy: { createdAt: 'desc' }, take: 10 });
}
