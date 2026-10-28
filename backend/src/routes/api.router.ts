import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireDevice, requireRole } from '../middleware/auth';
import * as auth from '../modules/auth/auth.controller';
import * as farms from '../modules/farms/farm.controller';
import * as iot from '../modules/iot/iot.controller';
import * as advisory from '../modules/advisory/advisory.controller';
import * as market from '../modules/market/market.controller';
import * as portfolios from '../modules/portfolios/portfolio.controller';

export const api = Router();

// Brute-force protection on login/register
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

api.get('/health', (_req, res) => res.json({ data: { status: 'ok' } }));

// Authentication
api.post('/auth/register', authLimiter, auth.register);
api.post('/auth/login', authLimiter, auth.login);
api.get('/auth/me', requireAuth, auth.profile);

// Farms
api.get('/farms', requireAuth, farms.list);
api.post('/farms', requireAuth, farms.create);

// IoT telemetry and valve control
api.post('/iot/telemetry', requireDevice, iot.postTelemetry);
api.get('/iot/sensors/:farmId', requireAuth, iot.getSensors);
api.get('/iot/history/:farmId', requireAuth, iot.getHistory);
api.get('/iot/events/:farmId', requireAuth, iot.getEvents);
api.post('/iot/valve/control', requireAuth, iot.controlValve);

// Advisory
api.get('/advisory/remedies', requireAuth, advisory.remedies);
api.post('/advisory/remedies', requireAuth, requireRole('ADMIN'), advisory.addRemedy);
api.get('/advisory/fertilizers', requireAuth, advisory.fertilizers);
api.get('/advisory/crops', requireAuth, advisory.crops);
api.get('/advisory/calculator', requireAuth, advisory.calculator);

// Weather and market intelligence
api.get('/market/et-forecast', requireAuth, market.et);
api.get('/market/crop-match', requireAuth, market.match);
api.get('/market/prices', requireAuth, market.prices);

// Crop portfolio ledger
api.get('/portfolios', requireAuth, portfolios.list);
api.post('/portfolios', requireAuth, portfolios.create);
api.get('/portfolios/:id', requireAuth, portfolios.get);
api.post('/portfolios/:id/records', requireAuth, portfolios.addRecord);
api.get('/portfolios/:id/audit', requireAuth, portfolios.audit);
