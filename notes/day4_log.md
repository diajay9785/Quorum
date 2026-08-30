# Day 4 Log — Sun 30 Aug — Frontend, Localization, Redesign, Deploy, Demo Prep

## Goal of the day
Build the React frontend, connect it to the live backend, get it deployed publicly, and prepare for the demo — per the original schedule, plus a full visual redesign and pitch/Q&A prep added mid-day.

## Hour 1 — Frontend scaffold
- React + Vite + Tailwind project created inside `app/`.
- Hit a scaffolding mistake early: `npm create vite` was run one level too deep, producing a nested `app/app/` folder — fixed by moving contents up one level and removing the empty wrapper.
- Verified Tailwind wired correctly with a test screen before moving on.
- Committed: scaffold + Tailwind.

## Hour 2 — i18next + Supabase auth
- Installed `react-i18next`, created `locales/en`, `locales/hi`, `locales/ta` with `translation.json` files.
- Hit a folder-nesting mistake creating the locale folders in VS Code (ended up chained instead of siblings) — deleted and recreated correctly.
- Installed `@supabase/supabase-js`, created `supabaseClient.js`, built `Auth.jsx` (login/signup form) and wired session state into `App.jsx`.
- Confirmed: login works with `diatest1@gmail.com`, language switch (EN/HI/TA) works live on the title text.
- Feedback from testing: translation only applied to the title, not the rest of the UI (addressed in Hour 3 wrap-up). Sign-up auto-logs in immediately — confirmed this is expected Supabase behavior (email confirmation is off), not a bug; left as-is since dedicated test accounts already exist.
- Committed: i18next + Supabase login/signup.

## Hour 3 — Live Simulator, CORS fix, explanation bug fix
- Built `SimulatorPanel.jsx` with 4 hardcoded presets (Normal, Obvious Fraud, Ambiguous, Unseen Pattern) calling the live `/score` endpoint.
- **Presets were corrected to use real rows pulled directly from `transactions.csv` / `holdout_unseen_patterns.csv`** instead of guessed values — this actually corrected an initial "unseen pattern" preset that had the wrong shape (guessed as one big transaction; real pattern is many small, rapid ones).
- **Bug 1 — CORS block:** `allow_origins=["*"]` combined with `allow_credentials=True` is invalid for credentialed requests; browsers silently reject it. Fixed by listing explicit origins (`localhost:5173`, later the Vercel domain).
- **Bug 2 — Postgres type error:** preset `transaction_id`s were strings (e.g. `"sim-normal-001"`) but the `transactions` table column is integer — fixed by using real integer IDs from the source CSVs.
- **Bug 3 — contradictory explanations:** SHAP's top-3 features sometimes included a `cat_*` (one-hot category) feature whose actual value was 0 for that row, producing nonsense like "this is dining... this is jewelry" for the same transaction. Fixed in both `explain.py` and the live `models/pipeline.py` by skipping any `cat_*` feature that isn't actually 1 for that row.
- **Bug 4 — accidental file overwrite:** a copy-paste mistake replaced `api/main.py`'s entire FastAPI app with `explain.py`'s offline script content, which crashed Render on deploy (`exit status 3`, no `app` object for uvicorn to find). Restored `main.py` from the known-good version; re-applied the CORS + explanation fixes correctly to the right files this time.
- **Git housekeeping:** hit the Day-3-style case-collision bug again — `Models/pipeline.py` vs `models/pipeline.py`, and `Data/retrain_queue.csv` vs `data/retrain_queue.csv` — both fixed with the two-step `git mv` temp-rename trick (direct rename fails on Windows' case-insensitive filesystem). Also found and removed a stray root-level `node_modules`/`package.json`/`package-lock.json` that shouldn't have existed outside `app/`.
- **PowerShell fix (permanent):** `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` — resolved recurring `.ps1` script-blocked errors (npm, venv activation) for the rest of the session.
- Extended translations to cover Simulator buttons, band badges, and labels (not just the title).
- Committed: Simulator + both bug fixes + git cleanup.

## Hour 4 — Charts
- Installed Recharts. Confirmed `test_report.json`'s existing `calibration_bins` data was sufficient for both a Score Distribution histogram and a Reliability Diagram — no new backend endpoint needed.
- Built `StatsCharts.jsx`. Hit a missing-dependency error (`@supabase/supabase-js` unresolved) after earlier `node_modules` cleanup — fixed with a targeted reinstall.
- Reliability diagram shows a noisy middle band (0.55–0.66 predicted probability) — attributed to small per-bin sample counts (6–7 rows) in that range, not a systematic calibration failure; noted for demo Q&A.
- Committed: charts.

## Hour 5 — Flagged Queue + Autonomy Meter
- Confirmed real data before building: 227 decisions in Supabase at check time (194 approve / 26 escalate / 7 block, ~85.5% autonomy).
- Built `FlaggedQueue.jsx` (recent escalate/block rows with explanations) and `AutonomyMeter.jsx` (live approve/escalate/block split with a colored bar).
- Hit an "Invalid or expired token" error — resolved by logging out/back in for a fresh session token.
- Committed: flagged queue + autonomy meter.

## Hour 6 — Audit Trail
- Chose an in-app view toggle over `react-router` given time constraints — same end result for judges, lower risk this late in the build.
- Built `AuditTrail.jsx`: full decision history, searchable by transaction ID or band.
- Committed: audit trail.

## Hour 7 — Deploy to Vercel
- Root Directory had to be explicitly set to `app` (Vercel initially scanned the repo root and misdetected the project as FastAPI, tried to run `pip install -r requirements.txt`).
- Framework Preset had to be manually corrected to Vite after fixing Root Directory.
- Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) were left unsaved on first attempt — site deployed but crashed blank (`supabaseUrl is required`) until they were actually saved and a fresh build triggered.
- Backend CORS updated to allow the live Vercel domain alongside localhost.
- Confirmed working end-to-end on the public URL: login, all 4 presets, autonomy meter, charts, flagged queue, audit trail.
- Live URLs: frontend `https://quorum-ivory.vercel.app`, backend `https://quorum-j7zr.onrender.com`.

