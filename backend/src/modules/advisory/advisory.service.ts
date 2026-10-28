import { Prisma, RemedyCategory } from '@prisma/client';
import { prisma } from '../../config/database';
import { HttpError } from '../../lib/http';
import { ACRE_M2, ACRE_TO_HA, CROPS, findCrop } from '../../data/crops';

export function listRemedies(q?: string, category?: RemedyCategory) {
  const where: Prisma.NaturalRemedyWhereInput = {};
  if (category) where.category = category;
  if (q) {
    where.OR = [
      { remedyName: { contains: q, mode: 'insensitive' } },
      { targetPest: { contains: q, mode: 'insensitive' } },
    ];
  }
  return prisma.naturalRemedy.findMany({ where, orderBy: { remedyName: 'asc' } });
}

export function createRemedy(data: Prisma.NaturalRemedyCreateInput) {
  return prisma.naturalRemedy.create({ data });
}

export const listFertilizers = () => prisma.bioFertilizer.findMany({ orderBy: { name: 'asc' } });

export const listCrops = () => CROPS.map((c) => ({ key: c.key, name: c.name, durationDays: c.durationDays }));

// Typical nutrient content of well-made vermicompost (% of fresh weight) and organic carbon share.
const VERMI = { n: 0.015, p: 0.01, k: 0.012, carbon: 0.2 };
const STABLE_CARBON_SHARE = 0.3; // portion of added carbon assumed to persist as soil organic carbon
const TOPSOIL_KG_PER_ACRE = ACRE_M2 * 0.15 * 1300; // 15 cm layer at 1.3 t/m3

/**
 * NPK and soil-carbon planner. Vermicompost is sized to supply half of the crop's nitrogen;
 * Jeevamrut (monthly) and Panchagavya sprays support the rest, and any P/K gap is reported honestly.
 */
export function calculateOrganicPlan(cropInput: string, acres: number) {
  const crop = findCrop(cropInput);
  if (!crop) throw new HttpError(404, 'Crop not found');
  const ha = acres * ACRE_TO_HA;
  const need = { n: crop.npk.n * ha, p: crop.npk.p * ha, k: crop.npk.k * ha };

  const vermiKg = (need.n * 0.5) / VERMI.n;
  const supplied = { n: vermiKg * VERMI.n, p: vermiKg * VERMI.p, k: vermiKg * VERMI.k };
  const gap = { n: Math.max(0, need.n - supplied.n), p: Math.max(0, need.p - supplied.p), k: Math.max(0, need.k - supplied.k) };

  const jeevamrutRounds = Math.max(1, Math.ceil(crop.durationDays / 30));
  const perRound = { cowDungKg: 10 * acres, cowUrineL: 10 * acres, jaggeryKg: 2 * acres, besanKg: 2 * acres, waterL: 200 * acres };
  const panchagavyaSprays = crop.durationDays > 200 ? 6 : 3;
  const carbonAdded = vermiKg * VERMI.carbon;
  const stable = carbonAdded * STABLE_CARBON_SHARE;

  const notes: string[] = [];
  if (gap.p > supplied.p * 0.5) notes.push('Phosphorus runs short on compost alone. Add rock phosphate or bone meal with the vermicompost, and inoculate with PSB culture.');
  if (gap.k > supplied.k * 0.5) notes.push('Potash runs short. Wood ash (a few kg per acre) or banana-stem compost helps.');
  if (['chickpea', 'soybean'].includes(crop.key)) notes.push('This is a legume: treat seed with Rhizobium culture and it will fix much of its own nitrogen.');
  notes.push('Apply Jeevamrut through the drip line or with irrigation water, never on dry soil.');

  const r = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  return {
    crop: { key: crop.key, name: crop.name, durationDays: crop.durationDays },
    acres,
    requirementKg: { n: r(need.n), p: r(need.p), k: r(need.k) },
    vermicompost: { kg: Math.round(vermiKg), tonnes: r(vermiKg / 1000, 2), suppliesKg: { n: r(supplied.n), p: r(supplied.p), k: r(supplied.k) } },
    remainingGapKg: { n: r(gap.n), p: r(gap.p), k: r(gap.k) },
    jeevamrut: { rounds: jeevamrutRounds, perRound: { ...perRound }, total: { cowDungKg: perRound.cowDungKg * jeevamrutRounds, cowUrineL: perRound.cowUrineL * jeevamrutRounds, jaggeryKg: perRound.jaggeryKg * jeevamrutRounds, besanKg: perRound.besanKg * jeevamrutRounds } },
    panchagavya: { sprays: panchagavyaSprays, litresPerSpray: r(6 * acres, 1), totalLitres: r(6 * acres * panchagavyaSprays, 1) },
    soilCarbon: { organicCarbonAddedKg: Math.round(carbonAdded), estimatedStableCarbonKg: Math.round(stable), soilOrganicCarbonRisePct: r((stable / (TOPSOIL_KG_PER_ACRE * acres)) * 100, 3) },
    notes,
  };
}
