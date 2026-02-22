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

async function migrateNameColumnToTitle(p: Pool): Promise<void> {
  // Some older deployments created tables with 'name' instead of 'title'.
  // Rename them so all queries can use 'title' consistently.
  const tablesToCheck = ['okrs', 'initiatives', 'key_results'];
  for (const table of tablesToCheck) {
    const client = await p.connect();
    try {
      const nameColResult = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'name'`,
        [table]
      );
      if (nameColResult.rows.length > 0) {
        console.log(`Renaming ${table}.name -> ${table}.title`);
        await client.query(`ALTER TABLE ${table} RENAME COLUMN name TO title`);
        console.log(`${table}.name renamed to title`);
      }
    } catch (err) {
      console.error(`Failed to rename ${table}.name:`, err);
    } finally {
      client.release();
    }
  }
}

async function migrateOkrIdToJunctionTable(p: Pool): Promise<void> {
  // Migrate single-column initiatives.okr_id to the many-to-many initiative_okrs table.
  // After copying, drop the old column.
  const client = await p.connect();
  try {
    const hasOkrIdCol = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'initiatives' AND column_name = 'okr_id'`
    );
    if (hasOkrIdCol.rows.length === 0) return; // already migrated

    console.log('Migrating initiatives.okr_id to initiative_okrs junction table...');
    // Copy existing relationships to the junction table
    await client.query(`
      INSERT INTO initiative_okrs (initiative_id, okr_id, position)
      SELECT id, okr_id, 0 FROM initiatives WHERE okr_id IS NOT NULL
      ON CONFLICT (initiative_id, okr_id) DO NOTHING
    `);
    // Drop the old column and its index
    await client.query(`DROP INDEX IF EXISTS idx_initiatives_okr`);
    await client.query(`ALTER TABLE initiatives DROP COLUMN okr_id`);
    console.log('initiatives.okr_id migrated to initiative_okrs');
  } catch (err) {
    console.error('Failed to migrate okr_id to junction table:', err);
  } finally {
    client.release();
  }
}

async function migrateIntegerColumnsToUuid(p: Pool): Promise<void> {
  // Check and migrate each okr_id column that is still INTEGER type.
  // These columns reference okrs.id which is UUID, so they must also be UUID.
  // Old rows with integer okr_id values are cleared (set to NULL) since they
  // refer to rows that no longer exist after the UUID migration.
  const columnsToMigrate: Array<{ table: string; column: string; constraint?: string }> = [
    { table: 'okr_pods', column: 'okr_id', constraint: 'okr_pods_okr_id_fkey' },
    { table: 'key_results', column: 'okr_id', constraint: 'key_results_okr_id_fkey' },
    { table: 'initiatives', column: 'okr_id', constraint: 'initiatives_okr_id_fkey' },
  ];

  for (const { table, column, constraint } of columnsToMigrate) {
    const client = await p.connect();
    try {
      const typeResult = await client.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2`,
        [table, column]
      );
      if (typeResult.rows[0]?.data_type !== 'integer') continue;

      console.log(`Migrating ${table}.${column} from INTEGER to UUID...`);
      // Drop FK constraint if it exists
      if (constraint) {
        await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint}`);
      }
      // Set all existing integer values to NULL (they reference old integer PKs that no longer exist)
      await client.query(`UPDATE ${table} SET ${column} = NULL WHERE ${column} IS NOT NULL`);
      // Change column type to UUID
      await client.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE UUID USING ${column}::text::uuid`);
      console.log(`${table}.${column} migrated to UUID`);
    } catch (err) {
      console.error(`Failed to migrate ${table}.${column}:`, err);
    } finally {
      client.release();
    }
  }
}

async function migratePrimaryKeysToUuid(p: Pool): Promise<void> {
  // If any core table still has an integer primary key, migrate it to UUID.
  // Old integer-ID rows are deleted since they can't be converted to valid UUIDs.
  const tables = ['okrs', 'initiatives'];
  for (const table of tables) {
    const client = await p.connect();
    try {
      const typeResult = await client.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'id'`,
        [table]
      );
      if (!typeResult.rows[0] || typeResult.rows[0].data_type === 'uuid') continue;

      console.log(`Migrating ${table}.id from ${typeResult.rows[0].data_type} to UUID...`);
      // Delete all rows — integer IDs can't be converted to valid UUIDs
      await client.query(`DELETE FROM ${table}`);
      // Drop the primary key constraint and change column type
      await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_pkey`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN id SET DEFAULT uuid_generate_v4()`);
      await client.query(`ALTER TABLE ${table} ALTER COLUMN id TYPE UUID USING uuid_generate_v4()`);
      await client.query(`ALTER TABLE ${table} ADD PRIMARY KEY (id)`);
      console.log(`${table}.id migrated to UUID`);
    } catch (err) {
      console.error(`Failed to migrate ${table}.id to UUID:`, err);
    } finally {
      client.release();
    }
  }
}

