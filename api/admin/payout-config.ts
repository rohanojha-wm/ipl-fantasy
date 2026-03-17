import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '../lib/auth';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { season_id, phase, position_1st, position_2nd, position_3rd, position_4th, position_5th } = req.body || {};
  if (!season_id || !phase) return res.status(400).json({ error: 'season_id and phase required' });

  try {
    const supabase = getSupabase();
    const config = {
      position_1st: position_1st ?? 0,
      position_2nd: position_2nd ?? 0,
      position_3rd: position_3rd ?? 0,
      position_4th: position_4th ?? 0,
      position_5th: position_5th ?? 0,
    };

    const { data, error } = await supabase.from('payout_config').upsert(
      { season_id, phase, ...config },
      { onConflict: 'season_id,phase' }
    ).select().single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
