# RunReady SG — Weather-Safe Running & PE Planner

A location-aware decision support system for outdoor activity safety in Singapore.

> **New to the team?** Read `developer_notes.md` first — it explains the full project context, architecture, features, team roles, and development rules. If you're using an AI assistant to help you code, ask it to read `developer_notes.md` before starting.

## Repo Structure

```
run-ready-sg/
├── backend/          # Track B (Keefe + Ibnu) — FastAPI + ingestion pipeline
│   ├── app/
│   │   ├── main.py           # FastAPI entry point
│   │   ├── config.py         # Environment config
│   │   ├── database.py       # DB connection pool
│   │   ├── routers/          # One file per feature endpoint
│   │   │   ├── decision.py   # F1: PE Decision Engine ✅
│   │   │   ├── timeslots.py  # F5: Smart Time-Slot Finder ✅
│   │   │   ├── shelter.py    # F2: Find Shelter Now ⚠️ stub
│   │   │   ├── alerts.py     # F3: Weather Alerts (SES) ⚠️ stub
│   │   │   └── routes.py     # F4: Route Coverage Scorer ⚠️ stub
│   │   └── services/         # Shared business logic
│   │       ├── weather.py    # NEA API client (V1 + V2) ✅
│   │       └── spatial.py    # PostGIS query helpers ⚠️ untested
│   ├── ingestion/
│   │   └── ingest_weather.py # Cron / Lambda-compatible ✅
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/         # Track C (San + Justin) — React PWA (Vite)
│   ├── src/
│   │   ├── pages/            # One file per screen — redesign freely
│   │   ├── components/       # Reusable UI pieces (empty — create as needed)
│   │   └── services/
│   │       ├── api.js        # API client with MOCK flags ✅
│   │       └── mock.js       # Fake data for dev ✅
│   ├── package.json
│   └── vite.config.js
├── database/         # Track A (Mustafa + Shihao) — Schema + seed data
│   ├── migrations/
│   │   └── 001_init_schema.sql  # Full schema ✅
│   ├── seeds/
│   │   ├── load_shelters.py     # ⚠️ needs real dataset URLs
│   │   └── load_linkways.py     # ⚠️ needs .shp file in data/
│   └── data/                    # Raw shapefiles, CSVs (gitignored if large)
├── infra/            # Deployment config
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── crontab
├── docs/
│   └── api-contract.md   # THE contract between frontend and backend
├── developer_notes.md    # ⭐ Full project context — read this first
├── .env.example
├── .gitignore
└── ai-usage-log.md       # Required by project spec — log AI usage as you go
```

**Legend:** ✅ = working code, ⚠️ = stub that needs implementation

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ with PostGIS extension

### 1. Clone and configure
```bash
git clone <repo-url>
cd run-ready-sg
cp .env.example .env
# Edit .env with your API keys and DB credentials
```

### 2. Start the database (Docker)
```bash
docker compose up db -d
```

### 3. Run database migrations and seed data
```bash
cd database
psql $DATABASE_URL -f migrations/001_init_schema.sql
python seeds/load_shelters.py
```

### 4. Start the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

## Team Conventions

### How We Work Together (Contract-First Development)

Our team is split into 3 tracks that work in parallel. To avoid blocking each other:

```
                    ┌──────────────────────┐
                    │  docs/api-contract.md │  ← Single source of truth
                    │  (Backend team owns)  │
                    └──────┬───────┬───────┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                 ▼
    ┌──────────────────┐              ┌──────────────────┐
    │  Track B: Backend │              │  Track C: Frontend│
    │  Keefe + Ibnu     │              │  San + Justin     │
    │                   │              │                   │
    │  Implements real  │              │  Builds UI using  │
    │  endpoints that   │              │  mock.js data     │
    │  match the        │              │  that matches the │
    │  contract         │              │  contract         │
    └──────────────────┘              └──────────────────┘
              │                                 │
              │   "Endpoint X is live"          │
              │──────────────────────────────── │
              │                                 │
              │                     Flip MOCK.x = false in api.js
              │                                 │
              ▼                                 ▼
                       ✅ Connected!
```

**The rule:** Backend changes the contract FIRST, then implements. Frontend builds against mock data. Nobody waits.

**Files that matter:**
- `docs/api-contract.md` — defines every endpoint's URL, params, and response shape
- `frontend/src/services/mock.js` — fake data matching the contract (frontend dev uses this)
- `frontend/src/services/api.js` — has MOCK flags per feature, flip to false when real endpoint is ready

**Track A (Mustafa + Shihao):** Works independently on database. Their contract with Track B is the SQL schema (`database/migrations/`) and the seed scripts. Once data is in PostGIS, Track B writes queries against it.

### Branching
- `main` — always deployable, protected
- `feature/<track>-<name>` — e.g. `feature/backend-shelter-endpoint`
- Merge via Pull Request with at least 1 reviewer

### Code Style
- **Python**: formatted with `black` (line length 100)
- **JavaScript**: formatted with Prettier (defaults)
- Run formatters before committing

### API Contract
All backend endpoints are documented in `docs/api-contract.md`.
Frontend team mocks against this contract. Backend team keeps it updated.

### Environment Variables
- Never commit `.env` files
- Always update `.env.example` when adding new variables
- Use `config.py` to load and validate env vars in backend

### AI Usage
Log all AI tool usage in `ai-usage-log.md` as you go.
Format: `| Date | Tool | What was generated | Team member |`
