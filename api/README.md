# Vercel Serverless Functions API

This directory contains all API routes converted from Express to Vercel serverless functions.

## Structure

```
api/
  ├── _lib/                    # Shared utilities
  │   ├── db.ts               # Database connection helper
  │   └── types.ts            # Shared TypeScript types
  ├── okrs/
  │   ├── index.ts            # GET, POST /api/okrs
  │   ├── [id].ts             # GET, PUT, DELETE /api/okrs/:id
  │   └── [id]/
  │       └── key-results/
  │           └── index.ts    # POST /api/okrs/:id/key-results
  ├── key-results/
  │   └── [id].ts             # PUT, DELETE /api/key-results/:id
  ├── initiatives/
  │   ├── index.ts            # GET, POST /api/initiatives
  │   ├── [id].ts             # GET, PUT, DELETE /api/initiatives/:id
  │   ├── scoped.ts           # GET /api/initiatives/scoped
  │   └── unscoped.ts         # GET /api/initiatives/unscoped
  ├── health.ts               # GET /api/health
  └── package.json            # Dependencies
```

## How It Works

Each file exports a default async function that handles HTTP requests:

```typescript
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle request
}
```

## Database

⚠️ **Important**: The database uses `/tmp` which is ephemeral. Data will be lost between:
- Deployments
- Function cold starts
- Serverless invocations

For production, migrate to a persistent database service.

## Local Development

Use `vercel dev` to test serverless functions locally, or continue using the Express backend for local development.
