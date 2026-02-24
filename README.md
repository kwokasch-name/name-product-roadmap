# Product Roadmap

A product roadmap app that ties **Objectives and Key Results (OKRs)** to **initiatives**, shows initiatives on a timeline by team (pod), and can sync initiative data with **Jira** epics.

---

## What This App Does (User Perspective)

- **OKRs** — Define objectives (e.g. “Improve checkout conversion”) and key results with targets. OKRs can be company-wide or assigned to one or more pods: **Retail Therapy**, **JSON ID**, and **Migration**.
- **Initiatives** — Work items (projects/features) that can be linked to OKRs. Each initiative has a pod, status (planned / in progress / completed / blocked), optional start/end dates, developer count, success criteria, and optional Jira epic link.
- **Roadmap view** — A timeline showing initiatives that have start/end dates (“scoped”), grouped in lanes by pod. You can filter by selected OKRs and show/hide pods. A “today” line and month navigation help you see what’s happening when.
- **Unscoped initiatives** — A table of initiatives that don’t have dates yet (backlog). From here you can open an initiative to edit it or give it dates to move it onto the roadmap.
- **Jira integration** — When configured, you can link initiatives to Jira epics, search epics, and use “Sync Jira” to pull status/dates from Jira into the app.

---

## High-Level Structure

| Part | Purpose |
|------|--------|
| **`frontend/`** | React app (Vite). All user-facing UI: OKR list, roadmap timeline, unscoped table, initiative/OKR forms, Jira sync button. |
| **`api/`** | Vercel serverless API. Handles OKRs, key results, initiatives (including “scoped” vs “unscoped”), and Jira status/search/sync. Used when the app is deployed on Vercel. |
| **`backend/`** | Express server. Same business logic as the API; used for local development if you run the backend instead of Vercel serverless. |

Data is stored in **PostgreSQL** (e.g. Neon). The app uses a single database for both the Express backend and the Vercel API.

---

## Where Main Features Live in the Code

- **OKR list (sidebar)** — `frontend/src/components/okrs/OKRList.tsx` and `OKRCard.tsx`; add/edit OKR in `OKRForm.tsx`.
- **Roadmap timeline** — `frontend/src/components/roadmap/RoadmapView.tsx` (layout, filtering, navigation), `WorkstreamLane.tsx`, `InitiativeBar.tsx`, `TimelineHeader.tsx`, `TodayLine.tsx`.
- **Unscoped initiatives table** — `frontend/src/components/unscoped/UnscopedTable.tsx` (backlog list, schedule actions).
- **Create/edit initiative** — `frontend/src/components/initiatives/InitiativeForm.tsx` (modal form).
- **App layout and Jira sync button** — `frontend/src/App.tsx`.
- **Shared UI state** (selected OKRs, visible pods, date range, which form is open) — `frontend/src/context/RoadmapContext.tsx`.
- **API routes** — Under `api/`: `okrs/`, `key-results/`, `initiatives/` (including `scoped` and `unscoped`), and `jira/` (status, search, sync).

---

## Scripts (Root `package.json`)

- **`npm run dev`** — Runs backend and frontend together for local development.
- **`npm run install:all`** — Installs dependencies at root, backend, and frontend.
- **`npm run build`** — Builds the frontend (used for Vercel deploy).

---

## Environment & Deployment

- **Database** — Set `DATABASE_URL` (or `POSTGRES_URL`) to your PostgreSQL connection string. See **`POSTGRES_SETUP.md`** for schema and Vercel setup.
- **Jira** — Jira integration is optional; when configured, the “Sync Jira” button and epic linking are available. Configuration is done via environment variables used by the API/backend.
- **Vercel** — The repo is set up to deploy the frontend and use the `api/` serverless functions; `vercel.json` defines the build and route rewrites.

---

## Other Docs in This Repo

- **`api/README.md`** — API folder structure and how the serverless handlers work.
- **`POSTGRES_SETUP.md`** — PostgreSQL (Neon) setup and env vars for Vercel and local dev.
- **`VERCEL_CONVERSION_SUMMARY.md`** / **`VERCEL_SERVERLESS.md`** — Notes on converting the Express backend to Vercel serverless.
