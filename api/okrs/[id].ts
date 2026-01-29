import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { UpdateOKRInput, Pod } from '../_lib/types.js';

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
  const { id } = req.query;
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // GET /api/okrs/:id
      const okrResult = await query('SELECT * FROM okrs WHERE id = $1', [id]);
      const okr = okrResult.rows[0];
      
      if (!okr) {
        return res.status(404).json({ error: 'OKR not found' });
      }
      
      const keyResultsResult = await query('SELECT * FROM key_results WHERE okr_id = $1', [id]);
      const podsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [id]);
      
      return res.json({
        ...rowToOKR(okr, podsResult.rows.map(p => p.pod as Pod)),
        keyResults: keyResultsResult.rows.map(rowToKeyResult),
      });
    }

    if (req.method === 'PUT') {
      // PUT /api/okrs/:id
      const existingResult = await query('SELECT * FROM okrs WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'OKR not found' });
      }

      const { title, description, timeFrame, isCompanyWide, pods } = req.body as UpdateOKRInput;
      const okrId = parseInt(id as string);
      
      // Build update query
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        params.push(description);
      }
      if (timeFrame !== undefined) {
        updates.push(`time_frame = $${paramIndex++}`);
        params.push(timeFrame);
      }
      if (isCompanyWide !== undefined) {
        updates.push(`is_company_wide = $${paramIndex++}`);
        params.push(isCompanyWide);
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(okrId);
      
      if (updates.length > 1) { // More than just updated_at
        await query(
          `UPDATE okrs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }

      // Update pod associations if provided
      if (pods !== undefined) {
        await query('DELETE FROM okr_pods WHERE okr_id = $1', [okrId]);
        if (pods.length > 0) {
          for (const pod of pods) {
            await query('INSERT INTO okr_pods (okr_id, pod) VALUES ($1, $2)', [okrId, pod]);
          }
        }
      }

      // Fetch updated OKR
      const okrResult = await query('SELECT * FROM okrs WHERE id = $1', [okrId]);
      const keyResultsResult = await query('SELECT * FROM key_results WHERE okr_id = $1', [okrId]);
      const okrPodsResult = await query('SELECT pod FROM okr_pods WHERE okr_id = $1', [okrId]);
      
      return res.json({
        ...rowToOKR(okrResult.rows[0], okrPodsResult.rows.map(p => p.pod as Pod)),
        keyResults: keyResultsResult.rows.map(rowToKeyResult),
      });
    }

    if (req.method === 'DELETE') {
      // DELETE /api/okrs/:id
      const existingResult = await query('SELECT * FROM okrs WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'OKR not found' });
      }
      
      await query('DELETE FROM okrs WHERE id = $1', [id]);
      return res.status(204).send();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in OKR handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
