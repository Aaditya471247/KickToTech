import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import * as service from './portfolio.service';

const stage = z.enum(['SOWING', 'GERMINATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST']);
const createSchema = z.object({
  farmId: z.string().min(1),
  cropName: z.string().trim().min(2).max(60),
  variety: z.string().trim().max(60).optional(),
  sowingDate: z.coerce.date(),
});
const recordSchema = z.object({
  date: z.coerce.date(),
  stage,
  activity: z.string().trim().min(2).max(200),
  expense: z.coerce.number().min(0).max(1e8).optional(),
  income: z.coerce.number().min(0).max(1e8).optional(),
  waterLitres: z.coerce.number().min(0).max(1e8).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const create = asyncHandler(async (req, res) => ok(res, await service.createPortfolio(req.user!.id, createSchema.parse(req.body)), 201));
export const list = asyncHandler(async (req, res) => ok(res, await service.listPortfolios(req.user!.id)));
export const get = asyncHandler(async (req, res) => ok(res, await service.getPortfolio(req.user!.id, req.params.id)));
export const addRecord = asyncHandler(async (req, res) => ok(res, await service.addRecord(req.user!.id, req.params.id, recordSchema.parse(req.body)), 201));
export const audit = asyncHandler(async (req, res) => ok(res, await service.audit(req.user!.id, req.params.id)));
