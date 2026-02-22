import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { CreateInitiativeInput, Pod } from '../_lib/types.js';
import { isJiraConfigured, getEpic, mapEpicToInitiativeFields } from '../_lib/jira.js';

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
  if (!UUID_RE.test(initiative.id)) {
    initiative.okrIds = [];
    initiative.okrs = [];
    return initiative;
  }

  // Fetch all linked OKR IDs ordered by position (priority)
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
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // GET /api/initiatives - List all initiatives with optional filters
      const { pod, okr_id, status } = req.query;
      let queryText = 'SELECT * FROM initiatives WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (pod) {
        queryText += ` AND pod = $${paramIndex++}`;
        params.push(pod);
      }
      if (okr_id) {
        queryText += ` AND id IN (SELECT initiative_id FROM initiative_okrs WHERE okr_id = $${paramIndex++})`;
        params.push(okr_id);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await query(queryText, params);
      const initiatives = result.rows.map(rowToInitiative);
      const enriched = await Promise.all(initiatives.map(init => enrichWithOKRs(init)));

      return res.json(enriched);
    }

    if (req.method === 'POST') {
      // POST /api/initiatives - Create new initiative
      let { title, description, startDate, endDate, developerCount, okrIds, successCriteria, pod, status, jiraEpicKey, jiraSyncEnabled } = req.body as CreateInitiativeInput;

      if (!pod || !['Retail Therapy', 'JSON ID', 'Migration'].includes(pod)) {
        return res.status(400).json({ error: 'Pod must be "Retail Therapy", "JSON ID", or "Migration"' });
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
          console.error('Failed to fetch Jira epic on create:', jiraError);
        }
      }

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const result = await query(
        `INSERT INTO initiatives (title, description, start_date, end_date, developer_count, success_criteria, pod, status, jira_epic_key, jira_sync_enabled, jira_last_synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          title.trim(),
          description?.trim() || null,
          startDate || null,
          endDate || null,
          developerCount || 1,
          successCriteria?.trim() || null,
          pod,
          status || 'planned',
          jiraEpicKey || null,
          jiraSyncEnabled !== false,
          jiraEpicKey ? new Date().toISOString() : null,
        ]
      );

      const initiative = rowToInitiative(result.rows[0]);
      const initiativeId = initiative.id;

      // Insert OKR associations into junction table
      if (okrIds && okrIds.length > 0) {
        for (let i = 0; i < okrIds.length; i++) {
          try {
            await query(
              'INSERT INTO initiative_okrs (initiative_id, okr_id, position) VALUES ($1, $2, $3)',
              [initiativeId, okrIds[i], i]
            );
          } catch (err: any) {
            console.error(`Error linking OKR ${okrIds[i]} to initiative ${initiativeId}:`, err);
          }
        }
      }

      return res.status(201).json(await enrichWithOKRs(initiative));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in initiatives handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
