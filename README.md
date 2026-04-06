# MatterFlow

**Keep every matter in flow.**

Workflow management for flat-fee transaction law firms and professional service firms. Track matters through defined stages and steps, monitor health status, and never let a matter fall through the cracks.

## Quick Start

```bash
# Install dependencies
npm install

# Seed demo data (optional but recommended)
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3 (local, swappable to Postgres for SaaS)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React

### Multi-Tenant SaaS Ready
The data model is built for multi-tenancy from day one:
- Every table has a `firm_id` foreign key
- Users have roles: `owner`, `admin`, `associate`
- A `getCurrentOrg().orgId` function abstracts tenant resolution (currently returns a fixed local ID; in SaaS, this reads from auth context)
- Auth middleware slot is ready for integration (NextAuth, Clerk, etc.)

### Core Concepts

| Term | Description |
|------|-------------|
| **MatterFlow** | A workflow template (stages + steps) |
| **Flow Stage** | A phase within a MatterFlow |
| **Flow Step** | An individual task within a stage |
| **Matter** | An active client engagement following a MatterFlow |
| **Flow Control** | Dashboard showing all active matters and their health |
| **Flow Controls** | Rules/thresholds that determine health status |
| **Flow Breakdown** | Severe — matter is critically stalled |

### Status Engine
A single shared computation engine (`src/lib/flow-engine.ts`) drives all status displays:

**Precedence (highest severity wins):**
1. **Flow Breakdown** — step overdue past breakdown threshold or extreme stage stall
2. **Out of Flow** — step significantly overdue
3. **At Flow Risk** — step overdue, extended time in stage, or multiple due-soon steps
4. **In Flow** — healthy, on track

**Key rule:** Only the *current stage* drives overdue/due-soon flags. Future stages are never prematurely flagged.

### Pages
- `/dashboard` — Flow Control: health overview of all active matters
- `/matters` — Matter list with search, create dialog
- `/matters/[id]` — Matter detail: stage cards, step checkboxes, health bar
- `/matterflows` — Workflow template gallery
- `/matterflows/[id]` — MatterFlow editor: stages, steps, durations
- `/settings` — Flow Controls: configure thresholds

### API Routes
- `GET /api/dashboard` — Dashboard summary with health computations
- `GET|POST /api/matters` — List/create matters
- `GET|PATCH|DELETE /api/matters/[id]` — Single matter CRUD
- `POST /api/matters/[id]/steps` — Toggle step completion
- `POST /api/matters/[id]/advance` — Advance to next stage
- `GET|POST /api/matterflows` — List/create templates
- `GET|PUT|DELETE /api/matterflows/[id]` — Single template CRUD
- `GET|PATCH /api/flow-controls` — Read/update thresholds
- `GET /api/users` — List firm users

## SaaS Conversion Path

To convert to a production SaaS product:

1. **Auth**: Add NextAuth.js or Clerk — wire `getCurrentOrg().orgId` to the auth session
2. **Database**: Swap SQLite for PostgreSQL (the schema is portable; use Prisma or Drizzle)
3. **Multi-tenancy**: Add RLS policies or query-level filtering (already in place via `firm_id`)
4. **Deployment**: Deploy to Vercel + managed Postgres (Supabase, Neon, etc.)
5. **Billing**: Add Stripe subscription management per firm
6. **Permissions**: Extend role-based access (owner vs associate vs admin visibility)

## Database

SQLite file is stored at `./matterflow.db` in the project root. Delete it and re-seed to reset.

```bash
rm matterflow.db && npm run db:seed
```

## License

Private — all rights reserved.
