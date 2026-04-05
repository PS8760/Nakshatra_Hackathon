# 🔐 How to Sign In - Visual Guide

## Step-by-Step Instructions

### Step 1: Go to Sign In Page
```
Open your browser and navigate to:
http://localhost:3000/auth
```

### Step 2: Click "Patient demo" Button
```
┌─────────────────────────────────────┐
│  NeuroRestore AI                    │
│                                     │
│  Welcome back.                      │
│  Sign in to continue your recovery  │
│                                     │
│  ┌──────────┬──────────┐           │
│  │ Sign in  │ Sign up  │           │
│  └──────────┴──────────┘           │
│                                     │
│  [Continue with Google]             │
│                                     │
│  ─────────── OR ───────────         │
│                                     │
│  Email address                      │
│  [                    ]             │
│                                     │
│  Password                           │
│  [                    ]             │
│                                     │
│  [      Sign in →      ]            │
│                                     │
│  ─────────────────────────          │
│  DEMO CREDENTIALS                   │
│  ┌──────────┬──────────┐           │
│  │ Patient  │Clinician │  ← CLICK  │
│  │  demo    │  demo    │    THIS!  │
│  └──────────┴──────────┘           │
└─────────────────────────────────────┘
```

### Step 3: Credentials Auto-Fill
```
After clicking "Patient demo", the form will auto-fill:

Email:    demo@neurorestore.ai
Password: Demo@1234
```

### Step 4: Click "Sign in →"
```
The big green button at the bottom of the form
```

### Step 5: You're In!
```
You'll be redirected to the dashboard
Now you can go to the session page:
http://localhost:3000/session
```

---

## 🎯 Quick Copy-Paste

If you prefer to type manually:

**Email:**
```
demo@neurorestore.ai
```

**Password:**
```
Demo@1234
```

---

## ⚠️ Common Mistakes

### ❌ Wrong Email
```
demo@example.com          ← WRONG
demo@neurorestore.com     ← WRONG
demo@neurorestore.ai      ← CORRECT ✓
```

### ❌ Wrong Password
```
demo123                   ← WRONG
Demo123                   ← WRONG
Demo@1234                 ← CORRECT ✓
```

### ❌ Case Sensitivity
```
demo@1234                 ← WRONG (lowercase d)
DEMO@1234                 ← WRONG (all caps)
Demo@1234                 ← CORRECT ✓ (capital D)
```

---

## 🔄 If You Get "Invalid Credentials"

1. **Check the email**: Must be `demo@neurorestore.ai`
2. **Check the password**: Must be `Demo@1234` (capital D)
3. **Try the demo button**: Click "Patient demo" to auto-fill
4. **Clear and retry**: Clear both fields and try again

---

## 🆘 Still Can't Sign In?

### Option 1: Use Demo Button
The easiest way! Just click "Patient demo" button.

### Option 2: Create New Account
1. Click "Sign up" tab
2. Enter your own email and password
3. Create account
4. Sign in with your new credentials

### Option 3: Check Backend
```bash
# Make sure backend is running
curl http://localhost:8000/health

# Should return: {"status":"ok",...}
```

### Option 4: Recreate Demo Users
```bash
cd backend
python scripts/seed_demo.py
```

---

## ✅ Success Indicators

After signing in, you should see:

1. **Redirected to Dashboard**
   - URL changes to `/dashboard`
   - You see your name in top-right corner

2. **Token Saved**
   ```javascript
   // Open browser console (F12)
   localStorage.getItem('nr_token')
   // Should return a long string (JWT token)
   ```

3. **Can Access Session**
   - Navigate to `/session`
   - No "Please sign in" message
   - Can click "Start Session"

---

## 🎉 You're Ready!

Once signed in:
1. Go to http://localhost:3000/session
2. Click "Start Session"
3. Grant camera permissions
4. Start exercising!

---

**Need more help?** See `SESSION_401_FIX.md` or `FINAL_FIX_SUMMARY.md`
