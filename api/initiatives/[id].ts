import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { UpdateInitiativeInput, Pod } from '../_lib/types.js';

function rowToInitiative(row: any) {
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
    jiraSyncEnabled: Boolean(row.jira_sync_enabled ?? true),
    jiraLastSyncedAt: row.jira_last_synced_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function enrichWithOKR(initiative: any) {
  if (initiative.okrId) {
    const okrResult = await query('SELECT * FROM okrs WHERE id = $1', [initiative.okrId]);
    if (okrResult.rows.length > 0) {
      const okr = okrResult.rows[0];
      const podsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [okr.id]);
      initiative.okr = {
        id: okr.id,
        title: okr.title,
        description: okr.description,
        timeFrame: okr.time_frame,
        isCompanyWide: Boolean(okr.is_company_wide),
        pods: podsResult.rows.map(p => p.pod as Pod),
        createdAt: okr.created_at,
        updatedAt: okr.updated_at,
      };
    }
  }
  return initiative;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // GET /api/initiatives/:id
      const result = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      const initiative = result.rows[0];
      
      if (!initiative) {
        return res.status(404).json({ error: 'Initiative not found' });
      }
      
      return res.json(await enrichWithOKR(rowToInitiative(initiative)));
    }

    if (req.method === 'PUT') {
      // PUT /api/initiatives/:id
      const existingResult = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Initiative not found' });
      }

      const existing = existingResult.rows[0];
      const { title, description, startDate, endDate, developerCount, okrId, successCriteria, pod, status, jiraEpicKey, jiraSyncEnabled } = req.body as UpdateInitiativeInput;

      if (pod && !['Retail Therapy', 'JSON ID'].includes(pod)) {
        return res.status(400).json({ error: 'Pod must be "Retail Therapy" or "JSON ID"' });
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title !== undefined) { updates.push(`title = $${paramIndex++}`); params.push(title); }
      if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
      if (startDate !== undefined) { updates.push(`start_date = $${paramIndex++}`); params.push(startDate); }
      if (endDate !== undefined) { updates.push(`end_date = $${paramIndex++}`); params.push(endDate); }
      if (developerCount !== undefined) { updates.push(`developer_count = $${paramIndex++}`); params.push(developerCount); }
      if (okrId !== undefined) { updates.push(`okr_id = $${paramIndex++}`); params.push(okrId); }
      if (successCriteria !== undefined) { updates.push(`success_criteria = $${paramIndex++}`); params.push(successCriteria); }
      if (pod !== undefined) { updates.push(`pod = $${paramIndex++}`); params.push(pod); }
      if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
      if (jiraEpicKey !== undefined) { updates.push(`jira_epic_key = $${paramIndex++}`); params.push(jiraEpicKey); }
      if (jiraSyncEnabled !== undefined) { updates.push(`jira_sync_enabled = $${paramIndex++}`); params.push(jiraSyncEnabled); }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        await query(`UPDATE initiatives SET ${updates.join(', ')} WHERE id = $${paramIndex}`, params);
      }

      const result = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      return res.json(await enrichWithOKR(rowToInitiative(result.rows[0])));
    }

    if (req.method === 'DELETE') {
      // DELETE /api/initiatives/:id
      const existingResult = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Initiative not found' });
      }
      
      await query('DELETE FROM initiatives WHERE id = $1', [id]);
      return res.status(204).send();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in initiative handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
