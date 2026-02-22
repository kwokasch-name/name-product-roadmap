import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { CreateOKRInput, Pod } from '../_lib/types.js';

// Helper functions
function rowToOKR(row: any, pods: Pod[] = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    timeFrame: row.time_frame,
    isCompanyWide: Boolean(row.is_company_wide),
    pods: pods,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToKeyResult(row: any) {
  return {
    id: row.id,
    okrId: row.okr_id,
    title: row.title,
    targetValue: row.target_value,
    currentValue: row.current_value,
    unit: row.unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // GET /api/okrs - List all OKRs
      const okrsResult = await query('SELECT * FROM okrs ORDER BY created_at DESC');
      const okrs = okrsResult.rows;
      
      const okrsWithKRs = await Promise.all(okrs.map(async (okr) => {
        const keyResultsResult = await query('SELECT * FROM key_results WHERE okr_id = $1', [okr.id]);
        const podsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [okr.id]);
        
        return {
          ...rowToOKR(okr, podsResult.rows.map(p => p.pod as Pod)),
          keyResults: keyResultsResult.rows.map(rowToKeyResult),
        };
      }));
      
      return res.status(200).json(okrsWithKRs);
    }

    if (req.method === 'POST') {
      // POST /api/okrs - Create new OKR
      const { title, description, timeFrame, isCompanyWide, pods } = req.body as CreateOKRInput;
      
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      // Validate pods if provided
      if (pods && pods.length > 0) {
        const validPods: Pod[] = ['Retail Therapy', 'JSON ID', 'Migration'];
        for (const pod of pods) {
          if (!validPods.includes(pod)) {
            return res.status(400).json({ error: `Invalid pod: ${pod}` });
          }
        }
      }
      
      // Insert OKR
      const result = await query(
        'INSERT INTO okrs (title, description, time_frame, is_company_wide) VALUES ($1, $2, $3, $4) RETURNING *',
        [title.trim(), description?.trim() || null, timeFrame?.trim() || null, isCompanyWide || false]
      );

      const okr = result.rows[0];
      const okrId = okr.id;
      
      // Insert pod associations
      if (pods && pods.length > 0) {
        for (const pod of pods) {
          try {
            await query('INSERT INTO okr_pods (okr_id, pod) VALUES ($1, $2)', [okrId, pod]);
          } catch (podError: any) {
            console.error(`Error inserting pod ${pod} for OKR ${okrId}:`, podError);
          }
        }
      }

      // Fetch the complete OKR with pods
      const okrPodsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [okrId]);
      return res.status(201).json({ 
        ...rowToOKR(okr, okrPodsResult.rows.map(p => p.pod as Pod)), 
        keyResults: [] 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in OKRs handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
