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
    okrIds: [] as string[],
    okrs: [] as any[],
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function enrichWithOKRs(initiative: any) {
  const ioResult = await query(
    `SELECT okr_id FROM initiative_okrs WHERE initiative_id = $1 ORDER BY position ASC`,
    [initiative.id]
  );
  const okrIds = ioResult.rows.map((r: any) => r.okr_id).filter((id: string) => UUID_RE.test(id));
  initiative.okrIds = okrIds;

  if (okrIds.length > 0) {
    const okrs = [];
    for (const okrId of okrIds) {
      const okrResult = await query('SELECT * FROM okrs WHERE id = $1', [okrId]);
      if (okrResult.rows.length > 0) {
        const okr = okrResult.rows[0];
        const podsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [okr.id]);
        okrs.push({
          id: okr.id,
          title: okr.title,
          description: okr.description,
          timeFrame: okr.time_frame,
          isCompanyWide: Boolean(okr.is_company_wide),
          pods: podsResult.rows.map((p: any) => p.pod as Pod),
          createdAt: okr.created_at,
          updatedAt: okr.updated_at,
        });
      }
    }
    initiative.okrs = okrs;
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
      const result = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      const initiative = result.rows[0];

      if (!initiative) {
        return res.status(404).json({ error: 'Initiative not found' });
      }

      return res.json(await enrichWithOKRs(rowToInitiative(initiative)));
    }

    if (req.method === 'PUT') {
      const existingResult = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Initiative not found' });
      }

      const { title, description, startDate, endDate, developerCount, okrIds, successCriteria, pod, status, jiraEpicKey, jiraSyncEnabled } = req.body as UpdateInitiativeInput;

      if (pod && !['Retail Therapy', 'JSON ID', 'Migration'].includes(pod)) {
        return res.status(400).json({ error: 'Pod must be "Retail Therapy", "JSON ID", or "Migration"' });
      }

      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title !== undefined) { updates.push(`title = $${paramIndex++}`); params.push(title); }
      if (description !== undefined) { updates.push(`description = $${paramIndex++}`); params.push(description); }
      if (startDate !== undefined) { updates.push(`start_date = $${paramIndex++}`); params.push(startDate); }
      if (endDate !== undefined) { updates.push(`end_date = $${paramIndex++}`); params.push(endDate); }
      if (developerCount !== undefined) { updates.push(`developer_count = $${paramIndex++}`); params.push(developerCount); }
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

      // Update OKR associations if provided
      if (okrIds !== undefined) {
        await query('DELETE FROM initiative_okrs WHERE initiative_id = $1', [id]);
        for (let i = 0; i < okrIds.length; i++) {
          try {
            await query(
              'INSERT INTO initiative_okrs (initiative_id, okr_id, position) VALUES ($1, $2, $3)',
              [id, okrIds[i], i]
            );
          } catch (err: any) {
            console.error(`Error linking OKR ${okrIds[i]} to initiative ${id}:`, err);
          }
        }
      }

      const result = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      return res.json(await enrichWithOKRs(rowToInitiative(result.rows[0])));
    }

    if (req.method === 'DELETE') {
      const existingResult = await query('SELECT * FROM initiatives WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Initiative not found' });
      }

      await query('DELETE FROM initiatives WHERE id = $1', [id]);
      return res.status(204).send('');
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in initiative handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
