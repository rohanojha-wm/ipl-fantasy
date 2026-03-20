import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { requireAdminAuth } from '../../lib/auth.js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    const { status, error } = auth;
    return res.status(status).json({ error });
  }

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'Missing participant id' });

  try {
    const supabase = getSupabase();

    if (req.method === 'PATCH') {
      const { data, error } = await supabase.from('participants').update(req.body || {}).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('participants').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
