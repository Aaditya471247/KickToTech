import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { api } from './routes/api.router';
import { errorHandler, notFound } from './middleware/error';

/** Builds the Express app (no listening here, so it stays easy to test). */
export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/v1', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