async function cleanupInvalidJunctionRows(p: Pool): Promise<void> {
  // Remove initiative_okrs rows where the okr_id doesn't match a real OKR.
  // This handles cases where old integer IDs (e.g. "1") were copied during migration.
  const client = await p.connect();
  try {
    // First check the data type of the okr_id column — it may be text from an older schema
    const typeResult = await client.query(
      `SELECT data_type FROM information_schema.columns
       WHERE table_name = 'initiative_okrs' AND column_name = 'okr_id'`
    );
    const dataType = typeResult.rows[0]?.data_type;

    if (dataType && dataType !== 'uuid') {
      // Column is not UUID — drop all rows and recreate with correct type
      console.log(`initiative_okrs.okr_id is ${dataType}, expected uuid. Recreating table...`);
      await client.query('DROP TABLE IF EXISTS initiative_okrs');
      await client.query(`
        CREATE TABLE initiative_okrs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          initiative_id UUID NOT NULL,
          okr_id UUID NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(initiative_id, okr_id)
        )
      `);
      await client.query('CREATE INDEX IF NOT EXISTS idx_initiative_okrs_initiative ON initiative_okrs(initiative_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_initiative_okrs_okr ON initiative_okrs(okr_id)');
      console.log('initiative_okrs table recreated with UUID columns');
    } else {
      // Column is UUID — just clean up orphaned rows
      const result = await client.query(`
        DELETE FROM initiative_okrs
        WHERE okr_id NOT IN (SELECT id FROM okrs)
      `);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`Cleaned up ${result.rowCount} invalid initiative_okrs rows`);
      }
    }
  } catch (err) {
    console.error('Failed to clean up invalid junction rows:', err);
  } finally {
    client.release();
  }
}

async function ensureSchema(p: Pool): Promise<void> {
  const client = await p.connect();
  try {
    await client.query('BEGIN');

    // Enable uuid-ossp extension for UUID generation
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS okrs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        okr_id UUID NOT NULL,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID', 'Migration')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(okr_id, pod)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS key_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        okr_id UUID NOT NULL,
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
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        developer_count INTEGER DEFAULT 1,
        success_criteria TEXT,
        pod TEXT NOT NULL CHECK(pod IN ('Retail Therapy', 'JSON ID', 'Migration')),
        status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed', 'blocked')),
        jira_epic_key TEXT,
        jira_sync_enabled BOOLEAN DEFAULT TRUE,
        jira_last_synced_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Junction table for many-to-many initiative <-> OKR relationship
    await client.query(`
      CREATE TABLE IF NOT EXISTS initiative_okrs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        initiative_id UUID NOT NULL,
        okr_id UUID NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(initiative_id, okr_id)
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiative_okrs_initiative ON initiative_okrs(initiative_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiative_okrs_okr ON initiative_okrs(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiatives_pod ON initiatives(pod)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_okr_pods_okr ON okr_pods(okr_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_okr_pods_pod ON okr_pods(pod)`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_initiatives_jira_key ON initiatives(jira_epic_key) WHERE jira_epic_key IS NOT NULL`);

    // Migrations: ensure all expected columns exist on tables that may have been
    // created with an older schema (ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent)

    // okrs table columns
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS title TEXT`);
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS description TEXT`);
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS time_frame TEXT`);
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS is_company_wide BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE okrs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    // initiatives table columns
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS title TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS description TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS start_date DATE`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS end_date DATE`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS developer_count INTEGER DEFAULT 1`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS success_criteria TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS pod TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned'`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_epic_key TEXT`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_sync_enabled BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE initiatives ADD COLUMN IF NOT EXISTS jira_last_synced_at TIMESTAMP`);

    // key_results table columns
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS title TEXT`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS okr_id UUID`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS target_value REAL`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS current_value REAL DEFAULT 0`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS unit TEXT`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
    await client.query(`ALTER TABLE key_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Rename 'name' → 'title' if the old schema used 'name' (runs outside main transaction)
  await migrateNameColumnToTitle(p);

  // Migrate primary key columns from INTEGER to UUID (deletes old integer-ID rows)
  await migratePrimaryKeysToUuid(p);

  // Migrate okr_id columns from INTEGER to UUID — runs in its own connections
  // outside the main transaction (ALTER COLUMN TYPE cannot run inside a transaction
  // that also does DDL like CREATE TABLE IF NOT EXISTS in some PG versions)
  await migrateIntegerColumnsToUuid(p);

  // Migrate initiatives.okr_id single column to initiative_okrs junction table
  await migrateOkrIdToJunctionTable(p);

  // Clean up any initiative_okrs rows with invalid okr_id values
  // (e.g. old integer IDs like "1" that were migrated before UUID conversion)
  await cleanupInvalidJunctionRows(p);

  console.log('Schema ready');
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
