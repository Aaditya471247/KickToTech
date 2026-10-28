import { NavLink, Outlet } from 'react-router-dom';
import { Bug, Droplets, LineChart, LogOut, NotebookPen, Sprout } from 'lucide-react';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/', label: 'Field', icon: Droplets },
  { to: '/remedies', label: 'Remedies', icon: Bug },
  { to: '/soil', label: 'Soil health', icon: Sprout },
  { to: '/market', label: 'Market', icon: LineChart },
  { to: '/ledger', label: 'Crop ledger', icon: NotebookPen },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-md px-3 py-2 font-medium transition-colors ${isActive ? 'bg-ink text-paper' : 'text-ink hover:bg-line/60'}`;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="hidden flex-col border-r border-line bg-paper p-4 md:flex">
        <div className="mb-8 px-3 pt-2">
          <div className="font-display text-2xl font-bold">JalMitra</div>
          <div className="text-sm text-inkSoft">Smart farm</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={link}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 pt-4 text-sm">
          <div className="font-medium">{user?.name}</div>
          <div className="mb-3 text-inkSoft">{user?.region}</div>
          <button onClick={logout} className="flex items-center gap-2 text-inkSoft hover:text-ink"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>

      <div>
        <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:hidden">
          <span className="font-display text-xl font-bold">JalMitra</span>
          <button onClick={logout} aria-label="Sign out" className="text-inkSoft"><LogOut size={20} /></button>
        </header>
        <main className="mx-auto max-w-6xl p-4 pb-28 md:p-8"><Outlet /></main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-line bg-paper md:hidden">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-xs ${isActive ? 'font-semibold text-ink' : 'text-inkSoft'}`}>
            <n.icon size={20} /> {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
