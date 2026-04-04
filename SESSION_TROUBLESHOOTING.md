# Session Feature - Troubleshooting Guide

## 🚨 "Failed to start session. Is the backend running?"

### Quick Diagnosis

Run this command to check everything:
```bash
./check-status.sh
```

---

## Common Causes & Solutions

### 1. Not Signed In ⚠️

**Symptom**: "Failed to start session" error

**Cause**: No authentication token in browser

**Solution**:
1. Navigate to http://localhost:3000/auth
2. Sign in with demo account:
   - Email: `demo@neurorestore.ai`
   - Password: `Demo@1234`
3. Return to http://localhost:3000/session
4. Try starting session again

**Verify**:
```javascript
// Open browser console (F12)
localStorage.getItem('nr_token')
// Should return a JWT token, not null
```

---

### 2. Backend Not Running ❌

**Symptom**: "Failed to start session" or network error

**Cause**: Backend server is not running

**Check**:
```bash
curl http://localhost:8000/health
```

**Solution**:
```bash
cd backend
./restart.sh
```

Or manually:
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### 3. Token Expired 🕐

**Symptom**: "Not authenticated" or "Invalid token"

**Cause**: JWT token has expired (default: 8 hours)

**Solution**:
1. Logout: http://localhost:3000/auth
2. Sign in again
3. Try starting session

**Or clear storage**:
```javascript
// Browser console (F12)
localStorage.clear()
// Then sign in again
```

---

### 4. CORS Error 🚫

**Symptom**: "CORS policy" error in browser console

**Cause**: Frontend URL not in allowed origins

**Check** `backend/.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Solution**:
1. Ensure your frontend URL is in `ALLOWED_ORIGINS`
2. Restart backend: `cd backend && ./restart.sh`

---

### 5. Database Error 💾

**Symptom**: "Database is locked" or "No such table"

**Check**:
```bash
ls -lh backend/neurorestore.db
```

**Solution**:
```bash
cd backend
source venv/bin/activate

# Run migrations
alembic upgrade head

# Or reset database (WARNING: Deletes all data)
rm neurorestore.db
alembic upgrade head
```

---

### 6. Port Conflict 🔌

**Symptom**: Backend won't start or "Address already in use"

**Check**:
```bash
lsof -i :8000
```

**Solution**:
```bash
# Kill process on port 8000
kill -9 $(lsof -t -i:8000)

# Restart backend
cd backend && ./restart.sh
```

---

## 🔍 Detailed Debugging

### Step 1: Check Backend Health
```bash
curl http://localhost:8000/health
```

**Expected**:
```json
{"status":"ok","db":"connected","version":"1.0.0"}
```

**If fails**: Backend is not running → See Solution #2

---

### Step 2: Check Authentication
```bash
# Get your token from browser console
TOKEN="your_token_here"

# Test auth endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me
```

**Expected**: Your user info

**If fails**: Token invalid → See Solution #3

---

### Step 3: Test Session Creation
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:8000/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_type":"physical"}'
```

**Expected**:
```json
{
  "id": 1,
  "user_id": 1,
  "session_type": "physical",
  "started_at": "2024-01-15T10:30:00",
  ...
}
```

**If fails**: Check error message for specific issue

---

### Step 4: Check Browser Console

1. Open browser console (F12)
2. Go to Console tab
3. Try starting session
4. Look for errors

