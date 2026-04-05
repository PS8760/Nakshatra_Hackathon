# NeuroRestore AI

**AI-Powered Dual Rehabilitation System** — Nakshatra Hackathon 2026 · Healthcare Track

A clinical-grade web application combining real-time pose estimation, joint angle tracking, cognitive rehabilitation, and AI-driven recovery analytics into a single platform.

---

## Features

### Physical Rehabilitation
- **BlazePose Heavy** (33 keypoints, 3D) running in-browser via TensorFlow.js WebGL — 18–30 FPS
- **DWPose Wholebody** (133 keypoints) — detects every joint including all finger joints, palm, face landmarks, and feet via ONNX Runtime
- **RTMPose / RTMO-s** — high-accuracy alternative pose engine via ONNX
- Real-time joint angle calculation using dot-product trigonometry
- Exercise classifier: squat, lunge, knee extension, shoulder press, bicep curl, hip abduction
- Per-exercise fault detection with coaching cues (knee cave, forward lean, elbow drift, etc.)
- Rep counting with phase detection (descending → bottom → ascending)
- Form score (0–100) calibrated against physiotherapist dataset
- Voice feedback via Web Speech API

### Joint Recovery Tracking
- Joint angle logged per rep to SQLite/PostgreSQL via SQLAlchemy
- `JointAngleChart` — Chart.js hybrid bar+line graph on the dashboard
  - Bars: max angle per session
  - Line: target ROM + mean angle
  - Gold star ⭐ on the best session
  - Auto-refreshes after every session ends
- 3 summary cards: Today's Best / Yesterday's Best / Total Gain
- `GET /analytics/joint-live-stats` — last 10 sessions, Chart.js-ready JSON
- `GET /analytics/joint-progress/{joint}` — full session history per joint

### Cognitive Rehabilitation
- 4 tests: Memory Recall, Reaction Time, Pattern Recognition, Attention & Focus
- Weighted composite cognitive score (MoCA/MMSE calibrated)
- Adaptive difficulty based on rolling 3-session average

### AI Features
- Groq-powered AI Physiotherapist chatbot
- Dashboard summary and session recommendations
- Weekly report insights with PDF export (jsPDF)
- Location-based referral — triggers when pain > 7 or posture critical
  - Haversine distance to nearest physiotherapists
  - `POST /referral/nearby-physios`

### Recovery Analytics
- Composite recovery score: 60% physical + 40% cognitive
- Adaptive difficulty: auto-increments target ROM by 5° after 3 consecutive strong sessions
- Daily aggregate scores with trend chart (Recharts)
- `GET /analytics/weekly-report` — 7-day aggregation with week-over-week comparison

### Real-Time WebSocket
- `WS /ws/session/{session_id}` — live rep events from browser → backend
- Feedback returned in < 50ms: `good` / `warning` / `out_of_range` / `low_visibility`
- Pain event logging mid-session

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS |
| Pose (browser) | TensorFlow.js, BlazePose Heavy, MediaPipe Holistic |
| Pose (server) | DWPose 133-kp, RTMO-s, RTMPose-m via ONNX Runtime |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose), bcrypt |
| AI | Groq API |
| Charts | Chart.js, Recharts |
| 3D Avatar | Three.js, React Three Fiber |
| PDF | jsPDF |
| Containerisation | Docker, Docker Compose |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 22+

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Seed Demo Data (run once)

```bash
cd backend
python scripts/seed_demo.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** — both services are proxied through the Next.js dev server.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Patient | `demo@neurorestore.ai` | `Demo@1234` |
| Patient 2 | `demo2@neurorestore.ai` | `Demo@1234` |
| Clinician | `doctor@neurorestore.ai` | `Doctor@1234` |

---

## Environment Variables

### `backend/.env`

```env
APP_ENV=development
SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
DATABASE_URL=sqlite:///./neurorestore.db
ALLOWED_ORIGINS=http://localhost:3000
ENABLE_DEMO_SEED=true
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

