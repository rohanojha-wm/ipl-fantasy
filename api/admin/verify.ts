import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    // For now, any Bearer token from login is valid
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
