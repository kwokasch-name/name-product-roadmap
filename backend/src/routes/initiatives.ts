import { Router } from 'express';
import db from '../db/database.js';
import type { Initiative, CreateInitiativeInput, UpdateInitiativeInput } from '../types/index.js';
import { isJiraConfigured, getEpic, mapEpicToInitiativeFields } from '../services/jira.js';

const router = Router();

function rowToInitiative(row: any): Initiative {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    developerCount: row.developer_count,
    okrId: row.okr_id,
    successCriteria: row.success_criteria,
    pod: row.pod,
    status: row.status,
    jiraEpicKey: row.jira_epic_key ?? null,
    jiraSyncEnabled: Boolean(row.jira_sync_enabled ?? 1),
    jiraLastSyncedAt: row.jira_last_synced_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function enrichWithOKR(initiative: Initiative): Initiative {
  if (initiative.okrId) {
    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(initiative.okrId) as any;
    if (okr) {
      initiative.okr = {
        id: okr.id,
        title: okr.title,
        description: okr.description,
        timeFrame: okr.time_frame,
        createdAt: okr.created_at,
        updatedAt: okr.updated_at,
      };
    }
  }
  return initiative;
}

// GET /api/initiatives - List all initiatives
router.get('/', (req, res) => {
  try {
    const { pod, okr_id, status } = req.query;
    let query = 'SELECT * FROM initiatives WHERE 1=1';
    const params: any[] = [];

    if (pod) {
      query += ' AND pod = ?';
      params.push(pod);
    }
    if (okr_id) {
      query += ' AND okr_id = ?';
      params.push(okr_id);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const initiatives = db.prepare(query).all(...params) as any[];
    res.json(initiatives.map(row => enrichWithOKR(rowToInitiative(row))));
  } catch (error) {
    console.error('Error fetching initiatives:', error);
    res.status(500).json({ error: 'Failed to fetch initiatives' });
  }
});

// GET /api/initiatives/scoped - Get initiatives with dates (for roadmap)
router.get('/scoped', (req, res) => {
  try {
    const initiatives = db.prepare(
      'SELECT * FROM initiatives WHERE start_date IS NOT NULL AND end_date IS NOT NULL ORDER BY start_date ASC'
    ).all() as any[];
    res.json(initiatives.map(row => enrichWithOKR(rowToInitiative(row))));
  } catch (error) {
    console.error('Error fetching scoped initiatives:', error);
    res.status(500).json({ error: 'Failed to fetch scoped initiatives' });
  }
});

// GET /api/initiatives/unscoped - Get initiatives without dates
router.get('/unscoped', (req, res) => {
  try {
    const initiatives = db.prepare(
      'SELECT * FROM initiatives WHERE start_date IS NULL OR end_date IS NULL ORDER BY created_at DESC'
    ).all() as any[];
    res.json(initiatives.map(row => enrichWithOKR(rowToInitiative(row))));
  } catch (error) {
    console.error('Error fetching unscoped initiatives:', error);
    res.status(500).json({ error: 'Failed to fetch unscoped initiatives' });
  }
});

// GET /api/initiatives/:id - Get single initiative
router.get('/:id', (req, res) => {
  try {
    const initiative = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(req.params.id) as any;
    if (!initiative) {
      return res.status(404).json({ error: 'Initiative not found' });
    }
    res.json(enrichWithOKR(rowToInitiative(initiative)));
  } catch (error) {
    console.error('Error fetching initiative:', error);
    res.status(500).json({ error: 'Failed to fetch initiative' });
  }
});

// POST /api/initiatives - Create new initiative
router.post('/', async (req, res) => {
  try {
    let { title, description, startDate, endDate, developerCount, okrId, successCriteria, pod, status, jiraEpicKey, jiraSyncEnabled } = req.body as CreateInitiativeInput;

    if (!pod || !['Retail Therapy', 'JSON ID'].includes(pod)) {
      return res.status(400).json({ error: 'Pod must be "Retail Therapy" or "JSON ID"' });
    }

    // If linking to a Jira epic, fetch its data to pre-fill fields
    if (jiraEpicKey && isJiraConfigured()) {
      try {
        const epic = await getEpic(jiraEpicKey);
        const epicFields = mapEpicToInitiativeFields(epic);
        title = title || epicFields.title;
        description = description || epicFields.description || undefined;
        status = status || epicFields.status as any;
        startDate = startDate || epicFields.startDate || undefined;
        endDate = endDate || epicFields.endDate || undefined;
      } catch (jiraError) {
        console.error('Failed to fetch Jira epic on create (using provided fields):', jiraError);
      }
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = db.prepare(
      `INSERT INTO initiatives (title, description, start_date, end_date, developer_count, okr_id, success_criteria, pod, status, jira_epic_key, jira_sync_enabled, jira_last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      title,
      description || null,
      startDate || null,
      endDate || null,
      developerCount || 1,
      okrId || null,
      successCriteria || null,
      pod,
      status || 'planned',
      jiraEpicKey || null,
      jiraSyncEnabled !== false ? 1 : 0,
      jiraEpicKey ? new Date().toISOString() : null
    );

    const initiative = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(enrichWithOKR(rowToInitiative(initiative)));
  } catch (error) {
    console.error('Error creating initiative:', error);
    res.status(500).json({ error: 'Failed to create initiative' });
  }
});

// PUT /api/initiatives/:id - Update initiative
router.put('/:id', async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Initiative not found' });
    }

    const { title, description, startDate, endDate, developerCount, okrId, successCriteria, pod, status, jiraEpicKey, jiraSyncEnabled } = req.body as UpdateInitiativeInput;

    if (pod && !['Retail Therapy', 'JSON ID'].includes(pod)) {
      return res.status(400).json({ error: 'Pod must be "Retail Therapy" or "JSON ID"' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (startDate !== undefined) { updates.push('start_date = ?'); params.push(startDate); }
    if (endDate !== undefined) { updates.push('end_date = ?'); params.push(endDate); }
    if (developerCount !== undefined) { updates.push('developer_count = ?'); params.push(developerCount); }
    if (okrId !== undefined) { updates.push('okr_id = ?'); params.push(okrId); }
    if (successCriteria !== undefined) { updates.push('success_criteria = ?'); params.push(successCriteria); }
    if (pod !== undefined) { updates.push('pod = ?'); params.push(pod); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (jiraEpicKey !== undefined) { updates.push('jira_epic_key = ?'); params.push(jiraEpicKey); }
    if (jiraSyncEnabled !== undefined) { updates.push('jira_sync_enabled = ?'); params.push(jiraSyncEnabled ? 1 : 0); }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.params.id);
      db.prepare(`UPDATE initiatives SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const currentRow = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(req.params.id) as any;
    res.json(enrichWithOKR(rowToInitiative(currentRow)));
  } catch (error) {
    console.error('Error updating initiative:', error);
    res.status(500).json({ error: 'Failed to update initiative' });
  }
});

// DELETE /api/initiatives/:id - Delete initiative
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM initiatives WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Initiative not found' });
    }
    db.prepare('DELETE FROM initiatives WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting initiative:', error);
    res.status(500).json({ error: 'Failed to delete initiative' });
  }
});

export default router;
