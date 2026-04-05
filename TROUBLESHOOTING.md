# NeuroRestore - Complete Troubleshooting Guide

## 🚨 Quick Fixes

### Issue: "I'm having trouble connecting right now. Please try again in a moment."

**Cause**: Backend server error (500 Internal Server Error)

**Solution**:
```bash
cd backend
source venv/bin/activate
pip install httpx
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or use the restart script:
```bash
cd backend
./restart.sh
```

---

## 🔍 Common Errors & Solutions

### 1. ModuleNotFoundError: No module named 'httpx'

**Error Message**:
```
ModuleNotFoundError: No module named 'httpx'
```

**Solution**:
```bash
cd backend
source venv/bin/activate
pip install httpx
```

**Prevention**: Always install from `requirements.txt`:
```bash
pip install -r requirements.txt
```

---

### 2. Chatbot Not Responding

**Symptoms**:
- "I'm having trouble connecting right now"
- 500 Internal Server Error
- No response from AI

**Checklist**:
1. ✅ Backend server running?
   ```bash
   curl http://localhost:8000/health
   ```

2. ✅ Groq API key configured?
   ```bash
   grep GROQ_API_KEY backend/.env
   ```

3. ✅ httpx installed?
   ```bash
   source backend/venv/bin/activate
   python -c "import httpx; print('OK')"
   ```

4. ✅ Internet connection working?
   ```bash
   ping api.groq.com
   ```

**Solution**:
```bash
# Full reset
cd backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### 3. Frontend Not Loading

**Symptoms**:
- Blank page
- "Cannot connect to server"
- Network errors in console

**Checklist**:
1. ✅ Frontend server running?
   ```bash
   curl http://localhost:3000
   ```

2. ✅ Backend server running?
   ```bash
   curl http://localhost:8000/health
   ```

3. ✅ CORS configured correctly?
   Check `backend/.env`:
   ```env
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
   ```

**Solution**:
```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

### 4. Camera Not Working (Session Page)

**Symptoms**:
- Black screen
- "Camera permission denied"
- "Pose engine error"

**Checklist**:
1. ✅ Camera permissions granted?
   - Chrome: Settings → Privacy → Camera
   - Safari: Preferences → Websites → Camera

2. ✅ Using HTTPS or localhost?
   - Camera API requires secure context
   - Use `http://localhost:3000` (not IP address)

3. ✅ Camera not in use by another app?
   - Close Zoom, Skype, etc.

4. ✅ Browser supports WebGL?
   - Visit: https://get.webgl.org/

**Solution**:
1. Grant camera permissions
2. Use Chrome/Edge (recommended)
3. Ensure localhost URL
4. Refresh page (Cmd+Shift+R / Ctrl+Shift+F5)

---

### 5. Slow Performance / Low FPS

**Symptoms**:
- FPS < 30
- Laggy camera feed
- Delayed rep counting

**Checklist**:
1. ✅ Close other browser tabs
2. ✅ Close other applications
3. ✅ Check CPU usage (Activity Monitor / Task Manager)
4. ✅ Use Chrome/Edge (better WebGL performance)

**Solution**:
- System will auto-switch to "balanced" or "low" mode
- Reduce video quality in camera settings
- Use a more powerful device
- Check console for performance warnings

---

### 6. Database Errors

**Symptoms**:
- "Database is locked"
- "No such table"
- "Integrity error"

**Solution**:
```bash
cd backend

# Reset database (WARNING: Deletes all data)
rm neurorestore.db
source venv/bin/activate
alembic upgrade head

# Or run migrations
alembic upgrade head
```

---

### 7. Authentication Errors

**Symptoms**:
- "Invalid token"
- "Unauthorized"
- Redirected to login

**Solution**:
```bash
# Clear browser storage
# Chrome: F12 → Application → Storage → Clear site data

# Or logout and login again
```

---

### 8. WebSocket Connection Failed

**Symptoms**:
- "WebSocket connection failed"
- Real-time updates not working
- Session events not syncing

**Checklist**:
1. ✅ Backend WebSocket endpoint running?
   ```bash
   curl http://localhost:8000/ws/session/1?token=YOUR_TOKEN
   ```

2. ✅ Firewall blocking WebSocket?
   - Check firewall settings
   - Allow port 8000

