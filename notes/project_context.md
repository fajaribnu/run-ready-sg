# RunReady SG — Full Project Context

> **Purpose of this file:** One-stop context document for any LLM or new contributor to understand the entire project — architecture, codebase, team status, and decisions. Last updated: 2026-04-04.

---

## 1. PROJECT OVERVIEW

**RunReady SG** is a cloud-native SaaS app for CS5224 (Cloud Computing) at NUS that provides **location-specific Go/No-Go recommendations** for outdoor activity in Singapore using live NEA weather data, GPS positioning, and PostGIS spatial queries.

**Core Problem:** Singapore's tropical climate creates real risks for outdoor exercise (heat stress, sudden rainfall, lightning). The app provides real-time safety decisions before users head out.

**Team:** 6 NUS students, 4-week sprint cycle.  
**Repo:** `https://github.com/fajaribnu/run-ready-sg`  
**Live Frontend:** `https://dfiucv08q17cd.cloudfront.net/`

---

## 2. TEAM & TRACK OWNERSHIP

| Name | Track | Role | Git Branch | Notes |
|------|-------|------|------------|-------|
| Mustafa | A — Database | PostGIS, shelter seeding, RDS provisioning | `musah` | Seeded 11,367 shelters |
| Shihao | A — Database | EC2/RDS on shared account, linkway data | `shihao` | Provisioned EC2+RDS on shared AWS account (Apr 4) |
| Keefe | B — Backend | FastAPI, ingestion pipeline | — | S1-01 owner (EC2 provisioning) |
| **Ibnu** | **B — Backend** | FastAPI, ingestion pipeline | `ibnu-decision-engine-prototype` | This context file author |
| San Truong | C — Frontend | React PWA, Dashboard/Shelter/Route UI | `san`, `san-find-shelter` | Did full TS rewrite, deployed to CloudFront |
| Justin | C — Frontend | Frontend contributions | `justin` (merged to main) | |

---

## 3. FEATURES & PRIORITY

| ID | Feature | Priority | Status (as of Apr 4) |
|----|---------|----------|----------------------|
| **F1** | PE Decision Engine (Go/No-Go) | MUST (MVP) | ✅ Backend working, frontend mocked |
| **F2** | Find Shelter Now (nearest + route) | MUST (MVP) | ⚠️ PostGIS query works, OneMap routing TODO |
| **F3** | Weather Alerts via SES email | MUST (MVP) | ⚠️ Stub — DB + SES TODO |
| **F5** | Smart Time-Slot Finder | SHOULD | ✅ Backend working, frontend mocked |
| **F4** | Route Coverage Scorer | SHOULD (high risk) | ⚠️ Stub — depends on linkway data + OneMap |
| F6 | Personalized WBGT Coach | NICE-TO-HAVE | Not started |
| F7, F8 | Park Leaderboard, Dynamic Rerouting | CUT | Will not build |

**Descope Rule:** If F4 at risk by Apr 2, cut it. Redirect effort to F1+F2+F3+F5.

---

## 4. DEADLINES

| Date | Milestone |
|------|-----------|
| Mar 25 | Sprint 1 done — live URL returns real SAFE/WARNING |
| Apr 1 | Sprint 2 done — F1 hardened, F2 works, F5 works, cron running |
| **Apr 8** | **CODE FREEZE — no new features** |
| Apr 19 23:59 | Final submission — report (10 pages) + video (15 min) |

---

## 5. ARCHITECTURE

```
[React PWA]  →  [CloudFront/S3]  →  [Nginx on EC2]  →  [FastAPI on EC2]  →  [PostgreSQL+PostGIS on RDS]
                                                                ↑
                                                    [NEA data.gov.sg APIs]
                                                    [OneMap API (routing)]
                                                    [AWS SES (email alerts)]
```

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Leaflet maps, hosted on S3 via CloudFront
- **Backend:** FastAPI (Python 3.11) in Docker on EC2 (t3.small, ap-southeast-1)
- **Database:** PostgreSQL 15 + PostGIS on RDS (db.t3.micro)
- **Ingestion:** Cron job every 15 min fetches NEA weather data
- **Alerts:** AWS SES for email notifications (not yet implemented)
- **Reverse Proxy:** Nginx on EC2 — `/api/*` → FastAPI, `/` → React static files

---

## 6. DIRECTORY STRUCTURE

