import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import * as service from './advisory.service';

const remedyQuery = z.object({ q: z.string().trim().max(60).optional(), category: z.enum(['PEST', 'DISEASE']).optional() });
const calcQuery = z.object({ crop: z.string().min(1), acres: z.coerce.number().positive().max(1000) });
const remedyBody = z.object({
  targetPest: z.string().min(2),
  remedyName: z.string().min(2),
  category: z.enum(['PEST', 'DISEASE']).default('PEST'),
  ingredients: z.array(z.string().min(1)).min(1),
  preparation: z.array(z.string().min(1)).min(1),
  dosage: z.string().min(2),
  timing: z.string().min(2),
  safety: z.string().min(2),
});

export const remedies = asyncHandler(async (req, res) => {
  const { q, category } = remedyQuery.parse(req.query);
  ok(res, await service.listRemedies(q, category));
});
export const addRemedy = asyncHandler(async (req, res) => ok(res, await service.createRemedy(remedyBody.parse(req.body)), 201));
export const fertilizers = asyncHandler(async (_req, res) => ok(res, await service.listFertilizers()));
export const crops = asyncHandler(async (_req, res) => ok(res, service.listCrops()));
export const calculator = asyncHandler(async (req, res) => {
  const { crop, acres } = calcQuery.parse(req.query);
  ok(res, service.calculateOrganicPlan(crop, acres));
});
