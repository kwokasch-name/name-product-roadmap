import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, query } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test database connection
    await query('SELECT 1');
    return res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
}