```
run-ready-sg/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry + router registration
│   │   ├── config.py            # Settings class (env vars, NEA endpoints)
│   │   ├── database.py          # psycopg2 connection pool (min=1, max=10)
│   │   ├── routers/
│   │   │   ├── decision.py      # F1: GET /api/check-run ✅
│   │   │   ├── shelter.py       # F2: GET /api/find-shelter ⚠️
│   │   │   ├── timeslots.py     # F5: GET /api/best-times ✅
│   │   │   ├── routes.py        # F4: GET /api/plan-route ⚠️ stub
│   │   │   └── alerts.py        # F3: POST /api/alerts/subscribe, GET /api/alerts/check ⚠️ stub
│   │   └── services/
│   │       ├── weather.py       # NEA V1+V2 API client ✅
│   │       └── spatial.py       # PostGIS query helpers ⚠️
│   ├── ingestion/
│   │   └── ingest_weather.py    # Cron/Lambda weather ingestion ✅
│   ├── requirements.txt         # fastapi, uvicorn, psycopg2, boto3, geopandas, shapely, requests
│   ├── Dockerfile               # Python 3.11-slim + libpq-dev + libgdal-dev
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Tab-based navigation (home|shelter|route|time)
│   │   ├── types.ts             # TypeScript interfaces (Tab, WeatherData, Shelter, TimeWindow)
│   │   ├── main.tsx             # React entry point
│   │   ├── index.css            # Tailwind + Material Design 3 color tokens
│   │   ├── styles.css           # Additional styles
│   │   ├── components/
│   │   │   ├── TopBar.tsx       # Header with location/alerts/profile
│   │   │   ├── BottomNav.tsx    # Fixed 4-tab bottom nav
│   │   │   ├── CheckRun.tsx     # "Should I run now?" CTA button
│   │   │   ├── RunStatusCard.tsx    # SAFE/WARNING result display
│   │   │   ├── WeatherBentoGrid.tsx # WBGT, temp, forecast cards
│   │   │   ├── QuickActions.tsx     # Navigate to shelter/route/time
│   │   │   ├── LocationProvider.tsx # Global GPS context (watchPosition)
│   │   │   ├── ShelterBottomSheet.tsx # Shelter info card + navigate button
│   │   │   ├── ShelterControls.tsx  # Map recenter button
│   │   │   ├── RoutePlanningPanel.tsx # Distance slider, loop toggle, stats
│   │   │   └── RouteMapPanel.tsx    # Leaflet map + route legend + nav controls
│   │   ├── pages/
│   │   │   ├── HomeView.tsx     # Dashboard: CheckRun + StatusCard + BentoGrid + QuickActions
│   │   │   ├── ShelterView.tsx  # Leaflet map + shelter markers + bottom sheet
│   │   │   ├── RouteView.tsx    # Route planner with navigation mode
│   │   │   └── TimeView.tsx     # Duration selector + best time windows
│   │   ├── map/
│   │   │   ├── useLeafletMap.ts # 1171-line map hook (route rendering, progress, markers)
│   │   │   ├── geometry.ts      # Heading, nearest point, distance utils
│   │   │   └── tracking.ts     # Geolocation + compass management
│   │   └── services/
│   │       ├── api.js           # Axios client with per-feature MOCK flags
│   │       └── mock.js          # Fake data matching API contract
│   ├── package.json             # React 18, Vite 5, Tailwind 4, Leaflet, Axios, Motion
│   ├── vite.config.js           # Dev proxy /api → localhost:8000
│   └── tsconfig.json
├── database/
│   ├── migrations/
│   │   └── 001_init_schema.sql  # 6 tables + PostGIS indexes
│   ├── seeds/
│   │   ├── load_shelters.py     # HDB + CD + NParks shelter loading with OneMap geocoding
│   │   └── load_linkways.py     # LTA covered linkway shapefile → PostGIS
│   ├── data/                    # Raw data files (shapefiles, CSVs, caches)
│   └── DATASETS.md             # Documentation of all 3 shelter datasets
├── infra/
│   ├── docker-compose.yml       # PostgreSQL + FastAPI services
│   ├── nginx.conf               # Reverse proxy config
│   ├── crontab                  # Weather ingestion every 15 min
│   └── provision_rds.sh         # AWS RDS provisioning script
├── docs/
│   └── api-contract.md          # THE contract between frontend & backend
├── notes/
│   ├── 1featurePriority.pdf     # Feature priority matrix
│   ├── 2sprintSummary.pdf       # 4-sprint plan
│   ├── 3trackOwnership.pdf      # Track assignments
│   ├── 4taskBoard.pdf           # 46-task breakdown
│   └── 6ciriticalPath.pdf       # Critical dependency chain
├── README.md
├── developer_notes.md           # Comprehensive dev guide
├── ai-usage-log.md              # Required AI usage log
├── .env.example
└── .gitignore
```

