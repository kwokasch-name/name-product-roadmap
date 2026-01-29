import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDatabase, setCorsHeaders, query } from '../../../_lib/db.js';
import type { CreateKeyResultInput } from '../../../_lib/types.js';

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
    if (req.method === 'POST') {
      // POST /api/okrs/:id/key-results
      const { title, targetValue, currentValue, unit } = req.body as CreateKeyResultInput;
      
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const okrResult = await query('SELECT * FROM okrs WHERE id = $1', [id]);
      if (okrResult.rows.length === 0) {
        return res.status(404).json({ error: 'OKR not found' });
      }

      const result = await query(
        'INSERT INTO key_results (okr_id, title, target_value, current_value, unit) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, title.trim(), targetValue || null, currentValue || 0, unit || null]
      );

      return res.status(201).json(rowToKeyResult(result.rows[0]));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error in key-results handler:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
