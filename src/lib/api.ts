const API_BASE = '/api';

async function getAdminToken(): Promise<string | null> {
  return sessionStorage.getItem('admin_token');
}

const DEV_ADMIN_PASSWORD = 'admin123';

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
    // Dev fallback: when API not available (e.g. npm run dev), allow admin123
    if (import.meta.env.DEV && password === DEV_ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_token', 'dev-admin-token');
      return true;
    }
  } catch {
    // Dev fallback: API unreachable (404, network error)
    if (import.meta.env.DEV && password === DEV_ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_token', 'dev-admin-token');
      return true;
    }
  }
  return false;
}

export async function adminLogout(): Promise<void> {
  sessionStorage.removeItem('admin_token');
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

  setStandings: (matchId: string, standings: { position: number; participant_ids: string[] }[]) =>
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