---

## 7. API ENDPOINTS (Contract)

Source of truth: `docs/api-contract.md`

### GET `/health`
```json
{ "status": "ok", "service": "runready-sg" }
```

### GET `/api/check-run` — F1: Decision Engine ✅
**Params:** `lat` (float), `lng` (float)

**Response:**
```json
{
  "status": "SAFE|WARNING",
  "data": {
    "location": "Lat: 1.350, Lng: 103.830 (Near Bishan)",
    "temperature": "31.2°C",
    "forecast": "Partly Cloudy (Day)",
    "wbgt": "29.4°C",
    "projection": "Conditions holding steady.",
    "reasons": []
  }
}
```

**Logic:**
- Rain keyword check: `["Rain", "Showers", "Thundery", "Lightning"]` → WARNING
- WBGT > 32.0°C → WARNING
- WBGT='NA' defaults to safe 29.0°C

### GET `/api/find-shelter` — F2: Shelter Finder ⚠️
**Params:** `lat`, `lng`, `limit` (default 3)

**Response:**
```json
{
  "user_location": { "lat": 1.350, "lng": 103.830 },
  "shelters": [
    {
      "name": "Blk 123 Bishan St 11",
      "type": "hdb|cd_shelter|nparks_pavilion",
      "lat": 1.351, "lng": 103.832,
      "distance_m": 245,
      "walk_time_min": 3,
      "route_polyline": null
    }
  ]
}
```

**Implementation:** PostGIS `ST_Distance` + `<->` operator. Walking time = distance_m / 80. OneMap routing TODO (route_polyline is null).

### GET `/api/best-times` — F5: Time-Slot Finder ✅
**Params:** `lat`, `lng`, `duration_min` (default 45)

**Response:**
```json
{
  "location": "Near Bishan",
  "requested_duration_min": 45,
  "windows": [
    {
      "rank": 1, "start_time": "06:30", "end_time": "07:15",
      "forecast": "Partly Cloudy", "wbgt": 28.5, "score": 92, "label": "Best"
    }
  ]
}
```

**Scoring (0–100):** Rain penalties (Thundery: -80, Heavy Rain: -60, Showers: -60, Light Rain: -30, Cloudy: -5). WBGT penalties (>33°C: -50, >32°C: -30, >30°C: -10). Bonus <28°C: +10. Returns top 3 windows from 13 hard-coded daily time slots (6:00am–6:30pm).

### GET `/api/plan-route` — F4: Route Scorer ⚠️ STUB
**Params:** `lat`, `lng`, `distance_km` (default 5.0), `loop` (default true)

**Response (when implemented):**
```json
{
  "routes": [
    {
      "id": 1, "distance_km": 5.1, "coverage_pct": 62.3,
      "polyline": "encoded_string", "shelters_along_route": 4
    }
  ]
}
```

**Status:** Returns "not_implemented". Needs OneMap route generation + PostGIS linkway overlay (`ST_Intersection`).

### POST `/api/alerts/subscribe` — F3: Alert Subscription ⚠️ STUB
**Body:** `{ "email": "...", "lat": 1.350, "lng": 103.830, "label": "Bishan Park" }`

### GET `/api/alerts/check` — F3: Alert Checking (Cron) ⚠️ STUB
Called by cron every 15 min. Evaluates all subscriptions against current weather, sends SES emails for breached thresholds. Needs cooldown logic to prevent spam.

---

## 8. DATABASE SCHEMA

**Engine:** PostgreSQL 15 + PostGIS  
**Migration file:** `database/migrations/001_init_schema.sql`

### Tables

**shelters** — 11,367 rows loaded
```sql
id          SERIAL PRIMARY KEY
name        VARCHAR(255) NOT NULL
shelter_type VARCHAR(50)          -- 'hdb', 'cd_shelter', 'nparks_pavilion'
address     TEXT
geom        GEOMETRY(Point, 4326) -- WGS84
created_at  TIMESTAMPTZ DEFAULT NOW()
-- Index: idx_shelters_geom GIST(geom)
```

Shelter counts by type:
- HDB residential buildings: ~10,743
- Civil Defence shelters: ~589
- NParks pavilions: ~37 (filtered from 5,393 features where CLASS='SHELTER')

