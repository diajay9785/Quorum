# Quorum

**Cost-aware transaction risk scoring with explainable, autonomous AI**

Built for Track 2: Risk Manager — a 4-day hackathon build (27–30 Aug 2026).

---

## Live Demo

- **Frontend (Vercel):** https://quorum-ivory.vercel.app
- **Backend API (Render):** https://quorum-j7zr.onrender.com
- **Test account:** `diatest1@gmail.com` / `TestPassword123!`

> Note: the backend is on Render's free tier and may take up to a minute to wake up if it's been idle. If the first request times out, wait a moment and try again.

---

## What it does

Quorum scores financial transactions for fraud risk in real time and acts on that score autonomously — approving, escalating to a human, or blocking — with a plain-English explanation for every decision, shown in the language the user selects (English, Hindi, Tamil).

It is **not** a rule engine dressed up as AI. Every score comes from a trained ensemble of machine learning models making a live inference call, not a lookup table or a hand-written if/else chain.

### Core capabilities

- **Real trained classifier** — a leak-free stacking ensemble (Random Forest, Extra Trees, XGBoost, LightGBM base models + a Logistic Regression meta-learner) producing a genuine probability score per transaction.
- **Cost-aware decision threshold** — the approve/escalate/block cutoffs are tuned against an explicit cost matrix (cost of a false positive vs. a false negative), not picked to maximize raw accuracy.
- **3-band autonomous decision** — every transaction is automatically approved, escalated to a human, or blocked. No transaction sits in an unexecuted binary state.
- **Isolation Forest anomaly layer** — a second model trained to catch fraud patterns the classifier never saw during training. It correctly flagged **100% of a held-out "unseen pattern" test set** it was never trained on.
- **SHAP-derived explanations** — every decision comes with a plain-English explanation naming the top contributing features for that specific transaction, not a generic template.
- **Live autonomy meter** — the dashboard shows, in real time, what percentage of transactions the system handled on its own vs. escalated to a human, and why.
- **Multilingual UI** — English, Hindi, and Tamil, built on `react-i18next` with a JSON-per-language structure that scales to more languages without code changes.
- **Full audit trail** — every decision is written to Postgres (via Supabase) with a timestamp, score, band, and explanation, queryable and searchable.
- **Try-your-own-transaction** — a manual entry form lets anyone type in a transaction that has never existed in training data or presets and get a real, live score back, proving the system isn't returning pre-inserted results.

---

## Model performance (test set, never seen during training)

| Metric | Value |
|---|---|
| Precision | 0.8485 |
| Recall | 0.4746 |
| F1 | 0.6087 |
| ROC-AUC | 0.7825 |
| Cost reduction vs. naive 0.5 threshold | 12.67% |
| Unseen-pattern catch rate (adversarial test) | 100% (150/150) |

An ablation test (single XGBoost vs. the full ensemble) confirmed the stacking ensemble outperforms any individual base model on the same test set.

---

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React frontend  │ ───► │  FastAPI backend  │ ───► │  Trained models  │
│  (Vercel)         │      │  (Render)          │      │  (joblib files)   │
│  Vite + Tailwind   │      │  JWT-protected     │      │  ensemble +        │
│  react-i18next      │      │  endpoints          │      │  Isolation Forest   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                     │
                                     ▼
                          ┌──────────────────┐
                          │     Supabase       │
                          │  Postgres + Auth    │
                          │  (audit log store)   │
                          └──────────────────┘
```

**Request flow for a `/score` call:**
1. Frontend sends a transaction (with a JWT from Supabase Auth) to the FastAPI backend.
2. Backend verifies the token, feeds the transaction through `engineer_features()` to build the model's feature set.
3. The four base models each produce a probability; the meta-learner combines them into a final score.
4. The score is checked against the cost-tuned thresholds to assign a band (approve/escalate/block).
5. The Isolation Forest independently checks the same features for anomalous (out-of-distribution) patterns.
6. SHAP computes the top contributing features for that specific transaction and assembles a plain-English explanation.
7. The full result is written to Postgres (`decisions` table) and returned to the frontend.

---

## Tech stack

| Layer | Tools |
|---|---|
| ML / pipeline | scikit-learn, XGBoost, LightGBM, imbalanced-learn, SHAP |
| Backend API | FastAPI + Uvicorn (Python) |
| Auth + DB | Supabase (Postgres + Auth) |
| Frontend | React + Vite + Tailwind-style inline styling + Recharts |
| Localization | react-i18next (English, Hindi, Tamil) |
| Hosting | Vercel (frontend) + Render (backend), both free tier |

---

## Repository structure

```
quorum/
├── data/           synthetic transaction data, train/val/test splits, holdout unseen-pattern set
├── features/       feature engineering (engineer_features), category statistics
├── models/         trained model artifacts, pipeline.py (predict + record_feedback), explain.py
├── api/            FastAPI app, Supabase client, auth-protected endpoints
├── app/            React frontend (Vite)
└── notes/          daily build logs
```

---

## Running it locally

### Backend

```bash
cd quorum
python -m venv venv313
.\venv313\Scripts\Activate.ps1      # Windows
pip install -r requirements.txt
python -m uvicorn api.main:app --port 8000
```

You'll need a `.env` file inside `api/` with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Frontend

```bash
cd app
npm install
npm run dev
```

You'll need a `.env.local` file inside `app/` with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The frontend expects the backend at `https://quorum-j7zr.onrender.com` by default (see `app/src/api.js`); point it at `http://localhost:8000` if running both locally.

---

## API endpoints

| Endpoint | Method | Auth required | Description |
|---|---|---|---|
| `/` | GET | No | Health check |
| `/auth/signup` | POST | No | Create an account |
| `/auth/login` | POST | No | Log in, returns a JWT |
| `/score` | POST | Yes | Score a transaction, returns score/band/explanation |
| `/transactions` | GET | Yes | List past decisions, filterable by band |
| `/stats` | GET | No | Test-set metrics, cost model, decision config |
| `/feedback` | POST | Yes | Confirm an escalated transaction's true label (feeds the retrain queue) |

---

## Known limitations / honest scope notes

- The model scores **behavioral/transactional signals** (device change, IP change, velocity, amount patterns) — it does not attempt identity verification, biometrics, or merchant-side QR/domain validation, which would require different data entirely.
- The reliability diagram shows a noisy middle band (predicted probability 0.55–0.66) where actual fraud rate dips below prediction — this is due to small per-bin sample counts (6–7 transactions) in that range, not a systematic calibration failure at the extremes.
- Multilingual support currently covers UI labels and per-transaction explanation templates; it does not yet auto-translate free-text fields.