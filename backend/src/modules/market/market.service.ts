import { cached } from '../../config/redis';
import { ACRE_M2, CROPS, CropInfo, findCrop } from '../../data/crops';
import { HttpError } from '../../lib/http';

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------- 5-day evapotranspiration forecast

interface EtDay {
  date: string;
  et0: number;
  tMax: number;
  tMin: number;
  rain: number;
}

/** Live ET0 from Open-Meteo (free, no key). Falls back to a seasonal estimate so the screen never breaks offline. */
async function loadEt(lat: number, lon: number): Promise<{ source: 'open-meteo' | 'estimate'; days: EtDay[] }> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,precipitation_sum&forecast_days=5&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = (await res.json()) as { daily: { time: string[]; et0_fao_evapotranspiration: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[] } };
    return {
      source: 'open-meteo',
      days: j.daily.time.map((date, i) => ({
        date,
        et0: round(j.daily.et0_fao_evapotranspiration[i] ?? 0),
        tMax: round(j.daily.temperature_2m_max[i] ?? 0),
        tMin: round(j.daily.temperature_2m_min[i] ?? 0),
        rain: round(j.daily.precipitation_sum[i] ?? 0),
      })),
    };
  } catch {
    const days: EtDay[] = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(Date.now() + i * 86400000);
      return { date: d.toISOString().slice(0, 10), et0: 4.5, tMax: 32, tMin: 20, rain: 0 };
    });
    return { source: 'estimate', days };
  }
}

export async function etForecast(lat: number, lon: number, cropInput?: string) {
  const key = `et:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  const data = await cached(key, 3 * 3600, () => loadEt(lat, lon));
  const crop = cropInput ? findCrop(cropInput) : undefined;
  const days = data.days.map((d) => {
    const etc = crop ? d.et0 * crop.kc : null; // crop water demand = ET0 x Kc
    const netMm = etc === null ? null : Math.max(0, etc - d.rain);
    return {
      ...d,
      etc: etc === null ? null : round(etc),
      litresPerAcre: netMm === null ? null : Math.round(netMm * ACRE_M2),
      demand: d.et0 >= 6 ? 'High' : d.et0 >= 4 ? 'Moderate' : 'Low',
    };
  });
  return { source: data.source, crop: crop ? { key: crop.key, name: crop.name } : null, days };
}

// ---------------------------------------------------------------- water-wise crop matchmaker

export function matchCrops(waterMm: number) {
  return CROPS.map((c) => {
    const revenue = c.yieldQtlPerAcre * c.pricePerQtl;
    return {
      key: c.key,
      name: c.name,
      seasonWaterMm: c.seasonWaterMm,
      durationDays: c.durationDays,
      droughtTolerance: c.droughtTolerance,
      grossRevenuePerAcre: revenue,
      rupeesPerKilolitre: round(revenue / (c.seasonWaterMm * (ACRE_M2 / 1000)), 0),
      fits: c.seasonWaterMm <= waterMm,
      waterShortfallMm: Math.max(0, c.seasonWaterMm - waterMm),
    };
  }).sort((a, b) => Number(b.fits) - Number(a.fits) || b.droughtTolerance - a.droughtTolerance || b.rupeesPerKilolitre - a.rupeesPerKilolitre);
}

// ---------------------------------------------------------------- market price analyzer (illustrative data)

const MANDIS = [
  { name: 'Baramati', distanceKm: 0, factor: 1.0 },
  { name: 'Pune (Market Yard)', distanceKm: 100, factor: 1.04 },
  { name: 'Solapur', distanceKm: 140, factor: 0.97 },
  { name: 'Ahilyanagar', distanceKm: 170, factor: 0.98 },
  { name: 'Satara', distanceKm: 90, factor: 0.99 },
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  // mulberry32: tiny deterministic PRNG so the sample history is stable between requests
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function history(crop: CropInfo, days: number): { date: string; price: number }[] {
  const out: { date: string; price: number }[] = [];
  const today = new Date();
  const phase = (hash(crop.key) % 100) / 100;
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const day = Math.floor(d.getTime() / 86400000);
    const noise = (rng(hash(crop.key) + day)() - 0.5) * 0.04;
    const wave = Math.sin(((days - i) / days + phase) * Math.PI * 2) * 0.06;
    out.push({ date: d.toISOString().slice(0, 10), price: Math.round(crop.pricePerQtl * (1 + wave + noise)) });
  }
  return out;
}

export function priceAnalysis(cropInput: string) {
  const crop = findCrop(cropInput);
  if (!crop) throw new HttpError(404, 'Crop not found');
  const hist = history(crop, 30);
  const prices = hist.map((h) => h.price);
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

  // Least-squares slope over 30 days, extended 14 days ahead as a simple projection.
  const n = prices.length;
  const xs = prices.map((_, i) => i);
  const xm = avg(xs);
  const ym = avg(prices);
  const slope = xs.reduce((s, x, i) => s + (x - xm) * (prices[i] - ym), 0) / xs.reduce((s, x) => s + (x - xm) ** 2, 0);
  const last = hist[n - 1];
  const projection = Array.from({ length: 14 }, (_, i) => ({
    date: new Date(new Date(last.date).getTime() + (i + 1) * 86400000).toISOString().slice(0, 10),
    price: Math.round(ym + slope * (n + i - xm)),
  }));

  const recent = avg(prices.slice(-7));
  const prior = avg(prices.slice(-14, -7));
  const changePct = round(((recent - prior) / prior) * 100);
  const outlook = changePct > 2 ? 'Rising' : changePct < -2 ? 'Softening' : 'Stable';

  return {
    dataSource: 'illustrative',
    note: 'Sample prices for planning. Connect Agmarknet / e-NAM for live mandi rates.',
    crop: { key: crop.key, name: crop.name },
    unit: 'Rs per quintal',
    history: hist,
    projection,
    weekOnWeekChangePct: changePct,
    outlook,
    mandis: MANDIS.map((m) => ({ name: m.name, distanceKm: m.distanceKm, price: Math.round(last.price * m.factor) })).sort((a, b) => b.price - a.price),
  };
}
