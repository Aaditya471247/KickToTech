import { CropStage } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http';
import { ACRE_M2, findCrop } from '../../data/crops';
import { assertFarmOwner } from '../farms/farm.service';

/** Share of applied flood water that actually reaches the crop (drip is ~90%). Used to size the flood baseline. */
const FLOOD_EFFICIENCY = 0.5;
const STAGE_ORDER: CropStage[] = ['SOWING', 'GERMINATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST'];

export interface PortfolioInput {
  farmId: string;
  cropName: string;
  variety?: string;
  sowingDate: Date;
}

export interface RecordInput {
  date: Date;
  stage: CropStage;
  activity: string;
  expense?: number;
  income?: number;
  waterLitres?: number;
  notes?: string;
}

async function assertPortfolioOwner(userId: string, portfolioId: string) {
  const portfolio = await prisma.cropPortfolio.findUnique({ where: { id: portfolioId }, include: { farm: true } });
  if (!portfolio) throw new HttpError(404, 'Crop cycle not found');
  if (portfolio.farm.userId !== userId) throw new HttpError(403, 'This crop cycle belongs to another user');
  return portfolio;
}

export async function createPortfolio(userId: string, input: PortfolioInput) {
  await assertFarmOwner(userId, input.farmId);
  return prisma.cropPortfolio.create({ data: { ...input, variety: input.variety ?? '' } });
}

export function listPortfolios(userId: string) {
  return prisma.cropPortfolio.findMany({
    where: { farm: { userId } },
    include: { farm: { select: { id: true, name: true } } },
    orderBy: { sowingDate: 'desc' },
  });
}

export async function getPortfolio(userId: string, id: string) {
  await assertPortfolioOwner(userId, id);
  return prisma.cropPortfolio.findUniqueOrThrow({
    where: { id },
    include: { farm: { select: { id: true, name: true, totalArea: true } }, records: { orderBy: { date: 'desc' } } },
  });
}

/** Adds a logbook entry; moves the crop forward when the entry records a later stage; credits manual water. */
export async function addRecord(userId: string, portfolioId: string, input: RecordInput) {
  const portfolio = await assertPortfolioOwner(userId, portfolioId);
  const moveForward = STAGE_ORDER.indexOf(input.stage) > STAGE_ORDER.indexOf(portfolio.status);

  const [record] = await prisma.$transaction([
    prisma.farmRecord.create({
      data: { portfolioId, date: input.date, stage: input.stage, activity: input.activity, expense: input.expense ?? 0, income: input.income ?? 0, waterLitres: input.waterLitres ?? 0, notes: input.notes },
    }),
    prisma.cropPortfolio.update({
      where: { id: portfolioId },
      data: {
        ...(moveForward ? { status: input.stage } : {}),
        ...(input.waterLitres ? { totalWaterUsed: { increment: input.waterLitres } } : {}),
      },
    }),
  ]);
  return record;
}

/**
 * Financial totals plus the water savings audit.
 * Flood baseline = crop water need so far (mm x area; 1 mm over 1 m2 = 1 litre) divided by flood efficiency.
 * Litres saved = baseline - litres actually applied through drip / logged irrigation.
 */
export async function audit(userId: string, portfolioId: string) {
  const portfolio = await assertPortfolioOwner(userId, portfolioId);
  const records = await prisma.farmRecord.findMany({ where: { portfolioId } });

  const expense = records.reduce((s, r) => s + r.expense, 0);
  const income = records.reduce((s, r) => s + r.income, 0);
  const expenseByStage = STAGE_ORDER.map((stage) => ({ stage, expense: records.filter((r) => r.stage === stage).reduce((s, r) => s + r.expense, 0) }));

  const crop = findCrop(portfolio.cropName);
  const seasonMm = crop?.seasonWaterMm ?? 500;
  const durationDays = crop?.durationDays ?? 120;
  const elapsedDays = Math.max(1, Math.ceil((Date.now() - portfolio.sowingDate.getTime()) / 86400000));
  const progress = Math.min(1, elapsedDays / durationDays);

  const needLitres = portfolio.farm.totalArea * ACRE_M2 * seasonMm * progress;
  const floodLitres = needLitres / FLOOD_EFFICIENCY;
  const dripLitres = portfolio.totalWaterUsed;
  const savedLitres = floodLitres - dripLitres;

  return {
    portfolioId,
    financial: { totalExpense: Math.round(expense), totalIncome: Math.round(income), netProfit: Math.round(income - expense), expenseByStage },
    water: {
      dripLitres: Math.round(dripLitres),
      floodBaselineLitres: Math.round(floodLitres),
      savedLitres: Math.round(savedLitres),
      savedPercent: floodLitres > 0 ? Math.round((savedLitres / floodLitres) * 100) : 0,
      costPerKilolitre: env.WATER_COST_PER_KL,
      costSaved: Math.round((savedLitres / 1000) * env.WATER_COST_PER_KL),
      cropProgressPercent: Math.round(progress * 100),
      assumption: `Flood irrigation baseline assumes ${Math.round(FLOOD_EFFICIENCY * 100)}% application efficiency and a ${seasonMm} mm season water need${crop ? '' : ' (default, crop not in catalogue)'}.`,
    },
  };
}
