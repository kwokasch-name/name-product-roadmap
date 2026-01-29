# Converting to Vercel Serverless Functions

This document explains how the Express backend has been converted to Vercel serverless functions.

## Structure

```
api/
  okrs/
    index.ts          # GET /api/okrs, POST /api/okrs
    [id].ts           # GET /api/okrs/:id, PUT /api/okrs/:id, DELETE /api/okrs/:id
    [id]/
      key-results/
        index.ts      # POST /api/okrs/:id/key-results
  initiatives/
    index.ts          # GET /api/initiatives, POST /api/initiatives
    [id].ts           # GET /api/initiatives/:id, PUT, DELETE
    scoped.ts         # GET /api/initiatives/scoped
    unscoped.ts       # GET /api/initiatives/unscoped
  health.ts           # GET /api/health
```

## Key Differences from Express

1. **File-based routing**: Each route is a separate file in the `api/` directory
2. **Dynamic routes**: Use `[id].ts` for dynamic segments (e.g., `/api/okrs/123`)
3. **Handler function**: Export a default async function that receives `VercelRequest` and `VercelResponse`
4. **CORS handling**: Must be set manually in each function
5. **Database**: Uses `/tmp` directory for SQLite (Vercel's writable filesystem)

## Database Considerations

⚠️ **Important**: Vercel serverless functions are stateless and the `/tmp` directory is ephemeral. This means:
- Database data will be lost between deployments
- Each function invocation may get a fresh database
- Consider using a persistent database service (e.g., Vercel Postgres, Supabase, PlanetScale) for production

## Installation

1. Install dependencies in the root:
```bash
npm install @vercel/node
```

2. The `api/` directory functions will automatically be detected by Vercel

## Migration Steps

1. ✅ Created `api/okrs/index.ts` for GET/POST /api/okrs
2. ✅ Created `api/okrs/[id].ts` for GET/PUT/DELETE /api/okrs/:id
3. ⚠️ Need to create remaining routes:
   - `api/okrs/[id]/key-results/index.ts`
   - `api/initiatives/*` routes
   - `api/health.ts`

4. Update `vercel.json` to configure functions
5. Consider migrating to a persistent database for production use

## Local Development

For local development, you can still use the Express backend. The serverless functions are only used when deployed to Vercel.
