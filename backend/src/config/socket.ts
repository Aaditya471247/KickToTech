import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from './env';
import { redis } from './redis';
import { prisma } from './database';
import { verifyToken } from '../middleware/auth';

let io: Server | null = null;

/**
 * Real-time channel. Clients authenticate with their JWT, then "subscribe" to a farm they own.
 * Events: "telemetry" (one sensor reading) and "valve" (valve state change).
 */
export function initSocket(server: HttpServer): Server {
  io = new Server(server, { cors: { origin: env.CORS_ORIGIN.split(','), credentials: true } });

  // Redis pub/sub lets several API instances share the same rooms.
  if (redis) io.adapter(createAdapter(redis, redis.duplicate()));

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      socket.data.userId = verifyToken(token).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', async (farmId: string, ack?: (ok: boolean) => void) => {
      const farm = await prisma.farm.findUnique({ where: { id: String(farmId) }, select: { userId: true } });
      const allowed = !!farm && farm.userId === socket.data.userId;
      if (allowed) socket.join(`farm:${farmId}`);
      ack?.(allowed);
    });
    socket.on('unsubscribe', (farmId: string) => socket.leave(`farm:${farmId}`));
  });

  return io;
}

export function emitToFarm(farmId: string, event: 'telemetry' | 'valve', payload: unknown): void {
  io?.to(`farm:${farmId}`).emit(event, payload);
}
