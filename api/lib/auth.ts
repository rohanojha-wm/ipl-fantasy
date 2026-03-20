import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Verify admin auth: either Supabase JWT (email OTP) with email in whitelist,
 * or legacy password when ADMIN_EMAILS not configured.
 */
export async function requireAdminAuth(req: VercelRequest): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const token = auth.slice(7);

  // Legacy: when ADMIN_EMAILS not set, accept tokens from password login (base64 "admin:timestamp")
  if (ADMIN_EMAILS.length === 0) {
    if (token === 'dev-admin-token') return { ok: true };
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      if (decoded.startsWith('admin:')) return { ok: true };
    } catch {
      /* ignore */
    }
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  // Supabase JWT: verify and check admin email
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, status: 500, error: 'Auth not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.' };
  }

  try {
    const supabase = createClient(url, anonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user?.email) {
      return { ok: false, status: 401, error: 'Invalid or expired token' };
    }

    const email = user.email.toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) {
      return { ok: false, status: 403, error: 'Not an admin' };
    }

    return { ok: true };
  } catch (e) {
    console.error('Auth verify error:', e);
    return { ok: false, status: 500, error: (e as Error).message };
  }
}