## Mid-day addition — Manual Entry (proof-of-liveness)
- Added a "Try Your Own Transaction" form so any user-entered transaction (not a preset) gets scored live — built specifically to prove to skeptical viewers (including myself, mid-build) that results are genuine live inference, not pre-inserted data. Tested with a deliberately extreme made-up transaction (amount $5000, 50,000 transactions/30 days) — correctly triggered the anomaly flag and a distinct real score.

## Mid-day addition — Full visual redesign
- Replaced the original emerald/slate Tailwind palette with a new indigo/violet/amber/rose palette across the entire app (chosen to be visually distinct from WindSense AI's palette).
- Login page rebuilt with ambient side staging: an animated pipeline-step checklist (cycling through Feature extraction → Ensemble scoring → Anomaly check → SHAP explanation) and a floating stats panel, both inspired by Stripe Radar's marketing page structure but built with plain CSS/React state — no video assets.
- Dashboard rebuilt with a top nav bar (logo, language pills, audit trail button, logout) replacing stacked full-width buttons; all component files (`SimulatorPanel`, `ManualEntry`, `AutonomyMeter`, `StatsCharts`, `FlaggedQueue`, `AuditTrail`) restyled to match.

## End-of-day deliverables
- `README.md` — live URLs, feature list, real test-set metrics, architecture diagram, tech stack, setup instructions, API reference, and an explicit "known limitations" section.
- `qa_prep.md` — honest answers to 60 anticipated judge questions, organized by difficulty (foundational, frequently-asked, trap, tricky, deep-dive), explicitly including "this wasn't tested" answers where that's the truth rather than overclaiming.
- Full pitch script written and mapped to exact dashboard actions/clicks, first-person, individual-project framing, no build-timeline mentions, addressing the scope/generalizability framing (framework vs. deployable, cold-start plan, synthetic-data justification) as the priority section per explicit demo requirements.

## End-of-day checkpoint
Live, deployed, redesigned, multi-language dashboard with working simulator, manual entry proof, autonomy meter, charts, flagged queue, and audit trail — plus a README, a full honest Q&A prep document, and a shot-by-shot demo script ready for tomorrow's recording.

## Carried into Day 5 (submission day)
- Record the demo video using the finalized script.
- Final check: confirm Render backend is warm before recording (free tier sleeps after inactivity — wake it via the health-check URL first).
- Optional if time allows: formal statistical significance check on reported metrics, since it's a named gap in the Q&A prep (Q33) and a quick bootstrap CI would strengthen the answer if asked live.