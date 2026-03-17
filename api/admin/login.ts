import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    // Simple token - in production use JWT with expiry
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
    return res.status(200).json({ token });
  }
  return res.status(401).json({ error: 'Invalid password' });
}
