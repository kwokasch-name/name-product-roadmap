import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database) {
  // Check if is_company_wide column exists
  try {
    const tableInfo = db.prepare("PRAGMA table_info(okrs)").all() as any[];
    const hasCompanyWideColumn = tableInfo.some(col => col.name === 'is_company_wide');
    
    if (!hasCompanyWideColumn) {
      db.prepare('ALTER TABLE okrs ADD COLUMN is_company_wide INTEGER DEFAULT 0').run();
      console.log('Added is_company_wide column to okrs table');
    }
  } catch (error: any) {
    console.error('Error adding is_company_wide column:', error);
  }

  // Create okr_pods junction table if it doesn't exist
  try {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS okr_pods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        okr_id INTEGER NOT NULL,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID', 'Migration')),
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

  // Add Jira integration columns to initiatives
  try {
    const tableInfo = db.prepare("PRAGMA table_info(initiatives)").all() as any[];
    const columns = tableInfo.map((col: any) => col.name);

    if (!columns.includes('jira_epic_key')) {
      db.prepare('ALTER TABLE initiatives ADD COLUMN jira_epic_key TEXT').run();
      db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_initiatives_jira_key ON initiatives(jira_epic_key) WHERE jira_epic_key IS NOT NULL').run();
      console.log('Added jira_epic_key column to initiatives table');
    }
    if (!columns.includes('jira_sync_enabled')) {
      db.prepare('ALTER TABLE initiatives ADD COLUMN jira_sync_enabled INTEGER DEFAULT 1').run();
      console.log('Added jira_sync_enabled column to initiatives table');
    }
    if (!columns.includes('jira_last_synced_at')) {
      db.prepare('ALTER TABLE initiatives ADD COLUMN jira_last_synced_at DATETIME').run();
      console.log('Added jira_last_synced_at column to initiatives table');
    }
  } catch (error: any) {
    console.error('Error adding Jira columns to initiatives:', error);
  }
}
