# 🚀 Quick Test Guide - 3D AI Coach with Real-Time Form Correction

## ✅ Integration Status: COMPLETE

All components are connected and ready to test!

---

## 🎯 Quick Start (5 Minutes)

### 1. Start Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Open Browser
```
http://localhost:3000
```

### 4. Sign In
- Click "Patient demo" button, OR
- Email: `demo@neurorestore.ai`
- Password: `Demo@1234`

### 5. Start Session
- Click "Sessions" → "Physical Rehabilitation"
- Click "▶ Start Session"

### 6. Test Form Corrections
Stand 1-2m from camera and try these:

#### Test 1: Bicep Curl (Incorrect Form)
- Raise your arm but DON'T bend elbow fully
- **Expected:** 3D coach says "Bend your right elbow more! Aim for 45°"
- **Expression:** 😟 Concerned
- **Gesture:** 👈 Points at you

#### Test 2: Bicep Curl (Correct Form)
- Now bend elbow fully (45° angle)
- **Expected:** "Perfect form on your right arm!"
- **Expression:** 😊 Happy
- **Gesture:** 👍 Thumbs up

#### Test 3: Squat (Too Shallow)
- Do a shallow squat (knees barely bent)
- **Expected:** "Squat deeper! Bend your left knee to 90°"
- **Expression:** 😟 Concerned
- **Gesture:** 👈 Points

#### Test 4: Squat (Too Deep)
- Squat very deep (below 70°)
- **Expected:** "Don't go too deep! Risk of knee strain. Keep angle above 70°"
- **Expression:** 😤 Warning
- **Head:** Shakes
- **Gesture:** 👈 Points

#### Test 5: Squat (Perfect)
- Squat to 90° knee angle
- **Expected:** "Excellent squat depth on left leg!"
- **Expression:** 😊 Happy
- **Gesture:** 👍 Thumbs up

---

## 🎤 What You Should Hear

### Voice Corrections (Examples):

**Bicep Curls:**
- "Bend your right elbow more! Aim for 45°"
- "Straighten your left arm fully! Extend to 170°"
- "Perfect form on your right arm!"

**Squats:**
- "Squat deeper! Bend your left knee to 90°"
- "Stand up fully! Extend your right leg to 170°"
- "Don't go too deep! Risk of knee strain. Keep angle above 70°"
- "Excellent squat depth on left leg!"

**Rep Completions:**
- "First rep! Great start!"
- "Excellent! Rep 2 completed! Now extend back up"
- "5 reps! You're on fire! Keep it up!"

---

## 👀 What You Should See

### 3D Coach Behaviors:

**Intro Sequence (0-12 seconds):**
1. Waves at you: "Hey! I'm your AI physiotherapist..."
2. Points left: "Watch my demonstration carefully..."
3. Starts exercising: "Now follow along with me..."

**During Exercise:**
- Continuously demonstrates the exercise
- Changes expression based on your form score
- Points when you need correction
- Gives thumbs up for good form
- Claps when you complete a rep
- Shakes head for dangerous movements

**Speech Bubbles:**
- ⚠️ Yellow bubble for warnings
- 💡 Blue bubble for tips
- ✅ Green bubble for praise
- 🎉 Celebration bubble for milestones

---

## 📊 Visual Indicators

### On Screen:

**Top Left:**
- FPS counter (should be 30-60)

**Top Right:**
- Rep counter (increments with each rep)

**Top Center:**
- "Holistic Tracking Active" badge

**Camera View:**
- Blue skeleton (body)
- Green skeleton (right hand)
- Red skeleton (left hand)
- White angle numbers next to joints

**3D Coach Panel:**
- Expression emoji (😊😟😤💪🎉)
- Speaking animation (bars when talking)
- Speech bubble with message

---

## 🔧 Troubleshooting

### No Voice?
1. Check browser console for errors
2. Unmute system volume
3. Try Chrome (best Web Speech API support)
4. Check browser permissions for audio

### 3D Coach Not Responding?
1. Verify session is active (LIVE indicator)
2. Check browser console for feedback data
3. Ensure camera can see your full body
4. Check lighting (needs good visibility)

### Camera Not Detecting?
1. Allow camera permissions
2. Stand 1-2m from camera
3. Ensure full body is visible
4. Check lighting
5. Wait for "Holistic Tracking Active" badge

### Corrections Too Frequent?
- This is normal! The coach provides feedback every 8 seconds
- Try to maintain good form to get praise instead

### No Angle Numbers?
- Move closer to camera
- Ensure joints are visible
- Check lighting
- Wait for MediaPipe to initialize

---

## 📈 Expected Performance

### Metrics:
- **FPS:** 30-60 (depends on hardware)
- **Latency:** <100ms from movement to feedback
- **Accuracy:** ±5° angle measurement
- **Cooldown:** 8 seconds between corrections

### System Requirements:
- Modern browser (Chrome recommended)
- Webcam (720p or better)
- Good lighting
- 1-2m distance from camera
- Full body visible in frame

---

## 🎯 Success Criteria

You'll know it's working when:

✅ Camera shows skeleton overlay (blue/green/red)
✅ FPS counter shows 30+ FPS
✅ Angle numbers appear next to joints
✅ 3D coach demonstrates exercise
✅ Voice corrections are spoken
✅ Expressions change based on your form
✅ Gestures match the feedback
✅ Speech bubbles appear with messages
✅ Rep counter increments with each rep
✅ Praise is given for good form

---

## 🎬 Demo Script

### Perfect Demo Flow:

1. **Start:** "Let me show you the AI physiotherapist"
2. **Sign in:** Use demo credentials
3. **Start session:** Click Physical Rehabilitation
4. **Wait:** Let intro sequence play (12 seconds)
5. **Bad form:** Do shallow squat → Hear correction
6. **Good form:** Do proper squat → Hear praise
7. **Complete rep:** Full range of motion → Hear celebration
8. **Repeat:** Do 5 reps → Hear milestone praise
9. **End:** Click "End Session"

---

## 📝 Integration Checklist

✅ `detailedFeedback` state added to session page
✅ `handleDetailedFeedback` callback created
✅ `onDetailedFeedback` prop connected to PoseCamera
✅ `detailedFeedback` prop connected to PhysioGuide
✅ PoseCamera calculates angle deviations
✅ PoseCamera generates specific corrections
✅ PhysioGuide receives detailed feedback
✅ PhysioGuide speaks corrections with emotion
✅ PhysioGuide adjusts expressions and gestures
✅ Cooldown system prevents feedback spam
✅ No TypeScript errors
✅ All diagnostics clean

---

## 🎉 You're Ready!

The 3D AI Coach with real-time form correction is fully integrated and ready to use. Start a session and experience the interactive coaching!

**Key Features:**
- Real-time angle tracking
- Specific voice corrections
- Expressive 3D coach
- Safety warnings
- Encouragement and praise
- Smart cooldown system

**Have fun testing! 🚀**

---

**Built for:** NeuroRestore AI - Nakshatra Hackathon 2026
**Status:** ✅ COMPLETE & READY TO TEST
