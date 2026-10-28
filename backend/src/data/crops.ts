/**
 * Crop reference table shared by the water audit, market engine and fertilizer calculator.
 * Figures are indicative agronomy / price averages for semi-arid Maharashtra, meant for planning,
 * not for guaranteed yields. Replace prices with live Agmarknet data in production.
 */
export interface CropInfo {
  key: string;
  name: string;
  aliases: string[];
  seasonWaterMm: number; // total crop water requirement over the season
  durationDays: number;
  droughtTolerance: 1 | 2 | 3 | 4 | 5; // 5 = very tolerant
  kc: number; // crop coefficient for ETc = ET0 x Kc
  yieldQtlPerAcre: number;
  pricePerQtl: number; // Rs per quintal
  npk: { n: number; p: number; k: number }; // kg/ha of N, P2O5, K2O
}

export const CROPS: CropInfo[] = [
  { key: 'ragi', name: 'Finger Millet (Ragi)', aliases: ['ragi', 'finger millet', 'nachni'], seasonWaterMm: 400, durationDays: 110, droughtTolerance: 5, kc: 0.95, yieldQtlPerAcre: 8, pricePerQtl: 4200, npk: { n: 50, p: 25, k: 25 } },
  { key: 'jowar', name: 'Sorghum (Jowar)', aliases: ['jowar', 'sorghum'], seasonWaterMm: 450, durationDays: 115, droughtTolerance: 5, kc: 1.0, yieldQtlPerAcre: 7, pricePerQtl: 3500, npk: { n: 80, p: 40, k: 40 } },
  { key: 'chickpea', name: 'Chickpea (Harbhara)', aliases: ['chickpea', 'harbhara', 'gram', 'chana'], seasonWaterMm: 300, durationDays: 110, droughtTolerance: 4, kc: 1.0, yieldQtlPerAcre: 6, pricePerQtl: 5800, npk: { n: 25, p: 50, k: 25 } },
  { key: 'pomegranate', name: 'Pomegranate (Dalimb)', aliases: ['pomegranate', 'dalimb', 'anar'], seasonWaterMm: 900, durationDays: 365, droughtTolerance: 3, kc: 0.8, yieldQtlPerAcre: 45, pricePerQtl: 8000, npk: { n: 200, p: 100, k: 100 } },
  { key: 'tomato', name: 'Tomato', aliases: ['tomato'], seasonWaterMm: 600, durationDays: 120, droughtTolerance: 2, kc: 1.15, yieldQtlPerAcre: 120, pricePerQtl: 1800, npk: { n: 120, p: 60, k: 60 } },
  { key: 'onion', name: 'Onion', aliases: ['onion', 'kanda'], seasonWaterMm: 550, durationDays: 130, droughtTolerance: 2, kc: 1.05, yieldQtlPerAcre: 60, pricePerQtl: 1600, npk: { n: 100, p: 50, k: 50 } },
  { key: 'cotton', name: 'Cotton', aliases: ['cotton', 'kapus'], seasonWaterMm: 700, durationDays: 170, droughtTolerance: 3, kc: 1.15, yieldQtlPerAcre: 8, pricePerQtl: 7000, npk: { n: 100, p: 50, k: 50 } },
  { key: 'wheat', name: 'Wheat', aliases: ['wheat', 'gahu'], seasonWaterMm: 450, durationDays: 120, droughtTolerance: 2, kc: 1.15, yieldQtlPerAcre: 15, pricePerQtl: 2600, npk: { n: 120, p: 60, k: 40 } },
  { key: 'soybean', name: 'Soybean', aliases: ['soybean', 'soyabean'], seasonWaterMm: 450, durationDays: 100, droughtTolerance: 3, kc: 1.1, yieldQtlPerAcre: 7, pricePerQtl: 4600, npk: { n: 30, p: 60, k: 30 } },
  { key: 'sugarcane', name: 'Sugarcane', aliases: ['sugarcane', 'us'], seasonWaterMm: 1800, durationDays: 365, droughtTolerance: 1, kc: 1.25, yieldQtlPerAcre: 400, pricePerQtl: 350, npk: { n: 250, p: 115, k: 115 } },
];

/** Looks a crop up by key, name or alias (case-insensitive, partial match on the name the farmer typed). */
export function findCrop(input: string): CropInfo | undefined {
  const q = input.trim().toLowerCase();
  if (!q) return undefined;
  return CROPS.find((c) => c.key === q || c.aliases.includes(q)) ?? CROPS.find((c) => c.aliases.some((a) => q.includes(a)) || c.name.toLowerCase().includes(q));
}

export const ACRE_M2 = 4046.86;
export const ACRE_TO_HA = 0.404686;
