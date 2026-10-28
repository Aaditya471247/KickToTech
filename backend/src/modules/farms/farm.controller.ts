import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import { createFarm, listFarms } from './farm.service';

const farmSchema = z.object({
  name: z.string().trim().min(2).max(80),
  totalArea: z.coerce.number().positive().max(10000),
  soilType: z.string().trim().min(2).max(40),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export const list = asyncHandler(async (req, res) => ok(res, await listFarms(req.user!.id)));
export const create = asyncHandler(async (req, res) => ok(res, await createFarm(req.user!.id, farmSchema.parse(req.body)), 201));