**covered_linkways** — loaded by Shihao
```sql
id     SERIAL PRIMARY KEY
name   VARCHAR(255)
geom   GEOMETRY(MultiLineString, 4326) -- LTA covered walkways, SVY21→WGS84
source VARCHAR(50) DEFAULT 'lta'
-- Index: idx_linkways_geom GIST(geom)
```

**weather_snapshots** — populated by cron ingestion
```sql
id              SERIAL PRIMARY KEY
fetched_at      TIMESTAMPTZ NOT NULL UNIQUE
raw_temperature JSONB       -- NEA V1 response
raw_forecast    JSONB       -- NEA V1 response
raw_wbgt        JSONB       -- NEA V2 response
-- Index: idx_snapshots_time(fetched_at DESC)
```

**weather_stations**
```sql
station_id VARCHAR(50) PRIMARY KEY
name       VARCHAR(255) NOT NULL
geom       GEOMETRY(Point, 4326)
```

**alert_subscriptions**
```sql
id              SERIAL PRIMARY KEY
email           VARCHAR(255) NOT NULL
label           VARCHAR(255)
lat             DOUBLE PRECISION NOT NULL
lng             DOUBLE PRECISION NOT NULL
is_active       BOOLEAN DEFAULT TRUE
last_alerted_at TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

**users** (stretch — F6)
```sql
id         SERIAL PRIMARY KEY
email      VARCHAR(255) UNIQUE NOT NULL
profile    VARCHAR(50) DEFAULT 'beginner'  -- 'beginner', 'acclimatized', 'children_pe'
created_at TIMESTAMPTZ DEFAULT NOW()
```

---

## 9. BACKEND DETAILS

### Config (`backend/app/config.py`)
- Loads env vars via `dotenv`
- `DATABASE_URL` constructed from components
- `NEA_V1_BASE = "https://api.data.gov.sg/v1/environment"`
- `NEA_V2_BASE = "https://api-open.data.gov.sg/v2/real-time/api"`
- `nea_headers` property returns `{"api-key": DATA_GOV_API_KEY}`
- CORS origins from env

### Database (`backend/app/database.py`)
- `psycopg2.pool.SimpleConnectionPool` (min=1, max=10)
- `init_db()` / `close_db()` called on FastAPI lifespan
- `get_db()` context manager with auto-commit/rollback

### Weather Service (`backend/app/services/weather.py`)
- `get_nearest(lat, lng, metadata_list)` — Euclidean distance to find nearest station/area
- `fetch_temperature()` — NEA V1: air-temperature
- `fetch_forecast()` — NEA V1: 2-hour-weather-forecast
- `fetch_wbgt()` — NEA V2: WBGT heat stress (different JSON structure from V1!)
- `get_localized_weather(lat, lng)` → unified `{area_name, temperature, forecast, wbgt}`

### Spatial Service (`backend/app/services/spatial.py`)
- `find_nearest_shelters(lat, lng, limit=5)` — PostGIS `ST_Distance` + `<->` operator
- `calculate_route_coverage(route_geojson)` — `ST_Intersection` overlay on covered_linkways, returns coverage %

### Ingestion (`backend/ingestion/ingest_weather.py`)
- `fetch_all_weather_data()` — parallel fetch: temperature, forecast, WBGT
- `store_snapshot(data)` — UPSERT into `weather_snapshots` table
- `run_ingestion()` — main entry point
- `lambda_handler(event, context)` — AWS Lambda compatible entry
- Dual mode: cron (`python -m ingestion.ingest_weather`) or Lambda

### Crontab (`infra/crontab`)
```cron
*/15 * * * * cd /home/ubuntu/run-ready-sg/backend && /usr/bin/python3 -m ingestion.ingest_weather >> /var/log/runready/ingestion.log 2>&1
*/15 * * * * sleep 60 && curl -s http://localhost:8000/api/alerts/check >> /var/log/runready/alerts.log 2>&1
```

---

## 10. FRONTEND DETAILS

### Tech Stack
- React 18.3.0 + TypeScript
- Vite 5.4.0 (build tool, dev proxy `/api` → `localhost:8000`)
- Tailwind CSS 4.1.14 with Material Design 3 color tokens
- Leaflet 1.9.4 + React-Leaflet 4.2.1 (maps)
- @mapbox/polyline 1.2.1 (route decoding)
- Motion 12.23.24 (animations)
- Lucide React 0.546.0 (icons)
- Axios 1.13.6 (HTTP)
- canvas-confetti 1.9.4

### Mock Flag System (`frontend/src/services/api.js`)
```javascript
const MOCK = {
  checkRun: true,      // F1 — flip to false when real endpoint ready
  findShelter: true,   // F2
  bestTimes: true,     // F5
  planRoute: true,     // F4
  alerts: true         // F3
};
```
Each API function checks its flag: if true, calls mock.js; if false, calls real backend via Axios.

### Mock Data (`frontend/src/services/mock.js`)
- Simulated delay: 0.8–2.5s per call
- `mockCheckRun`: 40% WARNING, 60% SAFE (randomized)
- `mockFindShelter`: 3 sample shelters with distances
- `mockBestTimes`: 3 windows (Best/Good/Okay, scores 92/74/58)
- `mockPlanRoute`: 1 route, 5.1km, 62.3% coverage
- `mockSubscribeAlert`: success response

### App Structure (`frontend/src/App.tsx`)
- Tab-based navigation via `useState` (not React Router)
- `AnimatePresence` + `motion.div` for page transitions
- Wraps all content with `LocationProvider` (global GPS context)
- Passes `runCheckResult` state to HomeView

### GPS & Location (`frontend/src/components/LocationProvider.tsx`)
- Global context: `{ currentUserPos, locationReady, permissionState }`
- `navigator.geolocation.watchPosition()` with high accuracy
- Queries `navigator.permissions.query({ name: "geolocation" })` for permission state
- Updates every 5–10s (maximumAge: 5000, timeout: 10000)

### Map Hook (`frontend/src/map/useLeafletMap.ts` — 1171 lines)
- Full Leaflet map lifecycle management
- Route rendering: completed (blue) vs remaining (gray) segments
- Animated polyline "draw" on first load
- User position marker with heading arrow (rotates with compass)
- Shelter markers (clickable)
- Progress calculation: projects user onto nearest route segment
- Auto-follow mode in navigation
- Recenter button when user drifts off-screen

### Key Pages
- **HomeView**: Hero CTA → RunStatusCard → WeatherBentoGrid → QuickActions
- **ShelterView**: Leaflet map + shelter markers → bottom sheet → navigate to shelter
- **RouteView**: Distance slider + loop toggle → generate route → navigation mode
- **TimeView**: Duration selector → best time windows (score 0–100)

### Navigation Flows

**Shelter Navigation:**
1. ShelterView loads → calls `findShelter()` API
2. User taps shelter marker → bottom sheet shows details
3. User taps "Navigate Now" → decodes `route_polyline` → GeoJSON LineString
4. Navigation mode: full-screen map, route highlighted, user tracked

**Route Planning:**
1. User adjusts distance (1–20km) and loop toggle
2. Taps "Generate route" → calls `planRoute()` API
3. Backend returns polyline + coverage % + shelter count
4. User taps "Start navigation" → full-screen map with route

### Styling
- Fonts: Manrope (headlines), Inter (body)
- Color scheme: teal primary (#005e53), light green secondary (#91f78e), Material Design 3 tokens
- Glass morphism effects (backdrop blur)
- Custom range input styling

---

## 11. INFRASTRUCTURE

### Docker Compose (`infra/docker-compose.yml`)
```yaml
services:
  db:
    image: postgis/postgis:15-3.4
    ports: 5432:5432
    env: POSTGRES_DB=runready, USER=runready_user, PASSWORD=changeme
    volumes: pgdata, migrations as init scripts
    healthcheck: pg_isready
  backend:
    build: ../backend/Dockerfile
    ports: 8000:8000
    depends_on: db (healthy)
    command: uvicorn --reload (dev)
