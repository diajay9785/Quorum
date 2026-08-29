# Day 3 Log — Backend + Auth + Database (29 Aug 2026)

## Hour 1: FastAPI project setup
- Created `api/main.py`, wired to `models/pipeline.py`'s `predict()`.
- Hit a folder-casing bug: original scaffold had `API`, `APP`, `Data`, `Features`, `Models`
  capitalized. Windows/Python import system is case-sensitive on imports even though Windows
  file system isn't — `import api` failed against a folder literally named `API`.
- Renamed all five folders to lowercase. Git's `core.ignorecase=true` default meant `git mv`
  couldn't detect the rename at first — had to temporarily set `core.ignorecase false` to force
  Git to recognize the casing change before it would commit correctly. This matters because
  Render (deployment target) runs Linux, which is case-sensitive — a casing mismatch that looks
  fine on Windows would have broken silently in production.
- `/score` endpoint live and tested manually via `/docs`.

## Hour 2: /transactions, /stats, /feedback endpoints
- Added all three endpoints. `/stats` reads directly from Day 2's `test_report.json`,
  `cost_model.json`, `decision_config.json` — no new computation.
- Found and fixed a real bug in `record_feedback()` (in `models/pipeline.py`, originally written
  Day 2): it appended feedback rows to `retrain_queue.csv` using `header=False` without
  reindexing to the file's actual column order, so values silently shifted columns on every
  write after the first. Fixed by reindexing the new row against the file's existing header
  before appending.

## Hour 3: Supabase project setup
- Created Supabase project (had to redo once — first project was accidentally created in Tokyo
  region, deleted and recreated in Mumbai for lower latency from India).
- Created 3 tables: `transactions`, `decisions`, `retrain_feedback`.
- Enabled email/password auth, confirmed working with a real signup.

## Hour 4-5: Wire FastAPI to Supabase + JWT auth
- `/score` and `/feedback` now write to Postgres; `/transactions` reads live from Postgres
  instead of an in-memory list.
- Hit Row-Level Security (RLS) blocks twice: first needed `anon` role policies (insert/select)
  on all three tables, then hit it again once JWT auth was added — Supabase treats logged-in
  requests as role `authenticated`, not `anon`, so a second set of policies was needed for that
  role too. Both now in place.
- Chose full custom JWT middleware over the schedule's simplified "Supabase client-side check"
  fallback — reasoning: an unprotected backend undermines the project's own "auditable,
  traceable" pitch, since anyone could call `/score` directly without logging in if only the
  frontend checked login state.
- Added `/auth/signup` and `/auth/login` endpoints; `get_current_user()` dependency protects
  `/score`, `/transactions`, `/feedback` (left `/stats` public — aggregate model metrics only,
  no user data).
- Verified: no token → 401, valid token → 200. Confirmed via direct curl since Swagger UI's
  manual header field had a quirk where it wouldn't actually attach the header to requests.

## Hour 6: Seed realistic history
- `data/seed.py`: logs in, replays 200 sampled rows from `transactions.csv` (`random_state=42`
  for reproducibility) + 10 rows from `holdout_unseen_patterns.csv` through the live `/score`
  endpoint.
- Result: 210/210 succeeded. Verified via SQL query that all 10 unseen-pattern rows correctly
  got `anomaly_flag: true` — anomaly layer holding up on a second independent test, consistent
  with Day 2's 150/150 result.

## Hour 7: Deploy to Render
- Added `requirements.txt`, `.python-version` (3.13), and CORS middleware (`allow_origins="*"`
  for now — tighten to actual Vercel URL once Day 4 frontend exists).
- Deployed to Render free tier. Live at: `https://quorum-j7zr.onrender.com`
- Flag carried forward: two model files (67MB, 72MB) are over GitHub's 50MB soft limit and
  eating into Render's free-tier 512MB disk. Not a blocker yet — worth switching to Git LFS if
  models grow further.

## Hour 8: Test against live deployed URL
- Verified all endpoints against the live Render URL (not localhost): `/`, `/auth/signup`,
  `/auth/login`, `/score`, `/transactions`, `/stats` — all working correctly, including real
  ML inference (SHAP explanations matched local output exactly) and a live database round-trip.
- Confirmed real high-confidence catches in production data, e.g. transaction_id 7460 scored
  0.9077, band "block", anomaly_flag true.

## End-of-day checkpoint
Achieved — real, deployed, authenticated, auditable API. Every decision traceable (Postgres
`decisions` table), auth enforced at the API layer (not just UI), anomaly detection re-verified
independently of Day 2. Backend fully done for Day 4's frontend to consume.

## Carrying into Day 4
- CORS is currently wide open (`allow_origins="*"`) — restrict to the real Vercel domain once
  deployed.
- Model file sizes (67MB/72MB) worth watching if they grow.
- Backend URL for frontend to point at: `https://quorum-j7zr.onrender.com`