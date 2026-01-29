# Vercel Serverless Functions Conversion

## Overview

This shows how to convert your Express backend to Vercel serverless functions. I've created example files to demonstrate the pattern.

## File Structure

```
api/
  ├── okrs/
  │   ├── index.ts          # Handles GET /api/okrs and POST /api/okrs
  │   └── [id].ts           # Handles GET/PUT/DELETE /api/okrs/:id
  ├── health.ts             # GET /api/health
  └── package.json          # Dependencies for API functions
```

## Key Changes

### 1. Function Format
Instead of Express routes, each file exports a default async handler:

```typescript
export default async function handler(
  req: VercelRequest, 
  res: VercelResponse
) {
  // Handle request
}
```

### 2. Method Handling
Check `req.method` to handle different HTTP methods in the same file:

```typescript
if (req.method === 'GET') {
  // GET logic
} else if (req.method === 'POST') {
  // POST logic
}
```

### 3. CORS
Must be set manually in each function:

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
```

### 4. Database
- Uses `/tmp` directory (Vercel's only writable location)
- Database is ephemeral (resets between deployments)
- ⚠️ **For production, use a persistent database service**

## Next Steps

1. **Complete the conversion**:
   - Create `api/initiatives/index.ts`
   - Create `api/initiatives/[id].ts`
   - Create `api/initiatives/scoped.ts`
   - Create `api/initiatives/unscoped.ts`
   - Create `api/okrs/[id]/key-results/index.ts`

2. **Install dependencies**:
   ```bash
   npm install @vercel/node
   ```

3. **Update vercel.json** (already done)

4. **Consider database migration**:
   - Vercel Postgres
   - Supabase
   - PlanetScale
   - Or keep SQLite but use a persistent volume service

## Important Notes

⚠️ **SQLite on Vercel is NOT persistent** - data will be lost between deployments and function cold starts. This is fine for development/testing but you'll need a real database for production.

The example files I created show the pattern - you can use them as templates for the remaining routes.
