import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdminAuth } from '../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const result = await requireAdminAuth(req);
  if (result.ok) return res.status(200).json({ ok: true });
  return res.status(result.status).json({ error: result.error });
}
