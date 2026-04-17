# RunReady SG — Developer Notes

> **Purpose of this file:** This is a comprehensive context document for the RunReady SG project. Any developer (or AI assistant) reading this file should understand exactly what we're building, how the team is organized, what's been decided, and the rules of development. If you're an AI assistant helping a team member, read this entire file before writing any code.

---

## 1. What is RunReady SG?

RunReady SG is a **location-aware weather safety decision support system** for outdoor activities in Singapore. It's a cloud-native SaaS application built for a CS5224 Cloud Computing course at NUS.

**The core problem:** Singapore's tropical climate creates real risks for outdoor exercise — heat stress, sudden heavy rainfall, and lightning. People currently decide based on "looks okay" or a single island-wide forecast, which doesn't reflect hyper-local conditions. Weather can differ significantly across the island within minutes.

**What our app does:** Users get a real-time, location-specific Go/No-Go recommendation for outdoor activity. The system pulls live data from Singapore's National Environment Agency (NEA), matches it to the user's exact GPS position, and applies safety rules. If conditions are unsafe, it helps users find shelter and plan better times.

**This is a SaaS, not a standalone app.** The value requires cloud infrastructure: a backend continuously ingesting weather data every 15 minutes, a centralized PostGIS spatial database of shelters and covered walkways, and proactive email alerts via AWS SES. None of this works as a client-side app.

---

## 2. Team & Track Ownership

We have 6 team members split across 3 engineering tracks + 1 shared track:

| Track | Scope | Developers |
|-------|-------|------------|
| **Track A: Database & Spatial** | RDS PostgreSQL + PostGIS setup. Load shelter data (HDB, CD, NParks). SVY21→WGS84 coordinate conversion. Covered linkway shapefile ingestion. Spatial queries. | Mustafa, Shihao |
| **Track B: Backend API** | FastAPI on EC2/Docker. Decision engine, shelter endpoint, time-slot endpoint, alert endpoint. Cron ingestion pipeline. SES integration. OneMap routing. | Keefe, Ibnu |
| **Track C: Frontend** | React PWA on S3 + CloudFront. Mobile-responsive UI. React-Leaflet map integration. All user-facing pages. | San, Justin |
| **Track D: Report & Video** | Final report (10 pages), cost comparison, video presentation (15 min). All developers contribute in Sprint 4. | Everyone |

---

## 3. Features & Priority

Features were decided and voted on by the team. The priority is final:

| ID | Feature | Priority | Sprint | Status |
|----|---------|----------|--------|--------|
| **F1** | **PE Decision Engine** — Go/No-Go safety check using live temp + forecast + WBGT | MVP — MUST | Sprint 1 | **Live** |
| **F2** | **Find Shelter Now** — Nearest shelter (HDB/CD/NParks) with shelter list + OneMap walking route | MVP — MUST | Sprint 2 | **Live** |
| **F3** | **Weather Alerts (SES)** — Email notifications when thresholds breached for saved locations | MVP — MUST | Sprint 2–3 | **Backend Live** (frontend page not built) |
| **F5** | **Smart Time-Slot Finder** — Suggests safest time windows based on forecast trends | SHOULD | Sprint 2–3 | **Live** |
| **F4** | **Route Planner** — OneMap route with coverage %, shelter count, loop + destination modes | SHOULD (Last Priority) | Sprint 2–3 | **Live** (frontend shows 1 of 3 routes) |
| — | **Linkways Overlay** | — | Sprint 3 | **Backend Live** (frontend not integrated) |
| F6 | Personalized WBGT Coach — Profile-based threshold adjustments | NICE-TO-HAVE | Sprint 3 if ahead | Cut |
| F7 | Park Leaderboard | CUT — do not build | — | Mention in report as future work |
| F8 | Dynamic Shelter Rerouting | CUT — do not build | — | Mention in report as future work |

**Note on F4:** Initially scoped as 1 route. Keefe implemented 3 route alternatives — backend returns all 3 but frontend currently renders only `routes[0]`. Route selector UI is a pending task.

---

## 4. Architecture Overview

