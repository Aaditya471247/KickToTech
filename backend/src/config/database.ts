import { PrismaClient } from '@prisma/client';

// One shared client for the whole process (avoids exhausting DB connections on dev reloads).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
