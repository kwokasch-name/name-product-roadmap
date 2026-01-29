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
      const enriched = await Promise.all(initiatives.map(init => enrichWithOKR(init)));
      
      return res.json(enriched);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error fetching scoped initiatives:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch scoped initiatives' });
  }
}
