import { z } from 'zod';
import { asyncHandler, ok } from '../../lib/http';
import * as service from './auth.service';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone must be a 10 digit number'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  region: z.string().trim().max(80).optional(),
});
const loginSchema = z.object({ phone: z.string().trim().min(1), password: z.string().min(1) });

export const register = asyncHandler(async (req, res) => ok(res, await service.register(registerSchema.parse(req.body)), 201));
export const login = asyncHandler(async (req, res) => {
  const { phone, password } = loginSchema.parse(req.body);
  ok(res, await service.login(phone, password));
});
export const profile = asyncHandler(async (req, res) => ok(res, await service.me(req.user!.id)));
