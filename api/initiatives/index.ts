import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { CreateInitiativeInput, Pod } from '../_lib/types.js';

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
        queryText += ` AND okr_id = $${paramIndex++}`;
        params.push(okr_id);
      }
      if (status) {
        queryText += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      queryText += ' ORDER BY created_at DESC';

      const result = await query(queryText, params);
      const initiatives = result.rows.map(rowToInitiative);
      const enriched = await Promise.all(initiatives.map(init => enrichWithOKR(init)));
      
      return res.json(enriched);
    }

    if (req.method === 'POST') {
      // POST /api/initiatives - Create new initiative
      const { title, description, startDate, endDate, developerCount, okrId, successCriteria, pod, status } = req.body as CreateInitiativeInput;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!pod || !['Retail Therapy', 'JSON ID'].includes(pod)) {
        return res.status(400).json({ error: 'Pod must be "Retail Therapy" or "JSON ID"' });
      }

      const result = await query(
        `INSERT INTO initiatives (title, description, start_date, end_date, developer_count, okr_id, success_criteria, pod, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          title.trim(),
          description?.trim() || null,
          startDate || null,
          endDate || null,
          developerCount || 1,
          okrId || null,
          successCriteria?.trim() || null,
          pod,
          status || 'planned'
        ]
      );

      const initiative = rowToInitiative(result.rows[0]);
      return res.status(201).json(await enrichWithOKR(initiative));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in initiatives handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
