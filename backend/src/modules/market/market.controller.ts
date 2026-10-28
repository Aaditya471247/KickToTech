import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import * as service from './market.service';

export const et = asyncHandler(async (req, res) => {
  const q = z.object({ lat: z.coerce.number().min(-90).max(90).default(18.15), lon: z.coerce.number().min(-180).max(180).default(74.58), crop: z.string().optional() }).parse(req.query);
  ok(res, await service.etForecast(q.lat, q.lon, q.crop));
});
export const match = asyncHandler(async (req, res) => {
  const { waterMm } = z.object({ waterMm: z.coerce.number().min(100).max(3000).default(500) }).parse(req.query);
  ok(res, service.matchCrops(waterMm));
});
export const prices = asyncHandler(async (req, res) => {
  const { crop } = z.object({ crop: z.string().min(1) }).parse(req.query);
  ok(res, service.priceAnalysis(crop));
});
