import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '../../../lib/auth.js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
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
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    const { status, error } = auth;
    return res.status(status).json({ error });
  }
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

    // Tie logic (pooled): when N people tie for a slot, they split the combined payout
    // for positions P..P+N-1 (e.g. 2 tied for 2nd → split 2nd+3rd place money)
    const toInsert: { match_id: string; position: number; participant_id: string; dollars_earned: number }[] = [];
    const cfg = config as Record<string, number>;
    let nextSlotStart = 1;

    const sorted = [...standings].sort((a, b) => parseInt(String(a.position), 10) - parseInt(String(b.position), 10));
    const amountsOverride = (standings as { position: number; participant_ids: string[]; amounts?: Record<string, number> }[])
      .reduce((acc, s) => ({ ...acc, ...(s.amounts || {}) }), {});

    for (const s of sorted) {
      const slotPos = parseInt(s.position, 10);
      const pids = Array.isArray(s.participant_ids) ? s.participant_ids : [s.participant_id].filter(Boolean);
      if (slotPos < 1 || slotPos > 5 || pids.length === 0) continue;

      const count = pids.length;
      let pool = 0;
      for (let i = 0; i < count && nextSlotStart + i <= 5; i++) {
        const key = PHASE_POSITION_KEYS[nextSlotStart + i - 1];
        pool += cfg[key] || 0;
      }
      const defaultEach = count > 0 ? pool / count : 0;

      for (const pid of pids) {
        const amt = amountsOverride[pid] !== undefined ? Number(amountsOverride[pid]) : defaultEach;
        toInsert.push({ match_id: matchId, position: slotPos, participant_id: pid, dollars_earned: amt });
      }
      nextSlotStart += count;
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