```
Users (mobile browser)
  │
  ├── CloudFront + S3 ──── React PWA (Track C)
  │     (static frontend)
  │
  └── EC2 Instance ──────── FastAPI Backend (Track B)
        │                     ├── /api/check-run      (F1)
        │                     ├── /api/find-shelter    (F2)
        │                     ├── /api/alerts/subscribe (F3)
        │                     ├── /api/best-times      (F5)
        │                     └── /api/plan-route      (F4)
        │
        ├── Cron Job ──────── Ingestion Script
        │                     (fetches NEA data every 15 min)
        │
        ├── Amazon SES ────── Email alerts (F3)
        │
        └── RDS PostgreSQL ── PostGIS (Track A)
              ├── shelters table
              ├── covered_linkways table
              ├── weather_snapshots table
              ├── weather_stations table
              └── alert_subscriptions table

External APIs:
  - NEA V1: air-temperature, 2-hour-forecast
  - NEA V2: WBGT (different auth + JSON structure)
  - OneMap: walking route generation
```

**Deployment strategy:** Start with EC2 + cron. If time allows, we may describe AppRunner + Lambda + EventBridge in the report as a "production architecture evolution" — but do NOT attempt a live migration before submission.

---

## 5. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite | React-Leaflet for maps, Axios for API calls |
| Backend | Python + FastAPI | Uvicorn server, Docker container |
| Database | PostgreSQL 15 + PostGIS | Hosted on AWS RDS |
| Hosting (FE) | AWS S3 + CloudFront | Static site hosting with CDN |
| Hosting (BE) | AWS EC2 (t3.small) | Docker + Nginx reverse proxy |
| Notifications | AWS SES | Email alerts for F3 |
| Data Ingestion | Cron + Python script | Every 15 min on same EC2 instance |
| External APIs | NEA (data.gov.sg), OneMap | Government weather data + routing |

---

## 6. Development Workflow (Contract-First)

**This is the most important section for understanding how we work together.**

We use a contract-first approach so that frontend and backend never block each other:

### The flow:
1. **Backend team** updates `docs/api-contract.md` with the endpoint spec (URL, params, response shape)
2. **Backend team** updates `frontend/src/services/mock.js` with fake data matching the contract
3. **Frontend team** builds UI against the mock data — they see realistic responses immediately
4. **Backend team** implements the real endpoint on EC2
5. When ready, **anyone** flips the flag in `frontend/src/services/api.js` from `true` to `false`
6. Real data flows through. No other code changes needed.

### Key files:
- `docs/api-contract.md` — THE source of truth. Backend owns this. Defines every endpoint.
- `frontend/src/services/api.js` — has per-feature MOCK flags at the top. Flip to `false` when real endpoint is deployed.
- `frontend/src/services/mock.js` — fake data matching the contract. Frontend devs build against this.

### Track A's contract with Track B:
Track A's deliverable is data in the database. Their "contract" is:
- `database/migrations/001_init_schema.sql` — the table schemas
- Once data is seeded, Track B writes queries against it using `backend/app/services/spatial.py`

---

## 7. Repo Structure

```
run-ready-sg/
├── backend/                  # Track B owns this
│   ├── app/
│   │   ├── main.py           # FastAPI entry + router registration
│   │   ├── config.py         # All env vars loaded here
│   │   ├── database.py       # PostgreSQL connection pool
│   │   ├── routers/          # One file per feature endpoint
│   │   │   ├── decision.py   # F1 ✅ Working
│   │   │   ├── shelter.py    # F2 ⚠️ Stub — needs OneMap integration
│   │   │   ├── routes.py     # F4 ⚠️ Stub — needs full implementation
│   │   │   ├── alerts.py     # F3 ⚠️ Stub — needs SES integration
│   │   │   └── timeslots.py  # F5 ✅ Working
│   │   └── services/         # Shared business logic
│   │       ├── weather.py    # ✅ NEA API client (V1 + V2)
│   │       └── spatial.py    # ⚠️ PostGIS queries — written but untested
│   ├── ingestion/
│   │   └── ingest_weather.py # ✅ Working (cron + Lambda compatible)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 # Track C owns this
│   ├── src/
│   │   ├── main.jsx          # Router setup
│   │   ├── index.css         # Base styles — Track C should redesign
│   │   ├── pages/            # ⚠️ Rough scaffolding — redesign freely
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ShelterMap.jsx
│   │   │   └── RoutePlanner.jsx
│   │   ├── components/       # Empty — Track C creates shared components here
│   │   └── services/
│   │       ├── api.js        # ✅ API client with MOCK flags — do NOT restructure
│   │       └── mock.js       # ✅ Fake data for dev — update if contract changes
│   ├── package.json
│   └── vite.config.js
├── database/                 # Track A owns this
│   ├── migrations/
│   │   └── 001_init_schema.sql  # ✅ Full schema — run on RDS
│   ├── seeds/
│   │   ├── load_shelters.py     # ⚠️ Has structure but needs real dataset URLs
│   │   └── load_linkways.py     # ⚠️ Works if .shp file is in data/ folder
│   └── data/                    # Place raw data files here (gitignored if large)
├── infra/
│   ├── docker-compose.yml    # ✅ Start DB + backend locally
│   ├── nginx.conf            # ✅ Reverse proxy config for EC2
│   └── crontab               # ✅ Ingestion schedule
├── docs/
│   └── api-contract.md       # ✅ THE contract between frontend and backend
├── .env.example
├── .gitignore
├── README.md
├── ai-usage-log.md           # Required by project spec — log AI usage as you go
└── developer_notes.md        # This file
```

