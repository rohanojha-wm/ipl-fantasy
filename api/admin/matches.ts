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
