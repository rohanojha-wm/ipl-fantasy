const API_BASE = '/api';

async function getAdminToken(): Promise<string | null> {
  return sessionStorage.getItem('admin_token');
}

const DEV_ADMIN_PASSWORD = 'admin123';
const VITE_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;

export async function getAuthMode(): Promise<'otp' | 'password'> {
  try {
    const res = await fetch(`${API_BASE}/admin/auth-mode`);
    if (res.ok) {
      const { mode } = await res.json();
      return mode === 'otp' ? 'otp' : 'password';
    }
  } catch {
    /* ignore */
  }
  return 'password';
}

export async function adminLoginWithOtp(email: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await import('./supabase');
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
  if (error) return { ok: false, error: error.message };
  if (data.session?.access_token) {
    sessionStorage.setItem('admin_token', data.session.access_token);
    return { ok: true };
  }
  return { ok: false, error: 'Verification failed' };
}

export async function adminRequestOtp(email: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await import('./supabase');
  if (!supabase) return { ok: false, error: 'Supabase not configured' };
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function adminLogin(password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const { token } = await res.json();
      if (token) {
        sessionStorage.setItem('admin_token', token);
        return true;
      }
    }
    // Dev fallback: when API not available (e.g. npm run dev), allow configured password
    if (import.meta.env.DEV && (password === DEV_ADMIN_PASSWORD || (VITE_ADMIN_PASSWORD && password === VITE_ADMIN_PASSWORD))) {
      sessionStorage.setItem('admin_token', 'dev-admin-token');
      return true;
    }
  } catch {
    // Dev fallback: API unreachable (404, network error)
    if (import.meta.env.DEV && (password === DEV_ADMIN_PASSWORD || (VITE_ADMIN_PASSWORD && password === VITE_ADMIN_PASSWORD))) {
      sessionStorage.setItem('admin_token', 'dev-admin-token');
      return true;
    }
  }
  return false;
}

export async function adminLogout(): Promise<void> {
  sessionStorage.removeItem('admin_token');
  const { supabase } = await import('./supabase');
  if (supabase) supabase.auth.signOut();
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminToken();
  if (!token) return false;
  // Dev fallback: accept dev token when API not available
  if (import.meta.env.DEV && token === 'dev-admin-token') return true;
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return import.meta.env.DEV && token === 'dev-admin-token';
  }
}

async function adminFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = await getAdminToken();
  if (!token) throw new Error('Not authenticated');
  // Dev fallback: API not available - show helpful error
  if (import.meta.env.DEV && token === 'dev-admin-token') {
    throw new Error('Admin API requires "vercel dev" to run. Use "npm run dev:full" for full stack.');
  }
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Admin API error: ${res.status}`);
  }
  return res.json();
}

export const adminApi = {
  createMatch: (seasonId: string, data: Record<string, unknown>) =>
    adminFetch('/admin/matches', {
      method: 'POST',
      body: JSON.stringify({ season_id: seasonId, ...data }),
    }),

  updateMatch: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/admin/matches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteMatch: (id: string) =>
    adminFetch(`/admin/matches/${id}`, { method: 'DELETE' }),

  setStandings: (matchId: string, standings: { position: number; participant_ids: string[]; amounts?: Record<string, number> }[]) =>
    adminFetch(`/admin/matches/${matchId}/standings`, {
      method: 'POST',
      body: JSON.stringify({ standings }),
    }),

  createParticipant: (seasonId: string, data: Record<string, unknown>) =>
    adminFetch('/admin/participants', {
      method: 'POST',
      body: JSON.stringify({ season_id: seasonId, ...data }),
    }),

  updateParticipant: (id: string, data: Record<string, unknown>) =>
    adminFetch(`/admin/participants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteParticipant: (id: string) =>
    adminFetch(`/admin/participants/${id}`, { method: 'DELETE' }),

  updatePayoutConfig: (seasonId: string, phase: string, config: Record<string, number>) =>
    adminFetch('/admin/payout-config', {
      method: 'POST',
      body: JSON.stringify({ season_id: seasonId, phase, ...config }),
    }),
};
