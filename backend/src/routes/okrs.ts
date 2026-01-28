import { Router } from 'express';
import db from '../db/database.js';
import type { OKR, KeyResult, CreateOKRInput, UpdateOKRInput, CreateKeyResultInput, UpdateKeyResultInput } from '../types/index.js';

const router = Router();

// Helper to transform DB row to OKR
function rowToOKR(row: any, pods: Pod[] = []): OKR {
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

function rowToKeyResult(row: any): KeyResult {
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

// GET /api/okrs - List all OKRs with key results
router.get('/', (req, res) => {
  try {
    const okrs = db.prepare('SELECT * FROM okrs ORDER BY created_at DESC').all() as any[];
    const okrsWithKRs = okrs.map(okr => {
      const keyResults = db.prepare('SELECT * FROM key_results WHERE okr_id = ?').all(okr.id) as any[];
      const pods = db.prepare('SELECT pod FROM okr_pods WHERE okr_id = ?').all(okr.id) as any[];
      return {
        ...rowToOKR(okr, pods.map(p => p.pod as Pod)),
        keyResults: keyResults.map(rowToKeyResult),
      };
    });
    res.json(okrsWithKRs);
  } catch (error) {
    console.error('Error fetching OKRs:', error);
    res.status(500).json({ error: 'Failed to fetch OKRs' });
  }
});

// GET /api/okrs/:id - Get single OKR
router.get('/:id', (req, res) => {
  try {
    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(req.params.id) as any;
    if (!okr) {
      return res.status(404).json({ error: 'OKR not found' });
    }
    const keyResults = db.prepare('SELECT * FROM key_results WHERE okr_id = ?').all(okr.id) as any[];
    const pods = db.prepare('SELECT pod FROM okr_pods WHERE okr_id = ?').all(okr.id) as any[];
    res.json({
      ...rowToOKR(okr, pods.map(p => p.pod as Pod)),
      keyResults: keyResults.map(rowToKeyResult),
    });
  } catch (error) {
    console.error('Error fetching OKR:', error);
    res.status(500).json({ error: 'Failed to fetch OKR' });
  }
});

// POST /api/okrs - Create new OKR
router.post('/', (req, res) => {
  try {
    const { title, description, timeFrame, isCompanyWide, pods } = req.body as CreateOKRInput;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = db.prepare(
      'INSERT INTO okrs (title, description, time_frame, is_company_wide) VALUES (?, ?, ?, ?)'
    ).run(title, description || null, timeFrame || null, isCompanyWide ? 1 : 0);

    const okrId = result.lastInsertRowid;
    
    // Insert pod associations
    if (pods && pods.length > 0) {
      const insertPod = db.prepare('INSERT INTO okr_pods (okr_id, pod) VALUES (?, ?)');
      for (const pod of pods) {
        insertPod.run(okrId, pod);
      }
    }

    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(okrId) as any;
    const okrPods = db.prepare('SELECT pod FROM okr_pods WHERE okr_id = ?').all(okrId) as any[];
    res.status(201).json({ 
      ...rowToOKR(okr, okrPods.map(p => p.pod as Pod)), 
      keyResults: [] 
    });
  } catch (error) {
    console.error('Error creating OKR:', error);
    res.status(500).json({ error: 'Failed to create OKR' });
  }
});

// PUT /api/okrs/:id - Update OKR
router.put('/:id', (req, res) => {
  try {
    const { title, description, timeFrame, isCompanyWide, pods } = req.body as UpdateOKRInput;
    const existing = db.prepare('SELECT * FROM okrs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'OKR not found' });
    }

    const okrId = parseInt(req.params.id);
    
    // Update OKR fields
    if (isCompanyWide !== undefined) {
      db.prepare(
        'UPDATE okrs SET title = COALESCE(?, title), description = COALESCE(?, description), time_frame = COALESCE(?, time_frame), is_company_wide = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(title, description, timeFrame, isCompanyWide ? 1 : 0, okrId);
    } else {
      db.prepare(
        'UPDATE okrs SET title = COALESCE(?, title), description = COALESCE(?, description), time_frame = COALESCE(?, time_frame), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(title, description, timeFrame, okrId);
    }

    // Update pod associations if provided
    if (pods !== undefined) {
      // Delete existing pod associations
      db.prepare('DELETE FROM okr_pods WHERE okr_id = ?').run(okrId);
      // Insert new pod associations
      if (pods.length > 0) {
        const insertPod = db.prepare('INSERT INTO okr_pods (okr_id, pod) VALUES (?, ?)');
        for (const pod of pods) {
          insertPod.run(okrId, pod);
        }
      }
    }

    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(okrId) as any;
    const keyResults = db.prepare('SELECT * FROM key_results WHERE okr_id = ?').all(okrId) as any[];
    const okrPods = db.prepare('SELECT pod FROM okr_pods WHERE okr_id = ?').all(okrId) as any[];
    res.json({
      ...rowToOKR(okr, okrPods.map(p => p.pod as Pod)),
      keyResults: keyResults.map(rowToKeyResult),
    });
  } catch (error) {
    console.error('Error updating OKR:', error);
    res.status(500).json({ error: 'Failed to update OKR' });
  }
});

// DELETE /api/okrs/:id - Delete OKR
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM okrs WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'OKR not found' });
    }
    db.prepare('DELETE FROM okrs WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting OKR:', error);
    res.status(500).json({ error: 'Failed to delete OKR' });
  }
});

// POST /api/okrs/:id/key-results - Add key result to OKR
router.post('/:id/key-results', (req, res) => {
  try {
    const { title, targetValue, currentValue, unit } = req.body as CreateKeyResultInput;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const okr = db.prepare('SELECT * FROM okrs WHERE id = ?').get(req.params.id);
    if (!okr) {
      return res.status(404).json({ error: 'OKR not found' });
    }

    const result = db.prepare(
      'INSERT INTO key_results (okr_id, title, target_value, current_value, unit) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.id, title, targetValue || null, currentValue || 0, unit || null);

    const kr = db.prepare('SELECT * FROM key_results WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(rowToKeyResult(kr));
  } catch (error) {
    console.error('Error creating key result:', error);
    res.status(500).json({ error: 'Failed to create key result' });
  }
});

// PUT /api/key-results/:id - Update key result
router.put('/key-results/:id', (req, res) => {
  try {
    const { title, targetValue, currentValue, unit } = req.body as UpdateKeyResultInput;
    const existing = db.prepare('SELECT * FROM key_results WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Key result not found' });
    }

    db.prepare(
      'UPDATE key_results SET title = COALESCE(?, title), target_value = COALESCE(?, target_value), current_value = COALESCE(?, current_value), unit = COALESCE(?, unit), updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(title, targetValue, currentValue, unit, req.params.id);

    const kr = db.prepare('SELECT * FROM key_results WHERE id = ?').get(req.params.id) as any;
    res.json(rowToKeyResult(kr));
  } catch (error) {
    console.error('Error updating key result:', error);
    res.status(500).json({ error: 'Failed to update key result' });
  }
});

// DELETE /api/key-results/:id - Delete key result
router.delete('/key-results/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM key_results WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Key result not found' });
    }
    db.prepare('DELETE FROM key_results WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting key result:', error);
    res.status(500).json({ error: 'Failed to delete key result' });
  }
});

export default router;
