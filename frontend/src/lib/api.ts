const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const TOKEN_KEY = 'jalmitra_token';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Thin fetch wrapper: adds the JWT, unwraps { data }, and turns { error } into a thrown ApiError. */
export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    const detail = json?.details?.[0]?.message ? `: ${json.details[0].message}` : '';
    throw new ApiError((json?.error ?? res.statusText) + detail, res.status);
  }
  return json.data as T;
}

export const apiBase = BASE_URL;