```

### Nginx (`infra/nginx.conf`)
- Port 80
- `/` → `/var/www/frontend` (try_files → index.html for SPA routing)
- `/api/` → `http://localhost:8000` (proxy to FastAPI)
- `/health` → `http://localhost:8000`

### RDS Provisioning (`infra/provision_rds.sh`)
- Instance: `runready-db` (db.t3.micro, PostgreSQL 15.13)
- Region: ap-southeast-1
- Storage: 20 GB gp2
- Publicly accessible (for team dev access)
- Backup: 7 days retention
- Multi-AZ: disabled

### EC2
- Instance type: t3.small (2 vCPU, 2 GB RAM)
- Region: ap-southeast-1
- OS: Ubuntu 24.04 LTS (team decision — broader community docs, Docker Compose v2 built-in)
- Provisioned by Shihao on shared AWS account (Apr 4)
- Team needs to send public SSH keys to Shihao for access
- SSH: `ssh -i key.pem ubuntu@<EC2_PUBLIC_IP>`

### Security Group Inbound Rules
| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (future) |
| 8000 | TCP | 0.0.0.0/0 | FastAPI direct (dev/debug) |

---

## 12. EXTERNAL DATA SOURCES

| Data | Source | Format | Used By | Notes |
|------|--------|--------|---------|-------|
| Air Temperature | NEA V1 (data.gov.sg) | JSON | F1, F5 | Real-time per station |
| 2-Hour Forecast | NEA V1 (data.gov.sg) | JSON | F1, F3, F5 | Keyword-matched for rain |
| WBGT Heat Stress | NEA V2 (data.gov.sg) | JSON | F1, F3, F5 | **Different auth & JSON from V1!** |
| HDB Buildings | data.gov.sg | CSV (no coords) | F2 | 10,743 residential buildings, geocoded via OneMap |
| CD Shelters | data.gov.sg | CSV (no coords) | F2 | 589 shelters, geocoded via postal code |
| NParks Facilities | data.gov.sg | GeoJSON (WGS84) | F2 | 37 shelters (filtered CLASS='SHELTER') |
| Covered Linkways | LTA | ESRI Shapefile (SVY21) | F4 | Converted SVY21→WGS84 by Shihao |
| Walking Routes | OneMap API | Encoded polyline | F2, F4 | NOT yet integrated |
| Routing (shelter nav) | OSRM | GeoJSON | F2 (frontend) | San's branch uses OSRM public demo server |

