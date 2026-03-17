import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const emails = (process.env.ADMIN_EMAILS || '').split(',').filter((e) => e.trim());
  return res.status(200).json({ mode: emails.length > 0 ? 'otp' : 'password' });
}
