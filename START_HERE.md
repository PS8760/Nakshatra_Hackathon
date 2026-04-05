# 🚀 START HERE - NeuroRestore Quick Start

## ⚡ 3-Minute Setup

### 1. Sign In (30 seconds)
```
Navigate to: http://localhost:3000/auth

Credentials:
  Email:    demo@neurorestore.ai
  Password: Demo@1234

Click: "Sign In"
```

### 2. Start Session (30 seconds)
```
Navigate to: http://localhost:3000/session

Click: "Start Session"

Grant camera permissions when prompted
```

### 3. Exercise! (2 minutes)
```
Stand 1.5-2m from camera
Full body visible in frame
Follow the 3D guide
Watch your form score
Listen to voice coaching
```

---

## ✅ That's It!

You're now using:
- ✅ AI-powered pose detection (95%+ accuracy)
- ✅ Real-time form feedback
- ✅ 3D animated physiotherapist guide
- ✅ Voice coaching
- ✅ Automatic rep counting
- ✅ Form scoring (0-100)

---

## 🆘 Having Issues?

### Issue: "Failed to start session"
**Fix**: Make sure you're signed in!
1. Go to http://localhost:3000/auth
2. Sign in with `demo@neurorestore.ai` / `Demo@1234`
3. Try again

### Issue: "Backend not running"
**Fix**: Start the backend
```bash
cd backend && ./restart.sh
```

### Issue: "Camera not working"
**Fix**: Grant camera permissions
- Chrome: Settings → Privacy → Camera
- Allow for localhost:3000

---

## 📚 More Help

- **Quick fixes**: `FINAL_FIX_SUMMARY.md`
- **Authentication**: `SESSION_401_FIX.md`
- **Troubleshooting**: `SESSION_TROUBLESHOOTING.md`
- **Check status**: Run `./check-status.sh`

---

## 🎯 Demo Credentials

**Patient Accounts**:
- `demo@neurorestore.ai` / `Demo@1234` ⭐ (Use this one)
- `demo2@neurorestore.ai` / `Demo@1234`
- `demo3@neurorestore.ai` / `Demo@1234`

**Clinician Account**:
- `doctor@neurorestore.ai` / `Doctor@1234`

---

## 🎉 Features to Try

### 1. Session Feature (Main Feature)
- Real-time pose detection
- Form feedback
- Rep counting
- Voice coaching
- 3D guide

### 2. Dashboard
- View progress over time
- See recovery scores
- Track improvements

### 3. AI Chatbot
- Ask rehabilitation questions
- Get personalized advice
- Professional guidance

### 4. Cognitive Tests
- Memory tests
- Attention tests
- Pattern recognition
- Reaction time

---

## 🔧 System Check

Run this to verify everything:
```bash
./check-status.sh
```

Should show:
```
✅ All systems operational!
```

---

**Ready to start? Go to http://localhost:3000/auth and sign in!**

---

**Last Updated**: 2024-01-15  
**Difficulty**: Easy ⭐  
**Time**: 3 minutes
