import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database) {
  // Add is_company_wide column if it doesn't exist
  try {
    db.prepare('ALTER TABLE okrs ADD COLUMN is_company_wide INTEGER DEFAULT 0').run();
    console.log('Added is_company_wide column to okrs table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.error('Error adding is_company_wide column:', error);
    }
  }

  // Create okr_pods junction table if it doesn't exist
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS okr_pods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okr_id INTEGER NOT NULL,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE,
        UNIQUE(okr_id, pod)
      )
    `).run();
    console.log('Created okr_pods junction table');
  } catch (error: any) {
    if (!error.message.includes('already exists')) {
      console.error('Error creating okr_pods table:', error);
    }
  }

  // Create indexes
  try {
    db.prepare('CREATE INDEX IF NOT EXISTS idx_okr_pods_okr ON okr_pods(okr_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_okr_pods_pod ON okr_pods(pod)').run();
    console.log('Created indexes for okr_pods table');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}
