import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from '../_lib/db.js';
import { isJiraConfigured, searchEpics } from '../_lib/jira.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isJiraConfigured()) {
    return res.status(503).json({ error: 'Jira is not configured on this server.' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const epics = await searchEpics(q);
    return res.json(epics);
  } catch (error: any) {
    console.error('Error searching Jira epics:', error);
    return res.status(502).json({ error: error.message || 'Failed to search Jira epics' });
  }
}
