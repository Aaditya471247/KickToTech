import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CropOption } from '../lib/types';
import { useApi } from '../lib/useApi';
import { Empty, ErrorNote, PageHeader, Spinner } from '../components/ui';
import { inr, num, shortDate } from '../lib/format';

interface EtDay { date: string; et0: number; etc: number | null; rain: number; tMax: number; tMin: number; litresPerAcre: number | null; demand: string }
interface Et { source: string; days: EtDay[]; crop: { name: string } | null }
interface Match { key: string; name: string; seasonWaterMm: number; durationDays: number; droughtTolerance: number; grossRevenuePerAcre: number; rupeesPerKilolitre: number; fits: boolean; waterShortfallMm: number }
interface Prices { note: string; unit: string; history: { date: string; price: number }[]; projection: { date: string; price: number }[]; weekOnWeekChangePct: number; outlook: string; mandis: { name: string; distanceKm: number; price: number }[] }

export default function Market() {
  const crops = useApi<CropOption[]>('/advisory/crops');
  const [crop, setCrop] = useState('ragi');
  const [waterMm, setWaterMm] = useState(450);
  const et = useApi<Et>(`/market/et-forecast?crop=${crop}`, [crop]);
  const match = useApi<Match[]>(`/market/crop-match?waterMm=${waterMm}`, [waterMm]);
  const prices = useApi<Prices>(`/market/prices?crop=${crop}`, [crop]);

  const priceSeries = prices.data ? [...prices.data.history.map((h) => ({ date: h.date, actual: h.price })), ...prices.data.projection.map((p) => ({ date: p.date, projected: p.price }))] : [];
  const outlookTone = prices.data?.outlook === 'Rising' ? 'text-leaf' : prices.data?.outlook === 'Softening' ? 'text-clay' : 'text-ink';

  return (
    <div className="space-y-8">
      <PageHeader title="Weather and market">Plan irrigation around the next five days, pick crops your water can support, and watch the mandi.</PageHeader>
      <div className="max-w-xs"><label>Crop to analyse</label><select value={crop} onChange={(e) => setCrop(e.target.value)}>{crops.data?.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></div>

      <section className="panel">
        <h2 className="mb-1 text-xl font-bold">Five-day water demand</h2>
        <p className="mb-4 text-sm text-inkSoft">Evapotranspiration (ET) is how much water the sun and wind pull from your field each day.{et.data?.source === 'estimate' ? ' Live forecast is unavailable, so these are seasonal estimates.' : ''}</p>
        <ErrorNote message={et.error} />
        {et.loading && !et.data ? <Spinner /> : et.data && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={et.data.days.map((d) => ({ ...d, day: shortDate(d.date) }))} margin={{ left: -15 }}>
                  <CartesianGrid stroke="#C9D3C4" strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis unit=" mm" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="et0" name="ET (mm/day)" fill="#0E3B43" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="rain" name="Rain (mm)" fill="#5fb3c4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-line text-inkSoft"><th className="py-2">Day</th><th>Demand</th><th>Temp</th><th>{et.data.crop?.name.split(' ')[0]} needs (L/acre)</th></tr></thead>
                <tbody>{et.data.days.map((d) => (
                  <tr key={d.date} className="border-b border-line/60"><td className="py-2">{shortDate(d.date)}</td><td className={d.demand === 'High' ? 'font-medium text-clay' : ''}>{d.demand}</td><td>{d.tMin}–{d.tMax} °C</td><td>{d.litresPerAcre === null ? '--' : num(d.litresPerAcre)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="mb-1 text-xl font-bold">Which crop fits your water?</h2>
        <p className="mb-4 text-sm text-inkSoft">Set the water you expect to have for the season (rain plus irrigation).</p>
        <div className="mb-4 max-w-md">
          <label>Water available: <span className="font-bold text-ink">{waterMm} mm</span> ({num(waterMm * 4.04686)} kilolitres per acre)</label>
          <input type="range" min={200} max={1800} step={50} value={waterMm} onChange={(e) => setWaterMm(Number(e.target.value))} className="!p-0" />
        </div>
        {match.loading && !match.data ? <Spinner /> : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-line text-inkSoft"><th className="py-2">Crop</th><th>Water need</th><th>Drought tolerance</th><th>Income per acre</th><th>₹ per kilolitre</th><th>Fit</th></tr></thead>
            <tbody>{match.data?.map((m) => (
              <tr key={m.key} className={`border-b border-line/60 ${m.fits ? '' : 'text-inkSoft'}`}>
                <td className="py-2 font-medium">{m.name}</td><td>{m.seasonWaterMm} mm</td>
                <td>{'●'.repeat(m.droughtTolerance)}<span className="text-line">{'●'.repeat(5 - m.droughtTolerance)}</span></td>
                <td>{inr(m.grossRevenuePerAcre)}</td><td>{inr(m.rupeesPerKilolitre)}</td>
                <td>{m.fits ? <span className="font-medium text-leaf">Fits</span> : `Short by ${m.waterShortfallMm} mm`}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Price trend and mandi rates</h2>
          {prices.data && <span className={`font-medium ${outlookTone}`}>Outlook: {prices.data.outlook} ({prices.data.weekOnWeekChangePct > 0 ? '+' : ''}{prices.data.weekOnWeekChangePct}% this week)</span>}
        </div>
        <ErrorNote message={prices.error} />
        {prices.loading && !prices.data ? <Spinner /> : prices.data ? (
          <>
            <p className="mb-4 text-sm text-inkSoft">{prices.data.note} Prices in {prices.data.unit}.</p>
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <div className="h-64">
                <ResponsiveContainer>
                  <ComposedChart data={priceSeries} margin={{ left: -5 }}>
                    <CartesianGrid stroke="#C9D3C4" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={30} fontSize={12} />
                    <YAxis domain={['auto', 'auto']} fontSize={12} />
                    <Tooltip labelFormatter={(d) => shortDate(String(d))} formatter={(v: number) => inr(v)} />
                    <Legend />
                    <Line dataKey="actual" name="Past 30 days" stroke="#0E3B43" dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line dataKey="projected" name="Next 14 days (projection)" stroke="#D9951C" strokeDasharray="6 4" dot={false} strokeWidth={2} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="mb-2 font-bold">Nearby mandis today</h3>
                <ul className="divide-y divide-line">{prices.data.mandis.map((m) => (
                  <li key={m.name} className="flex justify-between py-2"><span>{m.name}<span className="ml-2 text-xs text-inkSoft">{m.distanceKm ? `${m.distanceKm} km` : 'local'}</span></span><span className="font-medium">{inr(m.price)}</span></li>
                ))}</ul>
              </div>
            </div>
          </>
        ) : <Empty>No price data.</Empty>}
      </section>
    </div>
  );
}
