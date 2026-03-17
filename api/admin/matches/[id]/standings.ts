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

const MATCH_TYPE_TO_PHASE: Record<string, string> = {
  round_robin: 'round_robin',
  qualifier1: 'knockout',
  qualifier2: 'knockout',
  eliminator: 'knockout',
  final: 'final',
};

const PHASE_POSITION_KEYS = ['position_1st', 'position_2nd', 'position_3rd', 'position_4th', 'position_5th'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAuth(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const matchId = req.query.id as string;
  if (!matchId) return res.status(400).json({ error: 'Missing match id' });

  const { standings } = req.body || {};
  if (!Array.isArray(standings)) return res.status(400).json({ error: 'standings must be array' });

  try {
    const supabase = getSupabase();

    const { data: match, error: matchErr } = await supabase.from('matches').select('season_id, match_type').eq('id', matchId).single();
    if (matchErr || !match) return res.status(404).json({ error: 'Match not found' });

    const phase = MATCH_TYPE_TO_PHASE[match.match_type] || 'round_robin';
    const { data: config, error: configErr } = await supabase.from('payout_config').select('*').eq('season_id', match.season_id).eq('phase', phase).single();
    if (configErr || !config) return res.status(400).json({ error: 'Payout config not found for phase: ' + phase });

    await supabase.from('standings').delete().eq('match_id', matchId);

    const toInsert: { match_id: string; position: number; participant_id: string; dollars_earned: number }[] = [];

    for (const s of standings) {
      const pos = parseInt(s.position, 10);
      const pids = Array.isArray(s.participant_ids) ? s.participant_ids : [s.participant_id].filter(Boolean);
      if (pos < 1 || pos > 5 || pids.length === 0) continue;

      const key = PHASE_POSITION_KEYS[pos - 1];
      const total = (config as Record<string, number>)[key] || 0;
      const each = total / pids.length;

      for (const pid of pids) {
        toInsert.push({ match_id: matchId, position: pos, participant_id: pid, dollars_earned: each });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase.from('standings').insert(toInsert);
      if (insertErr) throw insertErr;
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
