import 'dotenv/config';
import { z } from 'zod';

// Fail fast on a bad configuration instead of crashing later at runtime.
const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DEVICE_API_KEY: z.string().min(8),
  REDIS_URL: z.string().optional(),
  MQTT_URL: z.string().optional(),
  WATER_COST_PER_KL: z.coerce.number().default(5),
  MAX_VALVE_RUN_MINUTES: z.coerce.number().default(120),
});

export const env = schema.parse(process.env);