**Coordinate Systems:**
- Singapore govt data uses **SVY21 (EPSG:3414)** — must convert to WGS84 (EPSG:4326)
- NParks GeoJSON is already WGS84
- Conversion done via `pyproj.Transformer` in seed scripts

---

## 13. ENVIRONMENT VARIABLES

```env
# Database
DB_HOST=localhost                    # or RDS endpoint
DB_PORT=5432
DB_NAME=runready
DB_USER=runready_user
DB_PASSWORD=changeme                 # production: RunReady2026Sg
DATABASE_URL=postgresql://...

# NEA APIs
DATA_GOV_API_KEY=your_api_key_here

# AWS
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
SES_SENDER_EMAIL=alerts@runready.sg

# OneMap (for routing)
ONEMAP_EMAIL=your_email
ONEMAP_PASSWORD=your_password

# App
BACKEND_PORT=8000
FRONTEND_PORT=5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 14. DEVELOPMENT WORKFLOW

### Contract-First Development
1. Backend updates `docs/api-contract.md` with endpoint spec
2. Backend updates `frontend/src/services/mock.js` with matching fake data
3. Frontend builds UI against mock data (MOCK flags in `api.js`)
4. Backend implements real endpoint
5. Flip flag in `api.js`: `MOCK.featureName = false`
6. Real data flows automatically

### Branching
- `main` — always deployable, protected
- Feature branches per person (e.g., `san`, `musah`, `shihao`)
- Merge via PR with ≥1 reviewer

### Code Style
- Python: black (line length 100)
- JavaScript: Prettier (defaults)

### What NOT to Change Without Discussion
- Folder structure (backend/, frontend/, database/)
- Mock flag system in api.js
- Database schema (add migrations, don't edit existing)
- API endpoint URLs

---

## 15. BRANCH STATUS (as of Apr 4)

### `main`
- Boilerplate + backend structure
- Justin's frontend merged (PR #1)
- Ingestion pipeline added

### `origin/san` (San — Frontend) — 14 commits ahead
Major frontend rewrite:
- JSX → TypeScript
- New components: CheckRun, RunStatusCard, WeatherBentoGrid, ShelterBottomSheet, RoutePlanningPanel, RouteMapPanel, LocationProvider
- Full Leaflet map integration with GPS tracking, compass heading, navigation mode
- OSRM routing for shelter navigation
- Deployed to CloudFront: `https://dfiucv08q17cd.cloudfront.net/`

### `origin/musah` (Mustafa — Database) — 2 commits ahead
- RDS provisioning script (`provision_rds.sh`)
- Shelter seeding pipeline (complete rewrite of `load_shelters.py`)
- 11,367 shelters loaded (HDB: 10,743 + CD: 589 + NParks: 37)
- OneMap geocoding with JSON cache files
- `DATASETS.md` documentation

### `origin/shihao` (Shihao — Database) — 3 commits ahead
- LTA Covered Linkway data (shapefile → GeoJSON → PostGIS)
- Updated `load_linkways.py` to process GeoJSON
- Password updated in `config.py` to match RDS
- EC2 + RDS provisioned on shared AWS account (Apr 4)

