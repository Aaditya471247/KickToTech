import { FormEvent, useState } from 'react';
import { Droplets } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ErrorNote, Field } from '../components/ui';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', phone: '', password: '', region: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(form.phone, form.password);
      else await register({ name: form.name, phone: form.phone, password: form.password, region: form.region || undefined });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-between bg-ink p-8 text-paper md:p-12">
        <div className="flex items-center gap-2 font-display text-2xl font-bold"><Droplets /> JalMitra</div>
        <div className="my-12 max-w-md">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">Every drop where the root needs it.</h1>
          <p className="mt-4 text-lg text-paper/80">Watch soil moisture along your crop row, let the drip valve shut itself off at the right moment, and keep a clear record of water, cost and profit.</p>
        </div>
        <p className="text-sm text-paper/60">Built for small farms facing dry seasons.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Sign in' : 'Create your account'}</h2>
          <ErrorNote message={error} />
          {mode === 'register' && <Field label="Full name"><input value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" /></Field>}
          <Field label="Mobile number"><input value={form.phone} onChange={set('phone')} required inputMode="numeric" maxLength={10} placeholder="10 digit number" autoComplete="tel" /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></Field>
          {mode === 'register' && <Field label="Village or district (optional)"><input value={form.region} onChange={set('region')} /></Field>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="w-full text-sm text-inkSoft underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Already registered? Sign in'}
          </button>
          {mode === 'login' && <p className="rounded-md bg-paper p-3 text-sm text-inkSoft">Demo account: 9999999999 with password demo1234</p>}
        </form>
      </div>
    </div>
  );
}
