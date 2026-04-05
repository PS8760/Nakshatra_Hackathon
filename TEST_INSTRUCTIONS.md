# Testing Instructions - Webcam Joints Fix

## 🎯 What Was Fixed

Changed video element from `display: "none"` to `visibility: "hidden"` in PoseCamera.tsx to allow proper video frame decoding.

## 🧪 Quick Test (2 minutes)

### Step 1: Access the Session Page
```
http://localhost:3000/session
```

### Step 2: Start a Session
1. Click "▶ Start Session" button
2. Grant camera permissions if prompted
3. Wait for loading (should take 5-10 seconds)

### Step 3: Verify the Fix
Look for these indicators:

✅ **SUCCESS - You should see:**
- Your face/body on the canvas
- Cyan/turquoise skeleton lines
- Colored dots at joints
- Numbers showing angles (e.g., "90°")
- FPS counter in top-right
- "Good form" or fault messages below camera

❌ **FAILURE - If you see:**
- Black canvas
- No skeleton overlay
- No joints visible
- Error message

## 📸 What to Look For

### The Canvas Should Show:
```
┌─────────────────────────────────┐
│  [FPS: 25]              ┌─────┐ │ ← FPS counter
│                         │     │ │
│         👤              │     │ │ ← Your webcam feed
│        /│\             │     │ │
│       / │ \            │     │ │
│        / \             │     │ │ ← Skeleton overlay
│       /   \            │     │ │
│      🔵   🔵           └─────┘ │ ← Joint dots
└─────────────────────────────────┘
```

### Joint Colors:
- 🟢 **Green** = Good form (within 5° of target)
- 🟡 **Yellow** = Minor issue (within 15°)
- 🔴 **Red** = Needs correction (>15° away)
- 🔵 **Cyan** = All other keypoints (not tracked for angles)

### Below Camera:
- Exercise name (e.g., "Detecting…" or "bicep curl")
- Phase (e.g., "up" or "down")
- Rep count
- Form feedback messages
- Joint angle readouts

## 🎬 Test Exercises

### Test 1: Bicep Curl (Right Arm)
1. Stand facing camera
2. Extend right arm fully (straight down)
3. Bend elbow to bring hand to shoulder
4. Extend arm again
5. **Expected**: Rep count should increment

### Test 2: Squat
1. Stand facing camera
2. Squat down (bend knees)
3. Stand back up
4. **Expected**: Knee angles should change, rep count increments

### Test 3: Shoulder Press
1. Stand facing camera
2. Raise arms overhead
3. Lower arms to shoulder level
4. **Expected**: Shoulder angles displayed, rep count increments

## 🐛 Troubleshooting

### If Canvas is Still Black:

1. **Check Browser Console** (F12 → Console)
   - Look for errors related to:
     - Camera permissions
     - TensorFlow.js loading
     - WebGL errors

2. **Check Camera Permissions**
   - Click camera icon in address bar
   - Ensure permission is "Allow"
   - Refresh page if you just granted permission

3. **Try Different Browser**
   - Chrome/Edge recommended (best support)
   - Firefox should work
   - Safari may have issues

4. **Check Video Element**
   - Open browser DevTools (F12)
   - Go to Elements/Inspector tab
   - Find the `<video>` element
   - Check if `srcObject` is set
   - Check if video is playing

5. **Run Diagnostic Tool**
   ```
   http://localhost:3000/webcam-diagnostic
   ```
   This will test basic webcam functionality

## 📊 Expected Performance

### Frame Rate:
- **Good**: 25-30 FPS
- **Acceptable**: 15-25 FPS
- **Poor**: <15 FPS (may need to reduce model complexity)

### Loading Time:
- **Model Loading**: 3-5 seconds
- **Camera Start**: 1-2 seconds
- **Total**: 5-10 seconds

### Latency:
- **Skeleton Tracking**: <50ms (real-time)
- **Rep Detection**: Instant when threshold crossed
- **Form Analysis**: Real-time

## ✅ Success Checklist

After starting a session, verify:

- [ ] Canvas shows webcam feed (not black)
- [ ] Skeleton overlay is visible
- [ ] Joints are visible as colored dots
- [ ] Joint angles are displayed
- [ ] FPS counter shows >15 FPS
- [ ] Exercise is detected
- [ ] Rep counter increments when you move
- [ ] Form feedback appears below camera
- [ ] No errors in browser console

## 📝 Report Results

If testing, please report:

1. **Browser & Version**: (e.g., Chrome 120)
2. **Operating System**: (e.g., macOS, Windows, Linux)
3. **What you see**: (describe or screenshot)
4. **Console errors**: (if any)
5. **FPS**: (what number is shown)
6. **Does it work?**: Yes/No

## 🎯 Quick Visual Test

**30-second test:**
1. Go to `/session`
2. Click "Start Session"
3. Wait 10 seconds
4. Look at canvas
5. **Can you see yourself?** → ✅ Fixed / ❌ Still broken

## 🔗 Test URLs

All test pages (dev server must be running):

- **Main Session**: http://localhost:3000/session
- **Diagnostic Tool**: http://localhost:3000/webcam-diagnostic
- **Simple Pose Test**: http://localhost:3000/simple-pose-test
- **Holistic Test**: http://localhost:3000/holistic-test
- **Pose Test**: http://localhost:3000/pose-test

## 💡 Pro Tips

1. **Good Lighting**: Ensure room is well-lit
2. **Full Body Visible**: Stand 1.5-2m from camera
3. **Stable Position**: Don't move too fast initially
4. **Camera Height**: Position camera at chest/shoulder level
5. **Background**: Plain background works best

## 🚀 Next Steps After Successful Test

Once joints are visible:
1. Test rep counting with different exercises
2. Test form analysis feedback
3. Test pain logging feature
4. Test session end and data saving
5. Check dashboard for session history

---

**Fix Applied**: ✅ Yes
**Ready to Test**: ✅ Yes
**Expected Result**: Webcam feed with skeleton overlay visible
