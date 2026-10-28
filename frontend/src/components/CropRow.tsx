import { Battery, Signal, Thermometer } from 'lucide-react';
import { SensorReading } from '../lib/types';
import { timeAgo } from '../lib/format';

const LABEL: Record<string, string> = { START_0M: 'Start, 0 m', MID_5M: 'Middle, 5 m', END_10M: 'End, 10 m' };

// Wet soil is darker. Blend dry-sand to wet-loam by moisture so the row itself shows where water has reached.
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const soil = (m: number | null) => (m === null ? '#bfc7b8' : `rgb(${mix([205, 179, 139], [74, 54, 38], Math.min(1, Math.max(0, (m - 10) / 60))).join(',')})`);

export function moistureTone(m: number | null, low: number, high: number) {
  if (m === null) return 'text-inkSoft';
  return m < low ? 'text-clay' : m >= high ? 'text-leaf' : 'text-ink';
}

/** The 10 metre crop row: drip line on top, soil coloured by moisture, three sensor nodes along it. */
export default function CropRow({ sensors, valveOpen, low, high }: { sensors: SensorReading[]; valveOpen: boolean; low: number; high: number }) {
  const [start, mid, end] = [0, 1, 2].map((i) => sensors[i]);
  const gradient = `linear-gradient(90deg, ${soil(start?.moisture ?? null)}, ${soil(mid?.moisture ?? null)}, ${soil(end?.moisture ?? null)})`;
  const stops = [start, mid, end];

  return (
    <div>
      <div className="relative pt-2">
        {/* drip line */}
        <div className={`h-2 rounded-full ${valveOpen ? 'drip-open animate-flow' : 'bg-line'}`} aria-label={valveOpen ? 'Water flowing' : 'Water off'} />
        <div className="flex justify-between px-0.5">
          {Array.from({ length: 11 }, (_, i) => <span key={i} className={`mt-0.5 h-1.5 w-1.5 rounded-full ${valveOpen ? 'bg-[#5fb3c4]' : 'bg-line'}`} />)}
        </div>
        {/* soil */}
        <div className="relative mt-3 h-20 rounded-md transition-[background] duration-700" style={{ background: gradient }}>
          {stops.map((s, i) => (
            <div key={i} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${i * 50}%`, transform: `translate(${i === 0 ? '8px' : i === 1 ? '-50%' : 'calc(-100% - 8px)'}, -50%)` }}>
              <div className="rounded-full border-2 border-paper bg-ink px-3 py-1 font-display text-lg font-bold text-paper shadow">
                {s?.moisture != null ? `${s.moisture.toFixed(0)}%` : '--'}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-inkSoft">
          {Array.from({ length: 11 }, (_, i) => <span key={i}>{i}</span>)}
        </div>
        <div className="mt-0.5 text-center text-xs text-inkSoft">metres along the row</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {stops.map((s, i) => s && (
          <div key={s.sensorId} className={`rounded-md border bg-field/60 p-3 ${s.moisture !== null && s.moisture < low ? 'border-clay' : s.moisture !== null && s.moisture >= high ? 'border-leaf' : 'border-line'}`}>
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{LABEL[s.sensorType] ?? `Node ${i + 1}`}</span>
              <span className="text-xs text-inkSoft">{timeAgo(s.timestamp)}</span>
            </div>
            <div className={`font-display text-3xl font-bold ${moistureTone(s.moisture, low, high)}`}>{s.moisture !== null ? `${s.moisture.toFixed(1)}%` : 'No data'}</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-inkSoft">
              <span className="flex items-center gap-1"><Thermometer size={14} /> {s.temperature !== null ? `${s.temperature.toFixed(1)} °C` : '--'}</span>
              <span className={`flex items-center gap-1 ${s.batteryLevel < 15 ? 'text-clay' : ''}`}><Battery size={14} /> {Math.round(s.batteryLevel)}%</span>
              <span className="flex items-center gap-1"><Signal size={14} /> {s.signalQuality}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
