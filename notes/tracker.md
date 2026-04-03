# RunReady SG — Sprint Day Tracker (Apr 4, 2026)

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
