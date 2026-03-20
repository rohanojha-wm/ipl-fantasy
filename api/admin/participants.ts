import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminAuth } from '../lib/auth.js';
import { getSupabase } from '../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'POST') {
      const body = req.body || {};
      const { season_id, ...rest } = body;
      if (!season_id) return res.status(400).json({ error: 'season_id required' });
      const { data, error } = await supabase.from('participants').insert({ season_id, ...rest }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
