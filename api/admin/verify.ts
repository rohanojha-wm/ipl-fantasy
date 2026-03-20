import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminAuth } from '../lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await requireAdminAuth(req);
    if (result.ok) return res.status(200).json({ ok: true });
    return res.status(result.status).json({ error: result.error });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: (err as Error).message || 'Internal error' });
  }
}
