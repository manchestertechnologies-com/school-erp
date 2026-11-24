const KEY = 'mt-token';
/** Backend address. Empty when the API is on the same site; set VITE_API_URL when the frontend is hosted separately (for example on Vercel). */
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getToken(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(t: string | null) {
  try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(BASE + '/api' + path, {
    method: opts.method || 'GET',
    headers: {
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(data?.error || 'Something went wrong. Please try again.', res.status);
  return data as T;
}

export async function upload(file: File): Promise<{ url: string }> {
  const token = getToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(BASE + '/api/uploads', { method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Upload failed.', res.status);
  return data;
}
