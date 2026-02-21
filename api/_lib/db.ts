import { Pool, QueryResult } from 'pg';

// PostgreSQL connection pool
let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
  }

  return new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

async function ensureSchema(p: Pool): Promise<void> {
  const client = await p.connect();
  try {
    await client.query('BEGIN');

    // Create tables without inline foreign key constraints to avoid
    // "cannot be implemented" errors on repeated cold starts
    await client.query(`
      CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        time_frame TEXT,
        is_company_wide BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS okr_pods (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(okr_id, pod)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        target_value REAL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS initiatives (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        developer_count INTEGER DEFAULT 1,
        okr_id INTEGER,
        success_criteria TEXT,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
        status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed', 'blocked')),
        jira_epic_key TEXT,
        jira_sync_enabled BOOLEAN DEFAULT TRUE,
        jira_last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiatives_pod ON initiatives(pod)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiatives_okr ON initiatives(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_okr_pods_okr ON okr_pods(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_okr_pods_pod ON okr_pods(pod)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_initiatives_jira_key ON initiatives(jira_epic_key) WHERE jira_epic_key IS NOT NULL`);

    // Migrations: safely add Jira columns to databases that predate them
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_epic_key TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_sync_enabled BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_last_synced_at TIMESTAMP`);

    await client.query('COMMIT');
    console.log('Schema ready');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function getPool(): Pool {
  if (!pool) {
    pool = createPool();
    schemaReady = ensureSchema(pool).catch(err => {
      console.error('Schema init failed:', err);
      // Reset so next request retries
      pool = null;
      schemaReady = null;
      throw err;
    });
  }
  return pool;
}

// Helper to set CORS headers
export function setCorsHeaders(res: any, methods: string = 'GET,POST,PUT,DELETE,OPTIONS') {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Helper to execute queries — waits for schema before running
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const p = getPool();
  // Wait for schema to be ready before executing any query
  if (schemaReady) await schemaReady;
  return p.query(text, params);
}

// Keep getDatabase export for any existing references
export function getDatabase(): Pool {
  return getPool();
}
