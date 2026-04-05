# 🔐 Session 401 Error - Authentication Fix

## Error: "Failed to start session: Could not validate credentials"

**HTTP Status**: 401 Unauthorized  
**Cause**: You are not signed in or your token has expired

---

## ✅ Quick Fix (30 seconds)

### Step 1: Sign In
1. Navigate to: **http://localhost:3000/auth**
2. Use these credentials:
   - **Email**: `demo@neurorestore.ai`
   - **Password**: `Demo@1234`
3. Click "Sign In"

### Step 2: Go to Session
1. Navigate to: **http://localhost:3000/session**
2. Click "Start Session"
3. ✅ Should work now!

---

## 🔍 Why This Happens

The session creation requires authentication:
```
Browser → POST /sessions → Backend
                ↓
         Checks JWT token
                ↓
         No token? → 401 Unauthorized
```

---

## 🛠️ Alternative Solutions

### Solution 1: Clear Storage & Re-login
```javascript
// Open browser console (F12)
localStorage.clear()
// Then sign in again at http://localhost:3000/auth
```

### Solution 2: Check Token
```javascript
// Open browser console (F12)
console.log(localStorage.getItem('nr_token'))
// Should show a JWT token, not null
```

### Solution 3: Use Different Account
If demo account doesn't work, create a new account:
1. Go to http://localhost:3000/auth
2. Click "Register" or "Sign Up"
3. Create new account
4. Sign in
5. Try session again

---

## 📋 Demo Accounts Available

### Patient Accounts
1. **Alex Johnson**
   - Email: `demo@neurorestore.ai`
   - Password: `Demo@1234`

2. **Maria Garcia**
   - Email: `demo2@neurorestore.ai`
   - Password: `Demo@1234`

3. **James Wilson**
   - Email: `demo3@neurorestore.ai`
   - Password: `Demo@1234`

### Clinician Account
- **Dr. Sarah Chen**
  - Email: `doctor@neurorestore.ai`
  - Password: `Doctor@1234`

---

## 🔧 Verify Authentication

### Check if Signed In
```javascript
// Browser console (F12)
const token = localStorage.getItem('nr_token');
const user = localStorage.getItem('nr_user');

console.log('Token:', token ? 'Present' : 'Missing');
console.log('User:', user ? JSON.parse(user).full_name : 'Not signed in');
```

### Test Token Validity
```bash
# Get your token from browser console
TOKEN="your_token_here"

# Test if token is valid
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me
```

**Expected**: Your user info  
**If fails**: Token expired → Sign in again

---

## 🚨 Common Authentication Issues

### Issue 1: Token Expired
**Symptom**: 401 error after being signed in for a while  
**Cause**: JWT tokens expire after 8 hours (default)  
**Solution**: Sign out and sign in again

### Issue 2: Token Not Saved
**Symptom**: 401 error immediately after sign in  
**Cause**: localStorage not working or blocked  
**Solution**: 
- Check browser privacy settings
- Disable "Block third-party cookies"
- Try incognito/private mode

### Issue 3: Wrong Credentials
**Symptom**: "Invalid credentials" on login  
**Cause**: Wrong email or password  
**Solution**: 
- Use correct demo credentials (see above)
- Or create new account

### Issue 4: Backend Not Running
**Symptom**: Network error or timeout  
**Cause**: Backend server is down  
**Solution**: 
```bash
cd backend && ./restart.sh
```

---

## 🎯 Step-by-Step Authentication Flow

### 1. Sign In
```
User enters credentials
       ↓
POST /auth/login
       ↓
Backend validates
       ↓
Returns JWT token
       ↓
Frontend saves to localStorage
```

### 2. Create Session
```
User clicks "Start Session"
       ↓
Frontend reads token from localStorage
       ↓
POST /sessions with Authorization header
       ↓
Backend validates token
       ↓
Creates session
       ↓
Returns session ID
```

### 3. Where It Fails
```
❌ No token in localStorage → 401
❌ Invalid token → 401
❌ Expired token → 401
❌ Wrong format → 401
```

---

## 🔐 Security Notes

### Token Storage
- Tokens are stored in browser `localStorage`
- Key: `nr_token`
- Format: JWT (JSON Web Token)
- Expiry: 8 hours (configurable in backend/.env)

### Token Format
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Token Contents
```json
{
  "sub": "user_id",
  "email": "demo@neurorestore.ai",
  "role": "patient",
  "exp": 1234567890
}
```

---

## 🧪 Testing Authentication

### Test 1: Login Works
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@neurorestore.ai","password":"Demo@1234"}'
```

**Expected**: JSON with `access_token`

### Test 2: Token Valid
```bash
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/auth/me
```

**Expected**: User info

### Test 3: Session Creation
```bash
TOKEN="your_token_here"
curl -X POST http://localhost:8000/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_type":"physical"}'
```

**Expected**: Session object with ID

---

## 🔄 Complete Reset (If Nothing Works)

```bash
# 1. Clear browser data
# Open browser → F12 → Application → Storage → Clear site data

# 2. Restart backend
cd backend
./restart.sh

# 3. Restart frontend
cd frontend
npm run dev

# 4. Sign in fresh
# Navigate to http://localhost:3000/auth
# Use demo@neurorestore.ai / Demo@1234

# 5. Try session
# Navigate to http://localhost:3000/session
# Click "Start Session"
```

---

## 📊 Diagnostic Commands

### Check Everything
```bash
./diagnose-session.sh
```

### Check Auth Only
```bash
# Test login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@neurorestore.ai","password":"Demo@1234"}'
```

### Check Token in Browser
```javascript
// Browser console (F12)
localStorage.getItem('nr_token')
```

---

## ✅ Success Checklist

After signing in, verify:
- [ ] Token exists: `localStorage.getItem('nr_token')` returns a string
- [ ] User exists: `localStorage.getItem('nr_user')` returns JSON
- [ ] No 401 errors in console
- [ ] Can navigate to /session
- [ ] Can click "Start Session"
- [ ] Session starts successfully

---

## 🎉 Quick Summary

**Problem**: 401 Unauthorized  
**Cause**: Not signed in  
**Solution**: Sign in at http://localhost:3000/auth  
**Credentials**: demo@neurorestore.ai / Demo@1234  
**Time to Fix**: 30 seconds  

---

**Last Updated**: 2024-01-15  
**Status**: ✅ Solution Verified  
**Difficulty**: Easy ⭐
