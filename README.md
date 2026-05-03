# Agency Arena

Sales gamification platform for a local insurance office. Daily activity (calls,
quotes, follow-ups, sales) flows into a real-time competitive leaderboard.

## Stack

- **Backend** — FastAPI, SQLAlchemy, SQLite
- **Frontend** — Next.js (App Router), TypeScript, Tailwind, shadcn-style UI, Recharts, lucide-react

## File structure

```
Gamification/
├── README.md
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app + lifespan (creates tables, seeds db)
│       ├── database.py         # SQLite engine, SessionLocal, get_db
│       ├── models/             # SQLAlchemy: Agent, Activity, Contest
│       ├── schemas/            # Pydantic request/response models
│       ├── routers/            # /health, /agents, /activities, /contests
│       └── seed/seed_data.py   # idempotent demo data
└── frontend/
    ├── package.json
    ├── tailwind.config.ts
    ├── app/
    │   ├── layout.tsx          # sidebar + topbar shell
    │   ├── page.tsx            # redirects to /dashboard
    │   ├── dashboard/page.tsx
    │   ├── activity/page.tsx
    │   ├── contests/page.tsx
    │   └── agents/page.tsx
    ├── components/
    │   ├── layout/{Sidebar,TopBar}.tsx
    │   └── ui/card.tsx
    └── lib/{api,utils}.ts
```

## Run the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

On first start the app creates `agency_arena.db` in the `backend/` folder, then
seeds 5 agents, ~150 activities, badges, contests, and referral partners.
Re-running is safe — the seed is skipped if any agents already exist.

Verify it's up:

```bash
curl http://localhost:8001/health
# → {"status":"ok","service":"agency-arena"}
```

Interactive API docs: http://localhost:8001/docs

> Ports 8001 and 3001 are used so the app doesn't collide with anything else
> commonly running on 8000/3000. Adjust freely — `--port` for uvicorn, the
> `dev`/`start` scripts in `frontend/package.json` for Next.js.

### Endpoints

| Method | Path                          | Purpose                                       |
| ------ | ----------------------------- | --------------------------------------------- |
| GET    | `/health`                     | Liveness check                                |
| GET    | `/agents`                     | List agents (`?active_only=true` to filter)   |
| POST   | `/agents`                     | Create agent                                  |
| GET    | `/agents/{id}/activity`       | Activity log for one agent (`?limit=`)        |
| GET    | `/agents/{id}/profile`        | Agent + lifetime stats + badges + history     |
| POST   | `/activity`                   | Log a single activity (points server-computed)|
| GET    | `/leaderboard`                | Ranked agents — `?period=daily\|weekly\|monthly` |
| GET    | `/contests`                   | List contests                                 |
| POST   | `/contests`                   | Create contest                                |
| GET    | `/referral-partners`          | List partners with `conversion_rate`          |
| POST   | `/referral-partners`          | Create partner                                |
| GET    | `/reports/weekly`             | Weekly team report (`?week_of=YYYY-MM-DD`)    |

## Run the frontend

In a new terminal:

```bash
cd frontend
cp .env.local.example .env.local   # points at http://localhost:8001
npm install
npm run dev
```

Open http://localhost:3001 — `/` redirects to `/dashboard`.

## Seed data

The database auto-seeds on first start with 5 agents, 150-200+ activities
(spread over the last 7 days), badges, contests, and referral partners.
Each agent has a deliberate persona — high closer, hustler, referral
heavy, cross-sell specialist, steady all-rounder — so the leaderboard
isn't uniform.

Run the seed manually (idempotent — exits if data already exists):

```bash
cd backend
.venv/bin/python -m app.seed.seed_data
```

Wipe and re-seed (drops agents, activities, scores, badges, etc.):

```bash
.venv/bin/python -m app.seed.seed_data --force
```

Disable auto-seed at startup (e.g. in tests, prod):

```bash
SEED_ON_STARTUP=false uvicorn app.main:app --reload
```

Full reset (drop the DB file and let the next start rebuild):

```bash
rm backend/agency_arena.db
```

## Deploy

The repo deploys cleanly as **frontend on Vercel** + **backend on Render**.

### Render (backend)

1. **New → Blueprint** in the Render dashboard, point at this repo. The
   included [`render.yaml`](./render.yaml) creates a Python web service
   from `backend/`.
2. After the first deploy, set these env vars on the service:
   - `ALLOWED_ORIGINS` — comma-separated, e.g.
     `https://agency-arena.vercel.app,https://*.vercel.app`
   - `BUSINESS_TIMEZONE` — IANA timezone for score windows, e.g.
     `America/New_York`
   - `DATABASE_URL` (optional) — a Postgres URL for persistence; leave
     unset to use the ephemeral SQLite that re-seeds on each cold start.
3. Note the public URL Render gives the service
   (`https://<name>.onrender.com`); you'll paste it into Vercel below.

### Vercel (frontend)

1. **Import Project** → pick the repo. Set **Root Directory** to
   `frontend`.
2. Add env var **`NEXT_PUBLIC_API_BASE`** = your Render URL (no trailing
   slash).
3. Deploy. Once it's live, copy the Vercel URL back into
   `ALLOWED_ORIGINS` on Render and trigger a redeploy so CORS lets the
   frontend through.

### Free-tier caveats

- Render free web services sleep after ~15 min idle (first request after
  wakes them — ~30 s). The SQLite DB is ephemeral and re-seeds on cold
  starts; switch to Render Postgres + `DATABASE_URL` if you need data to
  persist across deploys.
- Vercel free is plenty for this workload.