**Common errors**:
- `401 Unauthorized` → Not signed in (Solution #1)
- `Network Error` → Backend not running (Solution #2)
- `CORS Error` → CORS misconfigured (Solution #4)
- `500 Internal Server Error` → Check backend logs

---

### Step 5: Check Backend Logs

Look at the terminal where backend is running for errors like:
- `ModuleNotFoundError` → Missing dependency
- `Database is locked` → Database issue (Solution #5)
- `Address already in use` → Port conflict (Solution #6)

---

## 🛠️ Complete Reset (Nuclear Option)

If nothing works, try a complete reset:

```bash
# 1. Stop everything
pkill -f uvicorn
pkill -f "next-server"

# 2. Clear browser data
# Open browser → F12 → Application → Storage → Clear site data

# 3. Reset backend
cd backend
rm neurorestore.db
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# 4. Restart backend
./restart.sh

# 5. Restart frontend (new terminal)
cd frontend
npm run dev

# 6. Sign in again
# Navigate to http://localhost:3000/auth
# Use demo@neurorestore.ai / Demo@1234

# 7. Try session
# Navigate to http://localhost:3000/session
```

---

## 📊 Verification Checklist

Before starting a session, verify:

- [ ] Backend running: `curl http://localhost:8000/health`
- [ ] Frontend running: `curl http://localhost:3000`
- [ ] Signed in: Check `localStorage.getItem('nr_token')` in console
- [ ] Token valid: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me`
- [ ] Database exists: `ls backend/neurorestore.db`
- [ ] No CORS errors in console
- [ ] Camera permissions granted

---

## 🎯 Quick Fixes by Error Message

### "Failed to start session. Is the backend running?"
→ Check backend: `curl http://localhost:8000/health`  
→ If fails: `cd backend && ./restart.sh`

### "Please sign in to start a session"
→ Go to http://localhost:3000/auth  
→ Sign in with demo@example.com / demo123

### "Not authenticated"
→ Token expired or invalid  
→ Sign out and sign in again

### "Network Error"
→ Backend not running  
→ `cd backend && ./restart.sh`

### "CORS policy"
→ Check `ALLOWED_ORIGINS` in backend/.env  
→ Restart backend

### "Database is locked"
→ Close other connections to database  
→ Or: `cd backend && alembic upgrade head`

---

## 🔐 Demo Account

If you don't have an account:

**Email**: `demo@neurorestore.ai`  
**Password**: `Demo@1234`

Or create a new account at http://localhost:3000/auth

---

## 📞 Still Not Working?

### Collect Debug Info

1. **Backend Status**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Frontend Console**:
   - Press F12
   - Copy all errors from Console tab

3. **Backend Logs**:
   - Copy errors from terminal where backend is running

4. **System Status**:
   ```bash
   ./check-status.sh
   ```

5. **Token Check**:
   ```javascript
   // Browser console
   console.log(localStorage.getItem('nr_token'))
   ```

### Report Issue

Include:
- Error message (exact text)
- Backend status output
- Frontend console errors
- Backend log errors
- System status output
- Steps to reproduce

---

## 🎓 Understanding the Session Flow

```
1. User clicks "Start Session"
   ↓
2. Frontend calls createSession() API
   ↓
3. API sends POST /sessions with JWT token
   ↓
4. Backend verifies token
   ↓
5. Backend creates session in database
   ↓
6. Backend returns session ID
   ↓
7. Frontend starts camera & pose detection
   ↓
8. Session active!
```

**Failure points**:
- Step 2: No token → Not signed in
- Step 3: Network error → Backend not running
- Step 4: Invalid token → Token expired
- Step 5: Database error → Database issue
- Step 7: Camera error → Permissions or browser issue

---

## 🚀 Prevention Tips

1. **Always sign in first** before going to session page
2. **Keep backend running** in a dedicated terminal
3. **Check status** before starting: `./check-status.sh`
4. **Use Chrome/Edge** for best compatibility
5. **Grant camera permissions** when prompted
6. **Use localhost** (not IP address) for camera access

---

## 📈 Performance Tips

Once session is working:

1. **Close other tabs** for better FPS
2. **Good lighting** improves accuracy
3. **Stand 1.5-2m from camera** for best tracking
4. **Full body visible** in frame
5. **Plain background** helps detection
6. **Fitted clothing** improves tracking

---

**Last Updated**: 2024-01-15  
**Version**: 2.0.0  
**Status**: Complete ✅
