import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

function requireAuth(req: VercelRequest): boolean {
  const auth = req.headers.authorization;
  return !!auth?.startsWith('Bearer ');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabase = getSupabase();

    if (req.method === 'POST') {
      const { season_id, match_date, match_time, team1, team2, venue, match_type } = req.body || {};
      if (!season_id || !match_date || !team1 || !team2 || !match_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const { data, error } = await supabase.from('matches').insert({
        season_id,
        match_date,
        match_time: match_time || null,
        team1,
        team2,
        venue: venue || null,
        match_type,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
