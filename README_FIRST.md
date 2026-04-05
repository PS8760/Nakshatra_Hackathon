# ⚠️ READ THIS FIRST - You're Getting 401 Errors

## 🔴 The Problem

You're seeing this error:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
Session creation error: AxiosError: Request failed with status code 401
```

## ✅ The Solution (30 seconds)

**You need to sign in first!**

### Quick Steps:

1. **Open**: http://localhost:3000/auth

2. **Click**: The "Patient demo" button (bottom of the form)

3. **Click**: The green "Sign in →" button

4. **Done!** Now go to http://localhost:3000/session

---

## 📺 Visual Guide

```
Step 1: Go to http://localhost:3000/auth
        ↓
Step 2: Look for "DEMO CREDENTIALS" section at bottom
        ↓
Step 3: Click "Patient demo" button
        ↓
        Form auto-fills with:
        Email: demo@neurorestore.ai
        Password: Demo@1234
        ↓
Step 4: Click green "Sign in →" button
        ↓
Step 5: You're redirected to dashboard
        ↓
Step 6: Go to http://localhost:3000/session
        ↓
Step 7: Click "Start Session"
        ↓
        ✅ IT WORKS!
```

---

## 🎯 Why This Happens

The session feature requires authentication:

```
You → Click "Start Session"
      ↓
Frontend → Checks for token in localStorage
      ↓
No token found? → 401 Unauthorized Error
      ↓
You see: "Failed to start session"
```

**Solution**: Sign in first to get a token!

---

## 🔐 Demo Credentials

**Email**: `demo@neurorestore.ai`  
**Password**: `Demo@1234`

⚠️ **Important**: 
- NOT `demo@example.com`
- NOT `demo123`
- Use the exact credentials above!

---

## 🚀 Complete Walkthrough

### 1. Open Sign In Page
```
http://localhost:3000/auth
```

### 2. Use Demo Button (Easiest!)
- Scroll to bottom of form
- See "DEMO CREDENTIALS" section
- Click "Patient demo" button
- Credentials auto-fill
- Click "Sign in →"

### 3. Or Type Manually
```
Email:    demo@neurorestore.ai
Password: Demo@1234
```
Then click "Sign in →"

### 4. Verify You're Signed In
After signing in, you should:
- Be redirected to `/dashboard`
- See your name in top-right corner
- See "Demo User" or "Alex Johnson"

### 5. Go to Session Page
```
http://localhost:3000/session
```

### 6. Start Session
- Click "Start Session" button
- Grant camera permissions
- ✅ It works!

---

## 🔍 How to Check If You're Signed In

### Method 1: Check URL
After signing in, URL should be:
```
http://localhost:3000/dashboard
```
NOT still on `/auth`

### Method 2: Check Browser Console
1. Press F12 (open developer tools)
2. Go to Console tab
3. Type:
```javascript
localStorage.getItem('nr_token')
```
4. Press Enter
5. Should show a long string (JWT token)
6. If it shows `null`, you're NOT signed in

### Method 3: Check Top-Right Corner
Look for your name/avatar in the top-right corner of the page.

---

## ❌ Common Mistakes

### Mistake 1: Wrong Credentials
```
❌ demo@example.com / demo123
✅ demo@neurorestore.ai / Demo@1234
```

### Mistake 2: Not Signing In
```
❌ Going directly to /session without signing in
✅ Sign in at /auth FIRST, then go to /session
```

### Mistake 3: Token Expired
```
If you signed in hours ago, token may have expired.
Solution: Sign out and sign in again.
```

### Mistake 4: Cleared Browser Data
```
If you cleared cookies/localStorage, you need to sign in again.
```

---

## 🆘 Troubleshooting

### Issue: "Invalid credentials"
**Solution**: Use the demo button or check spelling:
- Email: `demo@neurorestore.ai` (not .com)
- Password: `Demo@1234` (capital D)

### Issue: Demo button doesn't work
**Solution**: Type credentials manually and click "Sign in →"

### Issue: Still getting 401 after signing in
**Solution**: 
1. Open browser console (F12)
2. Type: `localStorage.clear()`
3. Refresh page
4. Sign in again

### Issue: Backend not responding
**Solution**:
```bash
cd backend && ./restart.sh
```

---

## ✅ Success Checklist

After following these steps, verify:

- [ ] Went to http://localhost:3000/auth
- [ ] Clicked "Patient demo" button OR typed credentials
- [ ] Clicked "Sign in →" button
- [ ] Redirected to `/dashboard`
- [ ] Can see name in top-right corner
- [ ] `localStorage.getItem('nr_token')` returns a string
- [ ] Can go to `/session` without "Please sign in" message
- [ ] Can click "Start Session" without 401 error

---

## 🎉 You're Done!

Once all checkboxes above are ✅, you can:
1. Go to http://localhost:3000/session
2. Click "Start Session"
3. Grant camera permissions
4. Start your rehabilitation session!

---

## 📚 More Help

- **Visual sign-in guide**: `HOW_TO_SIGN_IN.md`
- **401 error details**: `SESSION_401_FIX.md`
- **Complete troubleshooting**: `SESSION_TROUBLESHOOTING.md`
- **All fixes**: `FINAL_FIX_SUMMARY.md`

---

## 🔧 Quick Commands

### Check if backend is running:
```bash
curl http://localhost:8000/health
```

### Check if you're signed in:
```javascript
// Browser console (F12)
localStorage.getItem('nr_token')
```

### Restart backend:
```bash
cd backend && ./restart.sh
```

### Check system status:
```bash
./check-status.sh
```

---

**TL;DR**: Go to http://localhost:3000/auth, click "Patient demo", click "Sign in →", then try the session again!

---

**Last Updated**: 2024-01-15  
**Status**: ✅ Solution Verified  
**Time to Fix**: 30 seconds
