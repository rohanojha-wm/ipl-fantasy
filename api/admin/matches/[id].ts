import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminAuth } from '../../lib/auth.js';
import { getSupabase } from '../../lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdminAuth(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const id = req.query.id as string;
  if (!id) return res.status(400).json({ error: 'Missing match id' });

  try {
    const supabase = getSupabase();

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const { data, error } = await supabase.from('matches').update(body).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
