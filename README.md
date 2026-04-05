# NeuroRestore AI

**AI-Powered Dual Rehabilitation System** — Nakshatra Hackathon 2026 · Healthcare Track

---

## What It Does

NeuroRestore AI is a clinical-grade web application that combines real-time pose estimation, joint angle tracking, cognitive rehabilitation, and AI-driven recovery analytics into a single platform for patients and physiotherapists.

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

Open **http://localhost:3000**

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
GROQ_API_KEY=your-groq-api-key
```

### `frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000
BACKEND_URL=http://localhost:8000
```

---

## Features

### Physical Rehabilitation
- **BlazePose Heavy** (33 keypoints, 3D) running in-browser via TensorFlow.js at 18–30 FPS
- **DWPose Wholebody** (133 keypoints) — detects every joint including fingers, face, feet via ONNX
- Real-time joint angle calculation using dot-product trigonometry
- Exercise classifier: squat, lunge, knee extension, shoulder press, bicep curl, hip abduction
- Per-exercise fault detection with coaching cues (knee cave, forward lean, elbow drift, etc.)
- Rep counting with phase detection (descending → bottom → ascending)
- Form score 0–100 calibrated against physiotherapist dataset
- Voice feedback via Web Speech API

### Progressive Exercise System
- 4 progression chains (knee, elbow, shoulder, hip) with 4–5 levels each
- Each level has easier regressions and harder progressions (e.g. can't do pull-ups → dead hang → assisted)
- Robot 3D avatar demonstrates the exercise before the session starts
- Progress bar toward next level unlock based on actual achieved ROM

### Session Flow
1. Select exercise focus (Full Body / Knee / Shoulder / Hip)
2. Click **Start Session** — robot demonstrates the exercise for ~16 seconds
3. Camera activates automatically — AI tracks your form in real time
4. Reps counted, angles logged, feedback spoken aloud
5. End session → scores saved → dashboard graph updates

### Joint Recovery Tracking
- Joint angle logged per rep to SQLite/PostgreSQL
- Line chart on dashboard: achieved angle vs target ROM per session
- Gold star on personal best session
- 3 summary cards: Today's Best / Yesterday's Best / Total Gain
- Auto-refreshes after every session ends

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

### Recovery Analytics
- Composite recovery score: 60% physical + 40% cognitive
- Adaptive difficulty: auto-increments target ROM by 5° after 3 strong sessions
- Daily aggregate scores with trend chart
- Weekly report with week-over-week comparison

### Real-Time WebSocket
- Live rep events from browser → backend in < 50ms
- Feedback: `good` / `warning` / `out_of_range` / `low_visibility`
- Pain event logging mid-session

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, TailwindCSS |
| Pose (browser) | TensorFlow.js, BlazePose Heavy |
| Pose (server) | DWPose 133-kp, RTMO-s via ONNX Runtime |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose), bcrypt |
| AI | Groq API (llama-3.1-8b-instant) |
| Charts | Chart.js, Recharts |
| 3D Avatar | Three.js, React Three Fiber |
| PDF | jsPDF |

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
| GET | `/exercises/plan/{joint}` | Personalised exercise level + variations |
| GET | `/exercises/library/{joint}` | Full progression chain |
| POST | `/pose/analyze` | Analyze JPEG frame (mediapipe / rtmpose / wholebody) |
| POST | `/referral/nearby-physios` | Nearest physios by Haversine distance |
| WS | `/ws/session/{id}` | Live rep events + feedback |
| GET | `/docs` | Interactive Swagger UI |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + router registration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── auth.py              # JWT auth
│   │   ├── ws_handler.py        # WebSocket session handler
│   │   ├── scoring.py           # Recovery score algorithm
│   │   ├── joint_processor.py   # MediaPipe angle calculation
│   │   ├── exercise_library.py  # Progressive exercise chains
│   │   ├── wholebody_engine.py  # DWPose 133-kp ONNX engine
│   │   ├── rtmpose_engine.py    # RTMO-s ONNX engine
│   │   └── routers/             # auth, sessions, analytics, ai, exercises, referral, pose
│   ├── data/
│   │   ├── physios.json
│   │   ├── dwpose_wholebody.onnx
│   │   └── rtmpose_m.onnx
│   └── scripts/seed_demo.py
│
└── frontend/
    ├── app/                     # Next.js pages
    │   ├── dashboard/           # Main dashboard with live graph
    │   ├── session/             # Physical rehab session
    │   ├── cognitive-tests/     # 4 cognitive tests
    │   ├── reports/             # PDF report generation
    │   ├── history/             # Session history
    │   └── chatbot/             # AI physiotherapist
    ├── components/
    │   ├── session/
    │   │   ├── PoseCamera.tsx   # BlazePose inference loop
    │   │   ├── PhysioGuide.tsx  # 3D robot avatar + demo mode
    │   │   ├── ExercisePlan.tsx # Progressive exercise card
    │   │   └── ReferralCard.tsx # Location-based physio finder
    │   └── dashboard/
    │       ├── RecoveryChart.tsx
    │       └── JointAngleChart.tsx
    └── lib/
        ├── api.ts               # All API calls
        ├── postureEngine.ts     # Fault detection + rep counting
        └── poseEngine.ts        # Angle calculation utilities
```

---

## Docker

```bash
docker compose up --build
```

---

## Download ONNX Models (optional — for server-side pose)

```bash
# DWPose Wholebody (128MB)
python -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx', 'backend/data/dwpose_wholebody.onnx')"

# RTMO-s (37MB)
python -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/Xenova/RTMO-s/resolve/main/onnx/model.onnx', 'backend/data/rtmpose_m.onnx')"
```
