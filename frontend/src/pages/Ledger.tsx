import { FormEvent, useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { Audit, CropOption, CropStage, Farm, Portfolio, STAGES } from '../lib/types';
import { useApi } from '../lib/useApi';
import { Empty, ErrorNote, Field, PageHeader, Spinner, Stat } from '../components/ui';
import { inr, num, shortDate } from '../lib/format';

const today = () => new Date().toISOString().slice(0, 10);
const stageLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function Ledger() {
  const list = useApi<Portfolio[]>('/portfolios');
  const farms = useApi<Farm[]>('/farms');
  const crops = useApi<CropOption[]>('/advisory/crops');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Portfolio | null>(null);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ farmId: '', cropName: 'Finger Millet (Ragi)', variety: '', sowingDate: today() });
  const [rec, setRec] = useState({ date: today(), stage: 'SOWING' as CropStage, activity: '', expense: '', income: '', waterLitres: '', notes: '' });

  useEffect(() => { if (!selected && list.data?.length) setSelected(list.data[0].id); }, [list.data, selected]);
  useEffect(() => { if (!newForm.farmId && farms.data?.length) setNewForm((f) => ({ ...f, farmId: farms.data![0].id })); }, [farms.data, newForm.farmId]);

  async function load(id: string) {
    try {
      const [d, a] = await Promise.all([api<Portfolio>(`/portfolios/${id}`), api<Audit>(`/portfolios/${id}/audit`)]);
      setDetail(d);
      setAudit(a);
      setRec((r) => ({ ...r, stage: d.status }));
    } catch (e) { setError((e as Error).message); }
  }
  useEffect(() => { if (selected) load(selected); }, [selected]);

  async function createCycle(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const p = await api<Portfolio>('/portfolios', { body: newForm });
      list.setData((prev) => [{ ...p, farm: { id: p.farm?.id ?? newForm.farmId, name: farms.data?.find((f) => f.id === newForm.farmId)?.name ?? '' } }, ...(prev ?? [])]);
      setSelected(p.id);
      setShowNew(false);
    } catch (err) { setError((err as Error).message); }
  }

  async function addRecord(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      await api(`/portfolios/${selected}/records`, {
        body: { date: rec.date, stage: rec.stage, activity: rec.activity, expense: Number(rec.expense || 0), income: Number(rec.income || 0), waterLitres: Number(rec.waterLitres || 0), notes: rec.notes || undefined },
      });
      setRec({ ...rec, activity: '', expense: '', income: '', waterLitres: '', notes: '' });
      await load(selected);
      list.setData((prev) => prev); // keep list; status chip refreshes on next visit
    } catch (err) { setError((err as Error).message); }
  }

  const set = (k: string) => (e: { target: { value: string } }) => setRec({ ...rec, [k]: e.target.value });
  const stageIdx = detail ? STAGES.indexOf(detail.status) : 0;

  return (
    <div>
      <PageHeader title="Crop ledger">Log each crop cycle from sowing to harvest, track what you spend and earn, and see how much water drip irrigation saved.</PageHeader>
      <ErrorNote message={error} />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <button className="btn-primary w-full" onClick={() => setShowNew(!showNew)}><Plus size={18} /> New crop cycle</button>
          {showNew && (
            <form onSubmit={createCycle} className="panel space-y-3">
              <Field label="Farm"><select value={newForm.farmId} onChange={(e) => setNewForm({ ...newForm, farmId: e.target.value })}>{farms.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></Field>
              <Field label="Crop"><select value={newForm.cropName} onChange={(e) => setNewForm({ ...newForm, cropName: e.target.value })}>{crops.data?.map((c) => <option key={c.key} value={c.name}>{c.name}</option>)}</select></Field>
              <Field label="Variety (optional)"><input value={newForm.variety} onChange={(e) => setNewForm({ ...newForm, variety: e.target.value })} /></Field>
              <Field label="Sowing date"><input type="date" value={newForm.sowingDate} onChange={(e) => setNewForm({ ...newForm, sowingDate: e.target.value })} required /></Field>
              <button className="btn-primary w-full">Start cycle</button>
            </form>
          )}
          {list.loading && !list.data ? <Spinner /> : !list.data?.length ? <Empty>No crop cycles yet. Start your first one.</Empty> : (
            <ul className="space-y-2">{list.data.map((p) => (
              <li key={p.id}><button onClick={() => setSelected(p.id)} className={`w-full rounded-lg border p-3 text-left ${selected === p.id ? 'border-ink bg-paper' : 'border-line bg-paper/60 hover:bg-paper'}`}>
                <div className="font-display font-bold">{p.cropName}</div>
                <div className="text-sm text-inkSoft">Sown {shortDate(p.sowingDate)}, {p.farm.name}</div>
              </button></li>
            ))}</ul>
          )}
        </aside>

        {detail && audit ? (
          <div className="space-y-6">
            <section className="panel">
              <h2 className="text-2xl font-bold">{detail.cropName}{detail.variety ? `, ${detail.variety}` : ''}</h2>
              <ol className="mt-4 grid grid-cols-5 gap-1 text-center text-xs sm:text-sm">
                {STAGES.map((s, i) => (
                  <li key={s}><div className={`h-2 rounded-full ${i <= stageIdx ? 'bg-leaf' : 'bg-line'}`} /><div className={`mt-1 ${i === stageIdx ? 'font-bold' : 'text-inkSoft'}`}>{stageLabel(s)}</div></li>
                ))}
              </ol>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total expenses" value={inr(audit.financial.totalExpense)} />
              <Stat label="Total income" value={inr(audit.financial.totalIncome)} />
              <Stat label="Net profit" value={inr(audit.financial.netProfit)} tone={audit.financial.netProfit >= 0 ? 'good' : 'bad'} />
            </section>

            <section className="panel">
              <h3 className="text-xl font-bold">Water savings audit</h3>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                <div className="h-44">
                  <ResponsiveContainer>
                    <BarChart layout="vertical" data={[{ name: 'Flood irrigation', litres: audit.water.floodBaselineLitres }, { name: 'Your drip', litres: audit.water.dripLitres }]} margin={{ left: 20 }}>
                      <XAxis type="number" fontSize={12} tickFormatter={(v) => `${num(v / 1000)}k`} />
                      <YAxis type="category" dataKey="name" fontSize={12} width={95} />
                      <Tooltip formatter={(v: number) => `${num(v)} litres`} />
                      <Bar dataKey="litres" fill="#3E7C4F" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className={`font-display text-4xl font-bold ${audit.water.savedLitres >= 0 ? 'text-leaf' : 'text-clay'}`}>{num(audit.water.savedLitres)} L</div>
                  <div className="text-inkSoft">{audit.water.savedLitres >= 0 ? 'saved' : 'more than'} compared with flood irrigation ({audit.water.savedPercent}%)</div>
                  <div className="mt-2 text-lg font-medium">{inr(audit.water.costSaved)} less pumping cost</div>
                  <p className="mt-2 text-xs text-inkSoft">{audit.water.assumption} Crop is {audit.water.cropProgressPercent}% through its season.</p>
                </div>
              </div>
            </section>

            <section className="panel">
              <h3 className="mb-3 text-xl font-bold">Add a log entry</h3>
              <form onSubmit={addRecord} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Date"><input type="date" value={rec.date} onChange={set('date')} required /></Field>
                <Field label="Stage"><select value={rec.stage} onChange={set('stage')}>{STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}</select></Field>
                <Field label="What did you do?"><input value={rec.activity} onChange={set('activity')} required minLength={2} placeholder="Weeding, spray, sale…" /></Field>
                <Field label="Expense (₹)"><input type="number" min="0" value={rec.expense} onChange={set('expense')} /></Field>
                <Field label="Income (₹)"><input type="number" min="0" value={rec.income} onChange={set('income')} /></Field>
                <Field label="Water used by hand (litres)"><input type="number" min="0" value={rec.waterLitres} onChange={set('waterLitres')} /></Field>
                <div className="sm:col-span-2 lg:col-span-3"><Field label="Notes (optional)"><input value={rec.notes} onChange={set('notes')} /></Field></div>
                <div><button className="btn-primary">Save entry</button></div>
              </form>
            </section>

            <section className="panel overflow-x-auto">
              <h3 className="mb-3 text-xl font-bold">Logbook</h3>
              {!detail.records?.length ? <Empty>No entries yet.</Empty> : (
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-line text-inkSoft"><th className="py-2">Date</th><th>Stage</th><th>Activity</th><th className="text-right">Expense</th><th className="text-right">Income</th></tr></thead>
                  <tbody>{detail.records.map((r) => (
                    <tr key={r.id} className="border-b border-line/60 align-top"><td className="py-2">{shortDate(r.date)}</td><td>{stageLabel(r.stage)}</td><td>{r.activity}{r.notes && <div className="text-xs text-inkSoft">{r.notes}</div>}</td><td className="text-right">{r.expense ? inr(r.expense) : ''}</td><td className="text-right">{r.income ? inr(r.income) : ''}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </section>
          </div>
        ) : selected ? <Spinner /> : <Empty>Select or create a crop cycle to see its ledger.</Empty>}
      </div>
    </div>
  );
}
