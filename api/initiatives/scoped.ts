import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { Pod } from '../_lib/types.js';

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
  // Skip junction table lookup if the initiative ID is not a valid UUID (legacy integer ID)
  if (!UUID_RE.test(initiative.id)) {
    initiative.okrIds = [];
    initiative.okrs = [];
    return initiative;
  }

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
  setCorsHeaders(res, 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // GET /api/initiatives/scoped - Get initiatives with dates (for roadmap)
      const result = await query(
        'SELECT * FROM initiatives WHERE start_date IS NOT NULL AND end_date IS NOT NULL ORDER BY start_date ASC'
      );

      const initiatives = result.rows.map(rowToInitiative);
      const enriched = await Promise.all(initiatives.map(init => enrichWithOKRs(init)));

      return res.json(enriched);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error fetching scoped initiatives:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch scoped initiatives' });
  }
}
