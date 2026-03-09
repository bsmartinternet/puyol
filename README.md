# MailOps — Email Marketing Intelligence Platform

Internal dashboard for centralizing, enriching and analyzing email marketing campaigns.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend | Next.js API Routes |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (JWT) |
| UI | Tailwind CSS + Recharts |
| Deploy | Vercel + Railway/Render |

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd mailops
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Required: PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/mailops"

# Required: generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Inboxroad API (leave blank to use mock data)
INBOXROAD_API_KEY=""
INBOXROAD_API_URL="https://api.inboxroad.com/v1"

# Use mock data when API key is not set
USE_MOCK_DATA="true"
```

### 3. Set up the database

```bash
# Push schema to database
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate

# Seed with mock data (60 sends, 3 clients, 4 campaigns)
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open http://localhost:3000

**Demo login:**
- Email: `admin@mailops.io`
- Password: `admin123`

---

## Project Structure

```
mailops/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Mock data seed
│
├── src/
│   ├── app/
│   │   ├── (app)/             # Protected routes
│   │   │   ├── dashboard/     # Main KPI dashboard
│   │   │   ├── sends/         # Sends table + detail
│   │   │   ├── clients/       # Client management
│   │   │   ├── campaigns/     # Campaign management
│   │   │   ├── sync/          # Sync control + logs
│   │   │   └── reporting/     # Analytics (extend here)
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth
│   │   │   ├── sends/         # GET (list+filter+CSV), PATCH (edit)
│   │   │   ├── clients/       # GET, POST
│   │   │   ├── campaigns/     # GET, POST
│   │   │   ├── kpis/          # Aggregated metrics
│   │   │   └── sync/          # POST (trigger), GET (logs)
│   │   └── login/             # Auth page
│   │
│   ├── components/
│   │   ├── layout/            # Sidebar
│   │   ├── ui/                # StatCard, StatusBadge, PageHeader
│   │   ├── dashboard/         # Charts, SyncButton, RecentSends
│   │   ├── sends/             # SendsTable, SendEditForm
│   │   ├── clients/           # ClientsView
│   │   ├── campaigns/         # CampaignsView
│   │   ├── sync/              # SyncPanel
│   │   └── providers/         # AuthProvider
│   │
│   └── lib/
│       ├── prisma.ts          # DB client singleton
│       ├── auth.ts            # NextAuth config
│       ├── inboxroad.ts       # API client + mock fallback
│       ├── sync.ts            # Sync service (core logic)
│       └── utils.ts           # Formatters
```

---

## Connecting Inboxroad API

1. Get your API key from the Inboxroad dashboard
2. Set `INBOXROAD_API_KEY` in `.env`
3. Set `USE_MOCK_DATA="false"`
4. Run a full sync from the Sync page

The `InboxroadClient` in `src/lib/inboxroad.ts` handles pagination automatically and falls back to mock data if the API is unavailable.

### Adding other ESP sources

The sync system is built to support multiple sources. To add a new source:

1. Create `src/lib/your-esp.ts` following the same pattern as `inboxroad.ts`
2. Add a new sync function in `src/lib/sync.ts`
3. Add a new API route or extend `/api/sync`
4. The `source` field on each `Send` tracks which system it came from

---

## User Roles

| Role | Permissions |
|---|---|
| ADMIN | Full access |
| EDITOR | Can sync, edit sends, create clients/campaigns |
| VIEWER | Read-only access |

---

## Adding Users

Currently via seed or Prisma Studio:

```bash
npm run db:studio
```

Or add a user creation endpoint at `/api/users` (not included in MVP — extend as needed).

---

## Deploy to Vercel + Railway

### Database (Railway)
1. Create a new PostgreSQL service on Railway
2. Copy the connection string to `DATABASE_URL`
3. Run `npm run db:migrate` with the production URL

### App (Vercel)
1. Push to GitHub
2. Import to Vercel
3. Set all environment variables
4. Deploy

### Auto-sync with Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs incremental sync every hour.

---

## Extending the MVP

### Add reporting page
- Create `/src/app/(app)/reporting/page.tsx`
- Use the `/api/kpis` endpoint with date range + groupBy params
- Add comparison charts per client, geo, ESP

### Add more metrics
- Update `Prisma schema` with new fields
- Add to the `calculateMetrics()` function in `sync.ts`
- They'll recalculate on every sync

### Add webhooks
- Create `/api/webhooks/inboxroad/route.ts`
- Inboxroad can POST events in real-time
- Use the same `mapInboxroadSend` mapper

---

## Database Schema Summary

```
User         — auth, role (ADMIN/EDITOR/VIEWER)
Client       — top-level client entity
Campaign     — belongs to Client, groups Sends
Send         — core entity: external data + manual enrichment
SyncLog      — history of API syncs
ChangeLog    — field-level audit trail per Send
```
