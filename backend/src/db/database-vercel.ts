import Database from 'better-sqlite3';
import { join } from 'path';
import { readFileSync, mkdirSync, existsSync } from 'fs';

// For Vercel, we need to use /tmp for the database since the filesystem is read-only
// except for /tmp
const DB_PATH = process.env.DATABASE_PATH || join('/tmp', 'roadmap.db');

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure /tmp directory exists
  const tmpDir = '/tmp';
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  // Initialize schema if database is new
  try {
    const schemaPath = join(process.cwd(), 'backend/src/db/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    dbInstance.exec(schema);
    console.log('Database schema initialized');

    // Run migrations
    import('./migrate.js').then(({ runMigrations }) => {
      runMigrations(dbInstance!);
    });
  } catch (error: any) {
    // If schema file doesn't exist or can't be read, try to run migrations anyway
    console.warn('Could not read schema file, running migrations only:', error.message);
    import('./migrate.js').then(({ runMigrations }) => {
      runMigrations(dbInstance!);
    });
  }

  return dbInstance;
}
