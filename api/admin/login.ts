import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter((e) => e.trim());

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // When using email OTP, password login is disabled
  if (ADMIN_EMAILS.length > 0) {
    return res.status(400).json({ error: 'Use email OTP to sign in' });
  }

  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
    return res.status(200).json({ token });
  }
  return res.status(401).json({ error: 'Invalid password' });
}