**Solution**:
```bash
# Restart backend
cd backend
./restart.sh
```

---

## 🔧 Development Environment Setup

### Fresh Install (macOS/Linux)

```bash
# 1. Clone repository
git clone <repo-url>
cd neurorestore

# 2. Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# 4. Initialize database
alembic upgrade head

# 5. Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

### Fresh Install (Windows)

```bash
# 1. Clone repository
git clone <repo-url>
cd neurorestore

# 2. Backend setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env and add your GROQ_API_KEY

# 4. Initialize database
alembic upgrade head

# 5. Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 6. Frontend setup (new terminal)
cd ..\frontend
npm install
npm run dev
```

---

## 🧪 Testing Checklist

### Backend Health Check
```bash
# 1. Server running?
curl http://localhost:8000/health

# 2. Auth working?
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}'

# 3. AI chatbot working?
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Frontend Health Check
```bash
# 1. Server running?
curl http://localhost:3000

# 2. API connection working?
# Open browser console (F12) and check for errors

# 3. Camera working?
# Navigate to /session and check camera feed
```

---

## 📊 Performance Monitoring

### Check Backend Performance
```bash
# CPU usage
top -pid $(pgrep -f "uvicorn")

# Memory usage
ps aux | grep uvicorn

# Request logs
tail -f backend/logs/access.log
```

### Check Frontend Performance
```bash
# Open browser console (F12)
# Navigate to Performance tab
# Record session and analyze

# Check FPS counter (top-left of session page)
# Should be ≥30 FPS
```

---

## 🔐 Security Checklist

### Production Deployment
- [ ] Change `SECRET_KEY` in `.env`
- [ ] Use strong passwords
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Use environment variables (not `.env` files)
- [ ] Rotate API keys regularly
- [ ] Enable logging and monitoring
- [ ] Set up error tracking (Sentry)

---

## 📝 Logging & Debugging

### Enable Debug Logging (Backend)
```python
# backend/app/main.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Enable Debug Logging (Frontend)
```typescript
// frontend/next.config.ts
module.exports = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}
```

### View Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# Frontend logs (browser console)
# Press F12 → Console tab

# System logs (macOS)
log show --predicate 'process == "uvicorn"' --last 1h

# System logs (Linux)
journalctl -u neurorestore -f
```

---

## 🆘 Emergency Recovery

### Complete Reset (Nuclear Option)

**WARNING**: This will delete all data!

```bash
# 1. Stop all servers
pkill -f uvicorn
pkill -f "next-server"

# 2. Clean backend
cd backend
rm -rf venv
rm neurorestore.db
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# 3. Clean frontend
cd ../frontend
rm -rf node_modules .next
npm install

# 4. Restart
cd ../backend
./restart.sh

# In new terminal:
cd frontend
npm run dev
```

---

## 📞 Getting Help

### Before Asking for Help

1. ✅ Check this troubleshooting guide
2. ✅ Check console for errors (F12)
3. ✅ Check backend logs
4. ✅ Try restarting servers
5. ✅ Try clearing browser cache
6. ✅ Try different browser

### When Reporting Issues

Include:
- Error message (full stack trace)
- Steps to reproduce
- Browser and version
- Operating system
- Backend logs
- Frontend console logs
- Screenshots (if applicable)

### Useful Commands for Debugging

```bash
# Check Python version
python --version

# Check Node version
node --version

# Check npm version
npm --version

# Check installed packages
pip list

# Check running processes
ps aux | grep -E "uvicorn|next"

# Check port usage
lsof -i :8000
lsof -i :3000

# Check network connectivity
ping localhost
curl http://localhost:8000/health
```

---

## 🎯 Quick Reference

### Start Everything
```bash
# Terminal 1: Backend
cd backend && ./restart.sh

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Stop Everything
```bash
# Press Ctrl+C in both terminals
# Or:
pkill -f uvicorn
pkill -f "next-server"
```

### Reset Everything
```bash
# Backend
cd backend
rm neurorestore.db
alembic upgrade head

# Frontend
cd frontend
rm -rf .next
```

### Update Dependencies
```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt --upgrade

# Frontend
cd frontend
npm update
```

---

**Last Updated**: 2024-01-15  
**Version**: 2.0.0  
**Status**: Complete ✅