**Legend:** ✅ = working code, ⚠️ = stub/skeleton that needs real implementation

---

## 8. API Endpoints (Summary)

Full details in `docs/api-contract.md`. Quick reference:

| Method | Endpoint | Feature | Status |
|--------|----------|---------|--------|
| GET | `/health` | Health check | ✅ Working |
| GET | `/api/check-run?lat=&lng=` | F1: Decision Engine | ✅ Working |
| GET | `/api/shelters/nearest?lat=&lng=&limit=` | F2: Shelter Finder | ✅ Working |
| GET | `/api/best-times?lat=&lng=` | F5: Time Slot Finder | ✅ Working |
| GET | `/api/plan-route?lat=&lng=&distance_km=&loop=&dest_lat=&dest_lng=` | F4: Route Planner | ✅ Working |
| GET | `/api/linkways?bbox=minLng,minLat,maxLng,maxLat` | Linkways overlay | ✅ Working |
| POST | `/api/alerts/subscribe` | F3: Alert Subscribe | ✅ Working |
| GET | `/api/alerts/check` | F3: Alert Check | ✅ Working |

---

## 9. Sprint Plan

| Sprint | Dates | Focus | Definition of Done |
|--------|-------|-------|-------------------|
| **Sprint 1** | Mar 19–25 | Infrastructure + Foundation | Live URL returns a real SAFE/WARNING response |
| **Sprint 2** | Mar 26–Apr 1 | Core Features | F1 hardened, F2 shelter finder works, F5 time-slots work, cron running |
| **Sprint 3** | Apr 2–8 | Polish + Stretch | F3 SES alerts work, F4 if ready, CODE FREEZE Apr 8 |
| **Sprint 4** | Apr 9–19 | Report + Video Only | Final.pdf + video submitted by Apr 19 23:59 |

**CODE FREEZE: April 8.** No new features after this date. Sprint 4 is report and video only.

---

## 10. Development Rules

### Code standards
- **Python:** Format with `black` (line length 100). Use type hints where practical.
- **JavaScript:** Format with Prettier (defaults).
- **Commits:** Descriptive messages. `feat: add shelter endpoint` not `update stuff`.

### Branching
- `main` — always deployable, protected
- `feature/<track>-<description>` — e.g., `feature/backend-shelter-endpoint`, `feature/frontend-dashboard-redesign`
- Merge via Pull Request. At least 1 team member reviews before merge.

### Environment variables
- **NEVER commit `.env` files** or API keys to Git
- Always update `.env.example` when adding new variables
- All config loaded through `backend/app/config.py` — don't scatter env vars across files

### API contract changes
- If backend needs to change an endpoint's response shape, update BOTH:
  1. `docs/api-contract.md`
  2. `frontend/src/services/mock.js`
- Tell the frontend team in the group chat so they know

### What NOT to change without team discussion
- The folder structure (backend/, frontend/, database/ separation)
- The `api.js` mock flag system
- The database schema (add new migrations instead of editing 001)
- The API endpoint URLs (these are the contract)

### What you CAN freely change
- Any `.jsx` page component — Track C owns the UI design
- Styling and CSS — Track C's decision
- Backend logic inside router files — Track B owns implementation details
- Seed scripts and data processing — Track A owns data engineering
- Adding new files within your track's folder

