import { ReactNode } from 'react';

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {children && <p className="mt-1 max-w-prose text-inkSoft">{children}</p>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="mb-4 rounded-md border border-clay/40 bg-clay/10 px-4 py-3 text-clay">{message}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-md border border-dashed border-line px-4 py-8 text-center text-inkSoft">{children}</div>;
}

export function Spinner() {
  return <div className="py-10 text-center text-inkSoft" role="status">Loading…</div>;
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-leaf' : tone === 'bad' ? 'text-clay' : 'text-ink';
  return (
    <div className="panel">
      <div className="text-sm text-inkSoft">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${active ? 'border-ink bg-ink text-paper' : 'border-line bg-paper hover:bg-field'}`}>
      {children}
    </button>
  );
}
