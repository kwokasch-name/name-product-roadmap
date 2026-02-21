import { Router } from 'express';
import db from '../db/database.js';
import { isJiraConfigured, getEpic, searchEpics, updateEpic, mapEpicToInitiativeFields } from '../services/jira.js';

const router = Router();

const SYNC_STALE_MINUTES = 15;

// GET /api/jira/status - Check if Jira is configured
router.get('/status', (req, res) => {
  res.json({ configured: isJiraConfigured() });
});

// GET /api/jira/search?q=<query> - Search Jira epics
router.get('/search', async (req, res) => {
  if (!isJiraConfigured()) {
    return res.status(503).json({ error: 'Jira is not configured on this server.' });
  }

  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const epics = await searchEpics(q);
    res.json(epics);
  } catch (error: any) {
    console.error('Error searching Jira epics:', error);
    res.status(502).json({ error: error.message || 'Failed to search Jira epics' });
  }
});

// POST /api/jira/sync - Sync all stale linked initiatives from Jira
router.post('/sync', async (req, res) => {
  if (!isJiraConfigured()) {
    return res.status(503).json({ error: 'Jira is not configured on this server.' });
  }

  try {
    const staleTime = new Date(Date.now() - SYNC_STALE_MINUTES * 60 * 1000).toISOString();
    const linked = db.prepare(
      `SELECT * FROM initiatives
       WHERE jira_epic_key IS NOT NULL
         AND jira_sync_enabled = 1
         AND (jira_last_synced_at IS NULL OR jira_last_synced_at < ?)`
    ).all(staleTime) as any[];

    const results = await Promise.allSettled(
      linked.map(row => syncInitiativeFromJira(row.id, row.jira_epic_key))
    );

    const synced = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ synced, failed, total: linked.length });
  } catch (error: any) {
    console.error('Error syncing all Jira initiatives:', error);
    res.status(500).json({ error: error.message || 'Failed to sync initiatives' });
  }
});

// POST /api/jira/sync/:id - Sync a single initiative from Jira
router.post('/sync/:id', async (req, res) => {
  if (!isJiraConfigured()) {
    return res.status(503).json({ error: 'Jira is not configured on this server.' });
  }

  const row = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    return res.status(404).json({ error: 'Initiative not found' });
  }
  if (!row.jira_epic_key) {
    return res.status(400).json({ error: 'Initiative is not linked to a Jira epic' });
  }

  try {
    const updated = await syncInitiativeFromJira(row.id, row.jira_epic_key);
    res.json(updated);
  } catch (error: any) {
    console.error(`Error syncing initiative ${req.params.id} from Jira:`, error);
    res.status(502).json({ error: error.message || 'Failed to sync from Jira' });
  }
});

async function syncInitiativeFromJira(initiativeId: number, epicKey: string) {
  const epic = await getEpic(epicKey);
  const fields = mapEpicToInitiativeFields(epic);

  db.prepare(
    `UPDATE initiatives
     SET title = ?, description = ?, status = ?, start_date = ?, end_date = ?,
         jira_last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    fields.title,
    fields.description,
    fields.status,
    fields.startDate,
    fields.endDate,
    initiativeId
  );

  return db.prepare('SELECT * FROM initiatives WHERE id = ?').get(initiativeId);
}

export { syncInitiativeFromJira };
export default router;
