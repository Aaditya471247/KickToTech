import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import * as service from './iot.service';

export const telemetrySchema = z.object({
  sensorId: z.string().min(1),
  moisture: z.coerce.number().min(0).max(100),
  temperature: z.coerce.number().min(-20).max(80),
  batteryLevel: z.coerce.number().min(0).max(100).optional(),
  signalQuality: z.coerce.number().min(0).max(100).optional(),
});

const valveSchema = z.object({
  farmId: z.string().min(1),
  action: z.enum(['OPEN', 'CLOSE', 'AUTO']),
});

/** POST /iot/telemetry (device key) */
export const postTelemetry = asyncHandler(async (req, res) => ok(res, await service.ingestTelemetry(telemetrySchema.parse(req.body)), 201));

/** GET /iot/sensors/:farmId */
export const getSensors = asyncHandler(async (req, res) => ok(res, await service.getSensorSnapshot(req.user!.id, req.params.farmId)));

/** POST /iot/valve/control */
export const controlValve = asyncHandler(async (req, res) => {
  const { farmId, action } = valveSchema.parse(req.body);
  ok(res, await service.controlValve(req.user!.id, farmId, action));
});

/** GET /iot/history/:farmId?minutes=30 */
export const getHistory = asyncHandler(async (req, res) => {
  const minutes = z.coerce.number().int().min(5).max(1440).default(30).parse(req.query.minutes ?? 30);
  ok(res, await service.getHistory(req.user!.id, req.params.farmId, minutes));
});

/** GET /iot/events/:farmId */
export const getEvents = asyncHandler(async (req, res) => ok(res, await service.getValveEvents(req.user!.id, req.params.farmId)));
