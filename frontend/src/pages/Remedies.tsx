import { useEffect, useState } from 'react';
import { Search, ShieldAlert } from 'lucide-react';
import { Remedy } from '../lib/types';
import { useApi } from '../lib/useApi';
import { Chip, Empty, ErrorNote, PageHeader, Spinner } from '../components/ui';

export default function Remedies() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<'' | 'PEST' | 'DISEASE'>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  if (debounced) params.set('q', debounced);
  if (category) params.set('category', category);
  const { data, error, loading } = useApi<Remedy[]>(`/advisory/remedies?${params}`);
  const selected = data?.find((r) => r.id === selectedId) ?? data?.[0] ?? null;

  return (
    <div>
      <PageHeader title="Natural remedies">Zero-chemical sprays and treatments you can make from the farm. Search by pest, disease or remedy name.</PageHeader>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-3 text-inkSoft" />
          <input className="!pl-9" placeholder="Try aphids, mildew or neem" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search remedies" />
        </div>
        <Chip active={category === ''} onClick={() => setCategory('')}>All</Chip>
        <Chip active={category === 'PEST'} onClick={() => setCategory('PEST')}>Pests</Chip>
        <Chip active={category === 'DISEASE'} onClick={() => setCategory('DISEASE')}>Diseases</Chip>
      </div>
      <ErrorNote message={error} />
      {loading && !data ? <Spinner /> : !data?.length ? <Empty>No remedy matches. Try a different pest or clear the filter.</Empty> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <ul className="space-y-2">
            {data.map((r) => (
              <li key={r.id}>
                <button onClick={() => setSelectedId(r.id)} className={`w-full rounded-lg border p-4 text-left transition-colors ${selected?.id === r.id ? 'border-ink bg-paper' : 'border-line bg-paper/60 hover:bg-paper'}`}>
                  <div className="font-display text-lg font-bold">{r.remedyName}</div>
                  <div className="text-sm text-inkSoft">{r.targetPest}</div>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <article className="panel space-y-5">
              <header>
                <span className="rounded-full bg-field px-3 py-0.5 text-sm">{selected.category === 'PEST' ? 'Pest control' : 'Disease control'}</span>
                <h2 className="mt-2 text-2xl font-bold">{selected.remedyName}</h2>
                <p className="text-inkSoft">Works on: {selected.targetPest}</p>
              </header>
              <section><h3 className="mb-1 font-bold">What you need</h3><ul className="list-disc space-y-1 pl-5">{selected.ingredients.map((i) => <li key={i}>{i}</li>)}</ul></section>
              <section><h3 className="mb-1 font-bold">How to prepare</h3><ol className="list-decimal space-y-1 pl-5">{selected.preparation.map((s) => <li key={s}>{s}</li>)}</ol></section>
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md bg-field p-4"><h3 className="font-bold">How much</h3><p>{selected.dosage}</p></div>
                <div className="rounded-md bg-field p-4"><h3 className="font-bold">When to apply</h3><p>{selected.timing}</p></div>
              </section>
              <section className="flex gap-3 rounded-md border border-turmeric/50 bg-turmeric/10 p-4"><ShieldAlert className="mt-0.5 shrink-0 text-turmeric" size={20} /><div><h3 className="font-bold">Stay safe</h3><p>{selected.safety}</p></div></section>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
