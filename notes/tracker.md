# RunReady SG — Sprint Day Tracker

> **FINAL DEADLINE: Apr 19 23:59** — submit PDF report + video URL + peer assessment.
> Code freeze was Apr 8 but we've been making fixes. Today (Apr 18) is the last day.

---

## Apr 18, 2026 — Ibnu's session

### Done today
- [x] **Linkways overlay implemented** — teal dashed GeoJSON layer (`#0ea5e9`, weight 3, dashed) on Route + Shelter pages
  - `useLeafletMap.ts` — new `showLinkways` prop, fetches `/api/linkways` with map bounds on load + every `moveend`
  - `RouteView.tsx` + `ShelterView.tsx` — both pass `showLinkways: true`
- [x] **Bug: linkways vanishing on route generation / window switch / API failure**
  - Root cause: `currentUserPos` was in map setup effect deps → GPS updates destroyed+recreated the entire Leaflet map → linkways effect closure held dead map reference
  - Fix: removed `currentUserPos` from map setup deps (`useLeafletMap.ts` line ~799)
- [x] **Bug: race condition in linkways fetch**
  - `flyToBounds` then `flyTo(start, 17)` fired two concurrent `moveend` events → stale fetch (small area, no features) was overwriting the good one
  - Fix: `fetchId` counter — only last-started fetch renders
- [x] **Bug: empty API response clearing layer**
  - Fix: `if (!data?.features?.length) return` — keeps existing layer when new fetch returns no features

### TODO — Code (morning Apr 19)
- [ ] **Push `ibnu` branch to remote** — fixes from today not yet pushed
- [ ] **Linkways + route visual blending** — when a route is generated, the teal linkway lines and the red route polyline should both be readable together. Currently linkways go fully to back. Consider reducing route underlay opacity or adjusting z-order. Quick tweak only.
- [ ] **Move `ai-usage-log.md` back to repo root** — currently in `notes/` (gitignored). Project spec requires it in the repo for submission.

### TODO — Report (Ibnu owns / supports)
- [ ] **S3-16: Architecture & Implementation section** — Ibnu owns this (overdue since Apr 14)
- [ ] **S3-15: Business Model section** — Ibnu supports Shihao (overdue since Apr 12)
- [ ] **S3-17: Evaluation section** — Ibnu supports Keefe (overdue since Apr 14)

### TODO — Video + Submission
- [ ] **Record video segment** — ~2.5 min (was due Apr 18, do ASAP)
- [ ] **Final submission** — Apr 19 23:59: submit PDF report + video URL + peer assessment

---

## Teammates — what's left

### San / Justin (Track C — Frontend)
- [ ] **Alerts settings page** (F3 frontend) — not built
- [ ] **Route selector UI** — backend returns 3 routes, frontend only shows `routes[0]`
- [ ] **Video recording**

### Keefe (Track B — Backend)
- [ ] **Confirm F3 SES alerts** is fully working end-to-end
- [ ] **Video recording**
- [ ] **Report: Evaluation section** (Ibnu is support)

### Mustafa / Shihao (Track A — Database)
- [ ] **Cost analysis** (S3-10) — monthly estimates for EC2, RDS, S3, CloudFront, SES
- [ ] **Report: Architecture section** (S3-11, Mustafa)
- [ ] **Video recording**

---

## Apr 4, 2026 — Original sprint plan (kept for reference)

> **Code freeze: Apr 8.** 4 days left. This is the plan for the final push.

---

## Priority 1: Get Backend Live on EC2 (unblocks everything)

**Owner: Ibnu + Keefe + Shihao** | Morning

- [ ] Get SSH access from Shihao (send him your public key)
- [ ] SSH into EC2, clone repo, set up Docker
- [ ] Create `.env` with **real RDS host** (get new host from Mustafa)
- [ ] Run `docker compose up` — backend live on port 8000
- [ ] Copy `infra/nginx.conf` → set up Nginx
- [ ] Smoke test: hit `http://<EC2_IP>/api/check-run?lat=1.35&lng=103.82`

Once this works, **everything else unblocks**.

---

## Priority 2: Flip Mock Flags (connect frontend to real backend)

**Owner: Ibnu + San** | Right after P1

- [ ] Update `frontend/src/services/api.js` — set `MOCK.checkRun = false`
- [ ] Update Vite config or env to point to EC2 backend URL
- [ ] Test F1 end-to-end on CloudFront
- [ ] Flip `MOCK.findShelter = false`, `MOCK.bestTimes = false`

---

## Priority 3: Cron Ingestion

**Owner: Ibnu** | After P1

- [ ] Install crontab from `infra/crontab` on EC2
- [ ] Create `/var/log/runready/` directory
- [ ] Verify `weather_snapshots` table gets populated every 15 min

---

## Priority 4: F3 — SES Alerts (important for grading)

**Owner: Keefe** | Parallel with P2/P3

- [ ] Configure AWS SES — verify sender email
- [ ] Implement `POST /api/alerts/subscribe` (save to DB)
- [ ] Implement `GET /api/alerts/check` (query subscriptions, send SES email if WARNING)
- [ ] Add cooldown logic (don't spam)

---

## Priority 5: Align Shelter Routing

**Owner: San + Ibnu** | Quick decision needed

- [ ] Decide: keep OSRM (San's working implementation) or switch to OneMap
- [ ] **Recommendation:** Keep OSRM — it works, no registration needed, saves time
- [ ] Update `docs/api-contract.md` to match final decision

---

## Track A (Mustafa + Shihao) — DB work is done

**Shihao:**
- [ ] Help team get SSH access to EC2
- [ ] Start **cost analysis** (S3-10) — estimate monthly AWS costs (EC2, RDS, S3, CloudFront, SES)

**Mustafa:**
- [ ] Confirm new RDS host address to the team
- [ ] Start **report skeleton** (S3-11) — Architecture section, data pipeline explanation

---

## Track C (San + Justin) — Frontend mostly done

**San:**
- [ ] Help Ibnu flip mock flags + test end-to-end
- [ ] Build **Alerts settings page** (S3-05) if Keefe finishes F3 backend
- [ ] Fix GPS permission issue if Justin can reproduce it

**Justin:**
- [ ] Help with end-to-end testing across devices
- [ ] Support report/video prep

---

## What to CUT

- **F4 (Route Coverage Scorer)** — descope rule says cut if at risk by Apr 2. It's Apr 4. **Cut it.** Hide or remove Route Planner page. Mention as "future work" in report.
- **F6 (Personalized WBGT Coach)** — skip.

---

## Timeline: Order of Operations

| Time | Who | What |
|------|-----|------|
| Morning | Ibnu + Keefe + Shihao | Get backend deployed on EC2 |
| Morning | Mustafa | Confirm RDS host, start report |
| Midday | Ibnu + San | Flip mock flags, test F1/F2/F5 live |
| Midday | Keefe | Implement F3 (SES alerts) |
| Afternoon | Ibnu | Set up cron ingestion |
| Afternoon | Shihao | Cost analysis draft |
| Afternoon | All | End-to-end testing on phones |

---

## The Single Most Important Thing

**Backend running on EC2, connected to real RDS, accessible from CloudFront.** Everything else follows from that.
