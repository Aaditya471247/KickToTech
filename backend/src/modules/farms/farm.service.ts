import { SensorType } from '@prisma/client';
import { prisma } from '../../config/database';
import { HttpError } from '../../lib/http';

export const SENSOR_TYPES: SensorType[] = ['START_0M', 'MID_5M', 'END_10M'];
export const SENSOR_POSITION_M: Record<SensorType, number> = { START_0M: 0, MID_5M: 5, END_10M: 10 };

export interface FarmInput {
  name: string;
  totalArea: number;
  soilType: string;
  latitude?: number;
  longitude?: number;
}

/** Creates a farm together with its three sensor nodes (0 m, 5 m, 10 m along the crop row). */
export function createFarm(userId: string, input: FarmInput) {
  return prisma.farm.create({
    data: { userId, ...input, sensors: { create: SENSOR_TYPES.map((sensorType) => ({ sensorType })) } },
    include: { sensors: true },
  });
}

export function listFarms(userId: string) {
  return prisma.farm.findMany({ where: { userId }, include: { sensors: true }, orderBy: { createdAt: 'asc' } });
}

/** Authorisation guard: the farm must exist and belong to the caller. */
export async function assertFarmOwner(userId: string, farmId: string) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) throw new HttpError(404, 'Farm not found');
  if (farm.userId !== userId) throw new HttpError(403, 'This farm belongs to another user');
  return farm;
}