### `origin/ibnu-decision-engine-prototype` (Ibnu — Backend) — 4 commits ahead
- Working local MVP prototype: FastAPI + HTML/JS
- Demonstrates core F1 logic: GPS → NEA APIs → spatial matching → SAFE/WARNING
- Foundation code later refactored into main repo structure

---

## 16. WHAT'S DONE vs WHAT'S LEFT (Apr 4)

### Done ✅
- EC2 provisioned (Shihao, shared AWS account, Ubuntu 24.04)
- RDS provisioned with PostGIS (Mustafa/Shihao)
- Shelter data seeded: 11,367 rows (Mustafa)
- Linkway data loaded (Shihao)
- Backend F1 (check-run) working
- Backend F5 (best-times) working
- Backend F2 (find-shelter) partially working (PostGIS query, no OneMap route)
- Frontend fully rewritten in TypeScript with Leaflet maps (San)
- Frontend deployed to CloudFront
- Ingestion pipeline code ready
- Mock data system in place

### NOT Done ⚠️ (remaining for sprint day Apr 4 + week to code freeze)
- **Backend deployment to EC2** (Docker + Nginx) — S1-08
- **Connect backend to live RDS** (update .env with real credentials)
- **Set up cron ingestion** on EC2
- **OneMap routing integration** for F2 shelter directions
- **F3 (Alerts):** SES configuration, subscription endpoint, alert checking
- **F4 (Route Coverage):** Route generation + PostGIS linkway overlay (may be cut)
- **Flip MOCK flags to false** for all working endpoints
- **End-to-end testing** on live URL
- **AI usage log** needs updating

---

## 17. CRITICAL DEPENDENCIES & FALLBACKS

| Blocker | What it blocks | Fallback |
|---------|----------------|----------|
| S1-08: Deploy backend to EC2 | All real API connections | Stay on localhost (less impressive) |
| S2-03: OneMap walking route | F2 walking directions | Show shelter locations without route, straight-line distance only |
| S2-10: Linkway data in PostGIS | F4 route coverage scoring | **CUT F4 entirely**, polish F1+F2+F3+F5 |
| S3-01: AWS SES config | All F3 alert tasks | Demo with verified test emails only |

---

## 18. TEAM CHAT UPDATES (Apr 4)

- **Shihao:** Created EC2 and RDS on shared account, loaded linkways data. Needs public keys from team for SSH access.
- **Mustafa:** Recreated database on new RDS. Same credentials, new host address (confirm with him).
- **San:** Frontend done — Dashboard (check run + shortcuts), Shelter Map, Route Planning. Route Planning depends on backend. GPS issue: Justin gets repeated permission prompts (suspected Telegram in-app browser or Android/iOS mismatch; Chrome laptop works fine, prompts once).
- **All team:** Meeting at school Saturday Apr 4 to finish remaining work before code freeze.

---

## 19. RDS CONNECTION DETAILS

```
Host: [CONFIRM NEW HOST with Mustafa/Shihao — old was runready-db.cjw44gsugtna.ap-southeast-1.rds.amazonaws.com]
Port: 5432
Database: runready
User: runready_user
Password: RunReady2026Sg
```

Test command:
```bash
PGPASSWORD=RunReady2026Sg psql -h <NEW_HOST> -U runready_user -d runready -c "SELECT shelter_type, count(*) FROM shelters GROUP BY shelter_type;"
```

Note: RDS security group may need your IP added for local access. From EC2 it should work directly.

---

## 20. KEY TECHNICAL DECISIONS

