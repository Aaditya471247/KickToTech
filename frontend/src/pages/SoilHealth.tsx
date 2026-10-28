import { FormEvent, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { CropOption, Fertilizer } from '../lib/types';
import { useApi } from '../lib/useApi';
import { ErrorNote, Field, PageHeader, Spinner, Stat } from '../components/ui';
import { num } from '../lib/format';

interface Plan {
  crop: { name: string; durationDays: number };
  acres: number;
  requirementKg: { n: number; p: number; k: number };
  vermicompost: { kg: number; tonnes: number; suppliesKg: { n: number; p: number; k: number } };
  remainingGapKg: { n: number; p: number; k: number };
  jeevamrut: { rounds: number; perRound: { cowDungKg: number; cowUrineL: number; jaggeryKg: number; besanKg: number; waterL: number }; total: { cowDungKg: number; cowUrineL: number; jaggeryKg: number; besanKg: number } };
  panchagavya: { sprays: number; litresPerSpray: number; totalLitres: number };
  soilCarbon: { organicCarbonAddedKg: number; estimatedStableCarbonKg: number; soilOrganicCarbonRisePct: number };
  notes: string[];
}

export default function SoilHealth() {
  const fert = useApi<Fertilizer[]>('/advisory/fertilizers');
  const crops = useApi<CropOption[]>('/advisory/crops');
  const [open, setOpen] = useState<string | null>(null);
  const [crop, setCrop] = useState('ragi');
  const [acres, setAcres] = useState('1');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function calculate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setPlan(await api<Plan>(`/advisory/calculator?crop=${encodeURIComponent(crop)}&acres=${encodeURIComponent(acres)}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <PageHeader title="Soil health planner">Tell us your crop and land, and get a natural fertilizer plan with exact quantities.</PageHeader>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <form onSubmit={calculate} className="panel h-fit space-y-4">
            <Field label="Crop">
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>{crops.data?.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
            </Field>
            <Field label="Land area (acres)"><input type="number" min="0.1" step="0.1" value={acres} onChange={(e) => setAcres(e.target.value)} required /></Field>
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Working it out…' : 'Get my plan'}</button>
            <ErrorNote message={error} />
          </form>

          {!plan ? <div className="panel flex items-center justify-center text-inkSoft">Your plan will appear here.</div> : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Nitrogen needed" value={`${num(plan.requirementKg.n, 1)} kg`} />
                <Stat label="Phosphorus needed" value={`${num(plan.requirementKg.p, 1)} kg`} />
                <Stat label="Potash needed" value={`${num(plan.requirementKg.k, 1)} kg`} />
              </div>
              <div className="panel">
                <h3 className="text-lg font-bold">Base: vermicompost</h3>
                <p className="text-3xl font-bold font-display">{num(plan.vermicompost.kg)} kg <span className="text-base font-normal text-inkSoft">({plan.vermicompost.tonnes} tonnes) before sowing</span></p>
                <p className="mt-1 text-inkSoft">Supplies about {plan.vermicompost.suppliesKg.n} kg N, {plan.vermicompost.suppliesKg.p} kg P and {plan.vermicompost.suppliesKg.k} kg K. Still to cover: {plan.remainingGapKg.n} kg N, {plan.remainingGapKg.p} kg P, {plan.remainingGapKg.k} kg K.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel">
                  <h3 className="text-lg font-bold">Jeevamrut, {plan.jeevamrut.rounds} monthly rounds</h3>
                  <p className="text-sm text-inkSoft">Each round: {plan.jeevamrut.perRound.waterL} L water, {plan.jeevamrut.perRound.cowDungKg} kg cow dung, {plan.jeevamrut.perRound.cowUrineL} L cow urine, {plan.jeevamrut.perRound.jaggeryKg} kg jaggery, {plan.jeevamrut.perRound.besanKg} kg gram flour.</p>
                  <p className="mt-2 text-sm">Whole season: {plan.jeevamrut.total.cowDungKg} kg dung, {plan.jeevamrut.total.cowUrineL} L urine, {plan.jeevamrut.total.jaggeryKg} kg jaggery, {plan.jeevamrut.total.besanKg} kg gram flour.</p>
                </div>
                <div className="panel">
                  <h3 className="text-lg font-bold">Panchagavya sprays</h3>
                  <p className="text-sm text-inkSoft">{plan.panchagavya.sprays} sprays at 3%, using {plan.panchagavya.litresPerSpray} L each, {plan.panchagavya.totalLitres} L in total.</p>
                  <h3 className="mt-4 text-lg font-bold">Soil carbon</h3>
                  <p className="text-sm text-inkSoft">Adds about {num(plan.soilCarbon.organicCarbonAddedKg)} kg organic carbon, of which roughly {num(plan.soilCarbon.estimatedStableCarbonKg)} kg stays in the soil (a rise of about {plan.soilCarbon.soilOrganicCarbonRisePct}% in the top 15 cm). Estimate only.</p>
                </div>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-inkSoft">{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
              <p className="text-xs text-inkSoft">Based on typical nutrient needs for semi-arid Maharashtra. A soil test and your local KVK can refine these numbers.</p>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Recipes</h2>
        {fert.loading && !fert.data ? <Spinner /> : (
          <div className="space-y-3">
            {fert.data?.map((f) => (
              <div key={f.id} className="panel !p-0">
                <button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>
                  <div><div className="font-display text-xl font-bold">{f.name}</div><div className="text-sm text-inkSoft">{f.summary}</div></div>
                  <ChevronDown className={`shrink-0 transition-transform ${open === f.id ? 'rotate-180' : ''}`} />
                </button>
                {open === f.id && (
                  <div className="grid gap-5 border-t border-line p-5 md:grid-cols-2">
                    <div><h3 className="mb-1 font-bold">Ingredients</h3><ul className="list-disc space-y-1 pl-5">{f.ingredients.map((i) => <li key={i}>{i}</li>)}</ul>
                      <h3 className="mb-1 mt-4 font-bold">Benefits</h3><ul className="list-disc space-y-1 pl-5">{f.benefits.map((b) => <li key={b}>{b}</li>)}</ul></div>
                    <div><h3 className="mb-1 font-bold">Steps (ready in about {f.curingDays} days)</h3><ol className="list-decimal space-y-1 pl-5">{f.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                      <div className="mt-4 rounded-md bg-field p-3"><span className="font-bold">How to use: </span>{f.applicationRate}</div></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
