import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, query } from '../_lib/db.js';
import { isJiraConfigured, getEpic, mapEpicToInitiativeFields } from '../_lib/jira.js';

const SYNC_STALE_MINUTES = 15;

async function syncInitiativeFromJira(initiativeId: string, epicKey: string) {
  const epic = await getEpic(epicKey);
  const fields = mapEpicToInitiativeFields(epic);

  await query(
    `UPDATE initiatives
     SET title = $1, description = $2, status = $3, start_date = $4, end_date = $5,
         jira_last_synced_at = NOW(), updated_at = NOW()
     WHERE id = $6`,
    [fields.title, fields.description, fields.status, fields.startDate, fields.endDate, initiativeId]
  );

  const result = await query('SELECT * FROM initiatives WHERE id = $1', [initiativeId]);
  return result.rows[0];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isJiraConfigured()) {
    return res.status(503).json({ error: 'Jira is not configured on this server.' });
  }

  // Check if syncing a single initiative (id in body) or all stale ones
  const { id } = req.body || {};

  try {
    if (id) {
      // Sync single initiative
      const result = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      if (!result.rows.length) {
        return res.status(404).json({ error: 'Initiative not found' });
      }
      const row = result.rows[0];
      if (!row.jira_epic_key) {
        return res.status(400).json({ error: 'Initiative is not linked to a Jira epic' });
      }
      const updated = await syncInitiativeFromJira(row.id, row.jira_epic_key);
      return res.json(updated);
    }

    // Sync all stale linked initiatives
    const staleTime = new Date(Date.now() - SYNC_STALE_MINUTES * 60 * 1000).toISOString();
    const linked = await query(
      `SELECT * FROM initiatives
       WHERE jira_epic_key IS NOT NULL
         AND jira_sync_enabled = TRUE
         AND (jira_last_synced_at IS NULL OR jira_last_synced_at < $1)`,
      [staleTime]
    );

    const results = await Promise.allSettled(
      linked.rows.map(row => syncInitiativeFromJira(row.id, row.jira_epic_key))
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return res.json({ synced, failed, total: linked.rows.length });
  } catch (error: any) {
    console.error('Error syncing Jira initiatives:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync initiatives' });
  }
}