### AI usage
- You can use any AI tools (ChatGPT, Claude, Copilot, etc.)
- **You MUST log usage** in `ai-usage-log.md` — this is a project spec requirement
- Format: `| Date | Team Member | AI Tool | What Was Generated | Learning |`
- Log as you go. Don't try to reconstruct at the end.

---

## 11. External Data Sources

| Data | Source | Format | Used By |
|------|--------|--------|---------|
| Air Temperature | NEA V1 API via data.gov.sg | JSON | F1, F5 |
| 2-Hour Forecast | NEA V1 API via data.gov.sg | JSON | F1, F3, F5 |
| WBGT Heat Stress | NEA V2 API via data.gov.sg | JSON (different structure from V1!) | F1, F3, F5 |
| HDB Building Coords | data.gov.sg | CSV with SVY21 X/Y | F2 (shelters) |
| CD Shelter Locations | data.gov.sg | CSV/JSON | F2 (shelters) |
| NParks Facilities | NParks / data.gov.sg | GeoJSON | F2 (shelters — filter for pavilions) |
| Covered Linkways | LTA/URA | ESRI Shapefile (SVY21) | F4 (route coverage) |
| Walking Routes | OneMap API | Encoded polyline | F2, F4 |

**Important:** NEA V1 and V2 APIs have different JSON structures and authentication methods. The weather service (`services/weather.py`) already handles this difference — don't call the APIs directly from routers.

**SVY21 → WGS84:** Singapore government datasets use the local SVY21 coordinate system (EPSG:3414). Our app uses standard GPS coordinates (WGS84, EPSG:4326). All data must be converted before inserting into PostGIS. The conversion uses the `pyproj` library.

---

## 12. Key Technical Decisions

1. **Single backend server (not microservices):** We're using a monolithic FastAPI app on one EC2 instance. Simpler to deploy and debug in 4 weeks. The router-per-feature structure means we *could* split later but don't need to.

2. **Cron on EC2 (not Lambda + EventBridge):** Simpler for Sprint 1–3. The ingestion script is written to work as both a cron job AND a Lambda handler (`lambda_handler` function exists). We may describe the Lambda architecture in the report as a production evolution.

3. **PostGIS for spatial queries (not Python math):** The prototype used Python Euclidean distance. Production uses PostGIS `ST_Distance` for accurate geographic distance and `ST_Intersection` for route-linkway overlay. This is a key cloud/database competency for grading.

4. **Mock-first frontend development:** Frontend never waits for backend. The mock system in `api.js` lets Track C build and test UI independently.

5. **F4 generates 3 routes:** Keefe implemented 3 route alternatives using waypoint offsets. Backend returns `{routes: [{id, distance_km, coverage_pct, polyline, shelters_along_route}]}`. Frontend currently shows only `routes[0]` — route selector UI is pending.

---

## 13. TA Feedback to Address in Final Report

Our preliminary report received this feedback. The final report must address all points:

1. **Sharpen the SaaS justification** — explain why cloud (not just an app): real-time ingestion pipeline, centralized spatial DB, proactive SES alerts
2. **Differentiate users** — define subscription tiers: Free (individual), School (batch monitoring), Enterprise (API + dashboard)
3. **Add references** — cite MOE WBGT guidelines, Singapore Sports Council data, compare with Weather@SG and myENV apps
4. **Scalability analysis** — estimate concurrent users, show how architecture scales (EC2 → AppRunner)
5. **Detailed test cases** — boundary WBGT values, rain keyword matching, historical data replay, API latency measurement

---

## 14. Project Deadlines

| Date | Milestone |
|------|-----------|
| Mar 25 | Sprint 1 done — live URL working |
| Apr 1 | Sprint 2 done — core features working |
| Apr 2 | **F4 descope decision** — cut if linkway data not ready |
| Apr 8 | **CODE FREEZE** — no new features |
| Apr 19 23:59 | **FINAL DEADLINE** — report + video + peer assessment submitted |

---

---

## 15. Test Suite

- **Total tests:** 88 across 5 files in `backend/tests/`
- **Coverage:** 52% (207/395 statements)
- **Run (Docker):** `docker exec -it runready-backend python -m pytest tests/ --ignore=tests/test_browser.py -v`
- See `notes/testing_guide.md` for full documentation

---

*This document should be kept up to date as decisions change. Last updated: 2026-04-17.*
