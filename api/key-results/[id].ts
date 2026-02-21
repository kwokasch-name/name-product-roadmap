import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../_lib/db.js';
import type { UpdateKeyResultInput } from '../_lib/types.js';

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
    if (req.method === 'PUT') {
      // PUT /api/key-results/:id
      const existingResult = await query('SELECT * FROM key_results WHERE id = $1', [id]);
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Key result not found' });
      }

      const { title, targetValue, currentValue, unit } = req.body as UpdateKeyResultInput;
      
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        params.push(title);
      }
      if (targetValue !== undefined) {
        updates.push(`target_value = $${paramIndex++}`);
        params.push(targetValue);
      }
      if (currentValue !== undefined) {
        updates.push(`current_value = $${paramIndex++}`);
        params.push(currentValue);
      }
      if (unit !== undefined) {
        updates.push(`unit = $${paramIndex++}`);
        params.push(unit);
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);
      
      if (updates.length > 1) {
        await query(
          `UPDATE key_results SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }

      const krResult = await query('SELECT * FROM key_results WHERE id = $1', [id]);
      return res.json(rowToKeyResult(krResult.rows[0]));
    }

    if (req.method === 'DELETE') {
      // DELETE /api/key-results/:id
      const existingResult = await query('SELECT * FROM key_results WHERE id = $1', [id]);
      
      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Key result not found' });
      }
      
      await query('DELETE FROM key_results WHERE id = $1', [id]);
      return res.status(204).send('');
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in key-result handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
