# PostgreSQL Setup Guide

This project has been migrated from SQLite to PostgreSQL (Neon) for Vercel deployment.

## Environment Variables

Add the following environment variable to your Vercel project:

```
DATABASE_URL=postgresql://neondb_owner:npg_8ZYVzSn4AXrj@ep-falling-poetry-ah86tvya-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Or use:

```
POSTGRES_URL=postgresql://neondb_owner:npg_8ZYVzSn4AXrj@ep-falling-poetry-ah86tvya-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
```

## Setting Up in Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add `DATABASE_URL` or `POSTGRES_URL` with your Neon connection string
4. Redeploy your application

## Database Schema

The schema is automatically initialized on first connection. The PostgreSQL schema file is located at:
- `backend/src/db/schema.postgres.sql`

## Key Changes from SQLite

1. **Connection**: Uses `pg` (node-postgres) connection pool instead of `better-sqlite3`
2. **Queries**: All queries use parameterized queries with `$1, $2, ...` instead of `?`
3. **Results**: PostgreSQL returns `{ rows: [...] }` instead of direct arrays
4. **IDs**: Uses `SERIAL` instead of `INTEGER PRIMARY KEY AUTOINCREMENT`
5. **Booleans**: Uses `BOOLEAN` instead of `INTEGER` (0/1)
6. **Timestamps**: Uses `TIMESTAMP` instead of `DATETIME`
7. **Returning**: Uses `RETURNING *` to get inserted/updated rows instead of separate queries

## Local Development

For local development, you can:

1. Use the same Neon database (recommended for testing)
2. Or set up a local PostgreSQL instance and use:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/roadmap
   ```

## Testing the Connection

After deployment, test the connection with:

```bash
curl https://your-app.vercel.app/api/health
```

This should return:
```json
{
  "status": "ok",
  "database": "connected"
}
```