## Docker

```bash
docker compose up --build
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Current user |
| POST | `/sessions` | Start session |
| PATCH | `/sessions/{id}/end` | End session + compute scores |
| GET | `/sessions/{id}/detail` | Full session with joint stats |
| GET | `/analytics/dashboard` | Dashboard aggregates |
| GET | `/analytics/joint-live-stats` | Last 10 sessions for Chart.js |
| GET | `/analytics/joint-progress/{joint}` | Full joint history |
| GET | `/analytics/recovery-scores` | Daily recovery trend |
| POST | `/pose/analyze` | Analyze JPEG frame (mediapipe / rtmpose / wholebody) |
| POST | `/pose/debug-frame` | Frame diagnostics |
| POST | `/referral/nearby-physios` | Nearest physios by Haversine distance |
| GET | `/analytics/weekly-report` | 7-day summary with week comparison |
| WS | `/ws/session/{id}` | Live rep events + feedback |
| GET | `/docs` | Interactive Swagger UI |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + router registration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── auth.py              # JWT auth
│   │   ├── ws_handler.py        # WebSocket session handler
│   │   ├── scoring.py           # Recovery score algorithm
│   │   ├── joint_processor.py   # MediaPipe angle calculation
│   │   ├── wholebody_engine.py  # DWPose 133-kp ONNX engine
│   │   ├── rtmpose_engine.py    # RTMO-s / RTMPose ONNX engine
│   │   └── routers/
│   │       ├── analytics.py     # Recovery + joint stats
│   │       ├── sessions.py      # Session CRUD
│   │       ├── pose.py          # Frame analysis endpoint
│   │       ├── referral.py      # Location-based physio finder
│   │       ├── cognitive.py     # Cognitive test scoring
│   │       └── ai.py            # Groq AI endpoints
│   ├── data/
│   │   ├── physios.json         # Local physio database
│   │   ├── dwpose_wholebody.onnx
│   │   └── rtmpose_m.onnx
│   └── scripts/
│       └── seed_demo.py         # Demo data seeder
│
└── frontend/
    ├── app/                     # Next.js App Router pages
    │   ├── dashboard/           # Main dashboard with live graph
    │   ├── session/             # Physical rehab session
    │   ├── cognitive-tests/     # 4 cognitive tests
    │   ├── reports/             # PDF report generation
    │   ├── history/             # Session history
    │   └── chatbot/             # AI physiotherapist
    ├── components/
    │   ├── session/
    │   │   └── PoseCamera.tsx   # BlazePose inference loop
    │   └── dashboard/
    │       ├── RecoveryChart.tsx
    │       └── JointAngleChart.tsx  # Chart.js hybrid graph
    └── lib/
        ├── postureEngine.ts     # Fault detection + rep counting
        ├── poseEngine.ts        # Angle calculation utilities
        ├── wholeBodyEngine.ts   # 133-kp drawing + fetch
        └── frameDebug.ts        # Webcam stream diagnostics
```

---

## Pose Models

| Model | Keypoints | Input | Use |
|---|---|---|---|
| BlazePose Heavy (TF.js) | 33 | Browser webcam | Primary real-time tracking |
| DWPose Wholebody | 133 | 384×288 ONNX | All joints incl. fingers + face |
| RTMO-s | 17 | 640×640 ONNX | High-accuracy body joints |

Download models (place in `backend/data/`):

```bash
# DWPose Wholebody (128MB) — already included if seeded
python -c "import urllib.request; urllib.request.urlretrieve(
  'https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx',
  'backend/data/dwpose_wholebody.onnx')"

# RTMO-s (37MB)
python -c "import urllib.request; urllib.request.urlretrieve(
  'https://huggingface.co/Xenova/RTMO-s/resolve/main/onnx/model.onnx',
  'backend/data/rtmpose_m.onnx')"
```
