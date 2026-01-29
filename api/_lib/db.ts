import { Pool, QueryResult } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// PostgreSQL connection pool
let pool: Pool | null = null;

export function getDatabase(): Pool {
  if (pool) {
    return pool;
  }

  // Get connection string from environment
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Initialize schema once
  (async () => {
    try {
      const client = await pool!.connect();
      try {
        // Check if tables exist
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'okrs'
          );
        `);
        
        if (!tableCheck.rows[0].exists) {
          // Initialize schema
          const schemaPath = join(process.cwd(), 'backend/src/db/schema.postgres.sql');
          if (existsSync(schemaPath)) {
            const schema = readFileSync(schemaPath, 'utf-8');
            await client.query(schema);
            console.log('PostgreSQL schema initialized');
          } else {
            // Fallback: create schema inline
            await initializeSchema(client);
          }
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error initializing schema:', error);
    }
  })();

  return pool;
}

async function initializeSchema(client: any) {
  const schema = `
    -- OKRs table
    CREATE TABLE IF NOT EXISTS okrs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        time_frame TEXT,
        is_company_wide BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- OKR-Pod junction table
    CREATE TABLE IF NOT EXISTS okr_pods (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE,
        UNIQUE(okr_id, pod)
    );

    -- Key Results table
    CREATE TABLE IF NOT EXISTS key_results (
        id SERIAL PRIMARY KEY,
        okr_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        target_value REAL,
        current_value REAL DEFAULT 0,
        unit TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE CASCADE
    );

    -- Initiatives table
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (okr_id) REFERENCES okrs(id) ON DELETE SET NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_initiatives_pod ON initiatives(pod);
    CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_initiatives_okr ON initiatives(okr_id);
    CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);
    CREATE INDEX IF NOT EXISTS idx_okr_pods_okr ON okr_pods(okr_id);
    CREATE INDEX IF NOT EXISTS idx_okr_pods_pod ON okr_pods(pod);
  `;
  
  await client.query(schema);
}

// Helper to set CORS headers
export function setCorsHeaders(res: any, methods: string = 'GET,POST,PUT,DELETE,OPTIONS') {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Helper to execute queries (returns the result directly)
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const db = getDatabase();
  return db.query(text, params);
}
