# NeuroRestore AI — Nakshatra Hackathon 2026

AI-Powered Dual Rehabilitation System | Healthcare Track

## 🔒 Zero Transmission Architecture

**NeuroRestore operates on a Zero Transmission Architecture** - all pose detection and video processing happens entirely client-side in your browser. Here's how it works:

### Privacy-First Design
- ✅ **100% Client-Side Processing**: MediaPipe Pose runs in your browser using WebGL/WASM
- ✅ **Zero Video Upload**: Your camera feed NEVER leaves your device
- ✅ **Metadata Only**: Only joint angles, rep counts, and scores are sent to the server
- ✅ **HIPAA-Ready**: No video storage = no PHI (Protected Health Information) concerns
- ✅ **Works Offline**: Pose detection works without internet (after initial page load)

### What Gets Transmitted
```json
{
  "joint_angles": { "knee_left": 124.5, "shoulder_right": 87.2 },
  "rep_count": 12,
  "form_score": 85.3,
  "timestamp": "2026-04-05T10:30:00Z"
}
```

### What NEVER Gets Transmitted
- ❌ Video frames
- ❌ Camera feed
- ❌ Raw pixel data
- ❌ Face images
- ❌ Any personally identifiable visual data

This architecture ensures maximum privacy while delivering real-time AI-powered rehabilitation guidance.

---

## Quick Start (Local Dev)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Seed Demo Data (run once)
```bash
cd backend
source venv/bin/activate
python scripts/seed_demo.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## 🎯 BlazePose Demo

Try the live BlazePose 33 keypoint detection demo:
```
http://localhost:3000/demo-pose
```

Features:
- Real-time skeleton tracking with 33 body landmarks
- 3D coordinates with depth information (x, y, z)
- Color-coded body parts: Yellow (face), Blue (arms), Pink (legs)
- Live FPS counter and keypoint detection stats
- Runs at 20-30 FPS with WebGL acceleration

## Demo Credentials
- Patient: `demo@neurorestore.ai` / `Demo@1234`
- Clinician: `doctor@neurorestore.ai` / `Doctor@1234`

## Docker
```bash
docker compose up --build
```

## API Docs
http://localhost:8000/docs
