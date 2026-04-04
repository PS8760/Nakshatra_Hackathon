# 🚀 Quick Fix Guide - Chatbot Error

## Problem
```
❌ "I'm having trouble connecting right now. Please try again in a moment."
❌ 500 Internal Server Error
❌ ModuleNotFoundError: No module named 'httpx'
```

## Solution (30 seconds)

### Step 1: Install Missing Library
```bash
cd backend
source venv/bin/activate
pip install httpx
```

### Step 2: Restart Backend
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 3: Test
Navigate to: **http://localhost:3000/chatbot**

## ✅ Done!

---

## Alternative: Use Restart Script

```bash
cd backend
./restart.sh
```

---

## Verify Fix

```bash
./check-status.sh
```

Should show:
```
✅ All systems operational!
```

---

## Still Not Working?

### Quick Checks:
1. Backend running? → `curl http://localhost:8000/health`
2. Frontend running? → `curl http://localhost:3000`
3. httpx installed? → `python -c "import httpx"`

### Full Reset:
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## Need More Help?

Read: `TROUBLESHOOTING.md`

---

**Time to Fix**: 30 seconds  
**Difficulty**: Easy ⭐  
**Status**: ✅ Fixed
