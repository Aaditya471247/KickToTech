import { useEffect, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Power, PowerOff, Wand2 } from 'lucide-react';
import { api } from '../lib/api';
import { connectFarm } from '../lib/socket';
import { Farm, HistoryPoint, SensorSnapshot, ValveEvent, ValveState } from '../lib/types';
import { useApi } from '../lib/useApi';
import { ErrorNote, Empty, PageHeader, Spinner } from '../components/ui';
import CropRow from '../components/CropRow';
import { num } from '../lib/format';

const time = (t: number) => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function Dashboard() {
  const farms = useApi<Farm[]>('/farms');
  const [farmId, setFarmId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SensorSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [events, setEvents] = useState<ValveEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!farmId && farms.data?.length) setFarmId(farms.data[0].id);
  }, [farms.data, farmId]);

  useEffect(() => {
    if (!farmId) return;
    let alive = true;
    const loadEvents = () => api<ValveEvent[]>(`/iot/events/${farmId}`).then((e) => alive && setEvents(e)).catch(() => {});

    api<SensorSnapshot>(`/iot/sensors/${farmId}`).then((s) => alive && setSnap(s)).catch((e) => setError(e.message));
    api<HistoryPoint[]>(`/iot/history/${farmId}?minutes=30`).then((h) => alive && setHistory(h)).catch(() => {});
    loadEvents();

    // Live stream: new readings and valve changes arrive over Socket.io
    const socket = connectFarm(farmId);
    socket.on('connect', () => setLive(true));
    socket.on('disconnect', () => setLive(false));
    socket.on('telemetry', (p) => {
      setSnap((prev) =>
        prev && {
          ...prev,
          sensors: prev.sensors.map((s) => s.sensorId === p.sensorId ? { ...s, moisture: p.moisture, temperature: p.temperature, batteryLevel: p.batteryLevel, signalQuality: p.signalQuality, timestamp: p.timestamp } : s),
        },
      );
      setHistory((h) => {
        const t = Math.floor(new Date(p.timestamp).getTime() / 10000) * 10000;
        const last = h[h.length - 1];
        const next = last && last.t === t ? [...h.slice(0, -1), { ...last, [p.sensorType]: p.moisture }] : [...h, { t, [p.sensorType]: p.moisture }];
        return next.slice(-180);
      });
    });
    socket.on('valve', (v: ValveState & { reason?: string }) => {
      setSnap((prev) => prev && { ...prev, farm: { ...prev.farm, valveOpen: v.valveOpen, valveMode: v.valveMode, valveOpenedAt: v.valveOpenedAt } });
      loadEvents();
    });
    return () => {
      alive = false;
      socket.disconnect();
      setLive(false);
    };
  }, [farmId]);

  async function control(action: 'OPEN' | 'CLOSE' | 'AUTO') {
    if (!farmId) return;
    setBusy(true);
    setError(null);
    try {
      const v = await api<ValveState>('/iot/valve/control', { body: { farmId, action } });
      setSnap((prev) => prev && { ...prev, farm: { ...prev.farm, ...v } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (farms.loading) return <Spinner />;
  if (!farms.data?.length) return <Empty>No farm yet. Register again or add a farm through the API.</Empty>;
  if (!snap) return <><ErrorNote message={error} /><Spinner /></>;

  const { farm, thresholds, sensors } = snap;
  const noData = sensors.every((s) => s.moisture === null);

  return (
    <div>
      <PageHeader title={farm.name}>
        <span className={`inline-flex items-center gap-2 ${live ? 'text-leaf' : 'text-inkSoft'}`}>
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-leaf' : 'bg-line'}`} /> {live ? 'Live from the field' : 'Reconnecting…'}
        </span>
      </PageHeader>
      <ErrorNote message={error} />
      {(farms.data?.length ?? 0) > 1 && (
        <div className="mb-4 max-w-xs"><select value={farmId ?? ''} onChange={(e) => setFarmId(e.target.value)}>{farms.data!.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      )}

      <section className="panel">
        <h2 className="mb-4 text-xl font-bold">Crop row, 10 metres</h2>
        {noData && <p className="mb-4 rounded-md bg-turmeric/15 px-3 py-2 text-sm">Waiting for the first sensor readings. To see the demo, run <code>npm run simulate</code> in a second terminal.</p>}
        <CropRow sensors={sensors} valveOpen={farm.valveOpen} low={thresholds.OPEN_BELOW} high={thresholds.FIELD_CAPACITY} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="panel">
          <h2 className="text-xl font-bold">Drip valve</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${farm.valveOpen ? 'bg-leaf' : 'bg-clay'}`} />
            <span className="font-display text-2xl font-bold">{farm.valveOpen ? 'Open' : 'Closed'}</span>
            <span className="rounded-full border border-line px-3 py-0.5 text-sm">{farm.valveMode === 'AUTO' ? 'Automatic' : 'Manual'}</span>
          </div>
          <p className="mt-2 text-sm text-inkSoft">Opens by itself when average moisture drops below {thresholds.OPEN_BELOW}%. Shuts off when the 10 m sensor reaches {thresholds.FIELD_CAPACITY}%. Flow: {num(farm.flowRateLpm)} litres a minute.</p>
          <div className="mt-4 grid gap-2">
            <button className="btn-primary" disabled={busy || farm.valveOpen} onClick={() => control('OPEN')}><Power size={18} /> Open valve</button>
            <button className="btn-clay" disabled={busy || !farm.valveOpen} onClick={() => control('CLOSE')}><PowerOff size={18} /> Close valve</button>
            <button className="btn-ghost" disabled={busy || farm.valveMode === 'AUTO'} onClick={() => control('AUTO')}><Wand2 size={18} /> Switch to automatic</button>
          </div>
          <h3 className="mt-6 font-bold">Recent valve activity</h3>
          {events.length === 0 ? <p className="mt-2 text-sm text-inkSoft">Nothing yet.</p> : (
            <ul className="mt-2 space-y-2 text-sm">
              {events.slice(0, 6).map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <div>{e.reason}{e.litres ? ` (${num(e.litres)} L used)` : ''}</div>
                  <div className="text-xs text-inkSoft">{new Date(e.createdAt).toLocaleString('en-IN')}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2 className="mb-3 text-xl font-bold">Soil moisture, last 30 minutes</h2>
          {history.length < 2 ? <Empty>The chart fills in as readings arrive.</Empty> : (
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={history} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#C9D3C4" strokeDasharray="3 3" />
                  <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={time} minTickGap={50} fontSize={12} />
                  <YAxis domain={[0, 100]} unit="%" fontSize={12} />
                  <Tooltip labelFormatter={(t) => time(Number(t))} formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <ReferenceLine y={thresholds.OPEN_BELOW} stroke="#B4492F" strokeDasharray="5 4" label={{ value: 'Open below', fontSize: 11, fill: '#B4492F', position: 'insideBottomRight' }} />
                  <ReferenceLine y={thresholds.FIELD_CAPACITY} stroke="#3E7C4F" strokeDasharray="5 4" label={{ value: 'Field capacity', fontSize: 11, fill: '#3E7C4F', position: 'insideTopRight' }} />
                  <Line name="Start, 0 m" dataKey="START_0M" stroke="#0E3B43" dot={false} strokeWidth={2} isAnimationActive={false} connectNulls />
                  <Line name="Middle, 5 m" dataKey="MID_5M" stroke="#D9951C" dot={false} strokeWidth={2} isAnimationActive={false} connectNulls />
                  <Line name="End, 10 m" dataKey="END_10M" stroke="#3E7C4F" dot={false} strokeWidth={2} isAnimationActive={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-inkSoft">
            <span><span className="mr-1 inline-block h-2 w-4 bg-ink align-middle" />Start, 0 m</span>
            <span><span className="mr-1 inline-block h-2 w-4 bg-turmeric align-middle" />Middle, 5 m</span>
            <span><span className="mr-1 inline-block h-2 w-4 bg-leaf align-middle" />End, 10 m</span>
          </div>
        </section>
      </div>
    </div>
  );
}
