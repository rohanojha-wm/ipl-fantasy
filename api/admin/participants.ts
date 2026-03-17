import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function requireAuth(req: VercelRequest): boolean {
  return !!req.headers.authorization?.startsWith('Bearer ');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req)) return res.status(401).json({ error: 'Unauthorized' });

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