1. **Monolithic FastAPI** (not microservices) — simpler for 4-week sprint
2. **Cron on EC2** (not Lambda + EventBridge) — simpler, but Lambda handler exists for future
3. **PostGIS for spatial queries** (not Python math) — accurate, demonstrates cloud competency
4. **Mock-first frontend** — frontend never blocked by backend
5. **Tab-based navigation** (useState) instead of React Router — simpler, works offline
6. **OSRM** for shelter routing in frontend (San's implementation) vs OneMap in backend (contract spec) — may need alignment
7. **Ubuntu 24.04 LTS** for EC2 (not Amazon Linux) — broader community docs, Docker Compose v2 built-in
8. **t3.small EC2** — sufficient for course project (backend + Nginx only, DB on RDS, frontend on S3)
9. **1 route, not 2–3** for F4 — reduced complexity

---

## 21. AI USAGE

All AI usage must be logged in `ai-usage-log.md` (project spec requirement).
Format: `| Date | Team Member | AI Tool | What Was Generated | Learning |`

---

## 22. SPRINT TASK BOARD SUMMARY

### Sprint 1 (Mar 19–25): Infrastructure
| ID | Task | Owner | Status |
|----|------|-------|--------|
| S1-01 | Provision EC2 t3.small | Keefe (Ibnu support) | ✅ Done (Shihao on shared account) |
| S1-02 | Provision RDS + PostGIS | Mustafa, Shihao | ✅ Done |
| S1-03 | S3 bucket + CloudFront | San, Justin | ✅ Done |
| S1-04 | Push boilerplate to GitHub | Ibnu, Keefe | ✅ Done |
| S1-05 | Create DB schema | Shihao, Mustafa | ✅ Done |
| S1-06 | Download shelter datasets | Mustafa, Shihao | ✅ Done |
| S1-07 | Seed shelters into PostGIS | Mustafa, Shihao | ✅ Done (11,367 rows) |
| S1-08 | Deploy backend to EC2 | Keefe, Ibnu | ⚠️ Not done |
| S1-09 | Configure .env with real keys | Ibnu, Keefe | ⚠️ Not done |
| S1-10 | Scaffold React + deploy to S3 | Justin, San | ✅ Done |
| S1-11 | Build Dashboard page | San, Justin | ✅ Done |
| S1-12 | End-to-end smoke test | All | ⚠️ Not done |

### Sprint 2 (Mar 26–Apr 1): Core Features
| ID | Task | Owner | Status |
|----|------|-------|--------|
| S2-01 | Harden decision engine | Ibnu, Keefe | ⚠️ Not done |
| S2-02 | Build shelter endpoint | Keefe, Ibnu | ⚠️ Partial (PostGIS works, OneMap TODO) |
| S2-03 | OneMap walking route | Keefe, Ibnu | ⚠️ Not done |
| S2-04 | Build Shelter Map page | San, Justin | ✅ Done |
| S2-05 | Walking route overlay | Justin, San | ✅ Done (using OSRM) |
| S2-06 | Set up cron ingestion | Ibnu, Keefe | ⚠️ Not done |
| S2-07 | Harden time-slot finder | Ibnu | ⚠️ Not done |
| S2-08 | Build Time Planner page | Justin, San | ✅ Done |
| S2-09 | Download linkway shapefile | Shihao, Mustafa | ✅ Done |
| S2-10 | Load linkways into PostGIS | Shihao, Mustafa | ✅ Done |
| S2-11 | Build navigation bar | San, Justin | ✅ Done |
| S2-12 | Flip F1 mock to real | Ibnu, San | ⚠️ Not done |

### Sprint 3 (Apr 2–8): Polish + Stretch
| ID | Task | Owner | Status |
|----|------|-------|--------|
| S3-01 | Configure AWS SES | Keefe | ⚠️ Not done |
| S3-02 | Build alert subscription endpoint | Keefe, Ibnu | ⚠️ Not done |
| S3-03 | Alert checking + SES email | Keefe, Ibnu | ⚠️ Not done |
| S3-04 | Add alert check to cron | Ibnu | ⚠️ Not done |
| S3-05 | Build Alerts settings page | Justin, San | ⚠️ Not done |
| S3-06 | Route generation + coverage | Ibnu, Keefe | ⚠️ Not done (may be cut) |
| S3-07 | Route Planner page | San, Justin | ✅ Done (UI ready, needs backend) |
| S3-08 | Flip remaining mocks to real | Ibnu, San | ⚠️ Not done |
| S3-09 | End-to-end testing | All | ⚠️ Not done |
| S3-10 | Cost analysis draft | Shihao, Mustafa | ⚠️ Not done |
| S3-11 | Report skeleton | Mustafa | ⚠️ Not done |
| S3-12 | CODE FREEZE Apr 8 | All | — |

### Sprint 4 (Apr 9–19): Report + Video Only
All tasks not started. No coding except bug fixes.

---

## 23. IBNU'S SETUP NOTES

- **Local machine:** macOS (Apple Silicon, arm64), Homebrew at /opt/homebrew
- **psql installed:** `brew install libpq && brew link --force libpq`, PATH added to ~/.zshrc
- **RDS connection test:** Previously hung due to security group not allowing local IP. Should work from EC2.
- **SSH to EC2:** Need to send public key to Shihao. Username is `ubuntu` (not `ec2-user` since Ubuntu AMI).
