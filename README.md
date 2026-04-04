# NeuroRestore AI — Nakshatra Hackathon 2026

AI-Powered Dual Rehabilitation System | Healthcare Track

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

## Demo Credentials
- Patient: `demo@neurorestore.ai` / `Demo@1234`
- Clinician: `doctor@neurorestore.ai` / `Doctor@1234`

## Docker
```bash
docker compose up --build
```

## API Docs
http://localhost:8000/docs
