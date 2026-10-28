import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { api, TOKEN_KEY } from './api';
import { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: { name: string; phone: string; password: string; region?: string }) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api<User>('/auth/me').then(setUser).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setLoading(false));
  }, []);

  const finish = (r: { token: string; user: User }) => {
    localStorage.setItem(TOKEN_KEY, r.token);
    setUser(r.user);
  };
  const value: AuthCtx = {
    user,
    loading,
    login: async (phone, password) => finish(await api('/auth/login', { body: { phone, password } })),
    register: async (data) => finish(await api('/auth/register', { body: data })),
    logout: () => {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
