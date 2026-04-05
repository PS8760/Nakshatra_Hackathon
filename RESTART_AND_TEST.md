# 🚀 RESTART & TEST - Webcam Fix

## ✅ Code Has Been Fixed!

The webcam initialization code has been updated to fix the "Video load timeout" error.

---

## DO THIS NOW (In Order):

### 1️⃣ Stop Frontend
In the terminal running `npm run dev`, press:
```
Ctrl + C
```

### 2️⃣ Restart Frontend
```bash
cd frontend
npm run dev
```

Wait for: `✓ Ready in X.Xs`

### 3️⃣ Open Browser
```
http://localhost:3000/session
```

### 4️⃣ Open Browser Console
Press **F12** (or Cmd+Option+I on Mac)

Click **Console** tab

### 5️⃣ Hard Refresh Page
- **Mac**: Cmd + Shift + R
- **Windows**: Ctrl + Shift + F5

This clears cache and loads new code.

### 6️⃣ Start Session
Click "Start Session" button

### 7️⃣ Grant Camera Permission
When browser asks:
- Click **Allow**
- Check "Remember this decision" (if available)

### 8️⃣ Watch Console Output
You should see:
```
🎥 Starting camera initialization...
✅ Camera access granted
📹 Video stream attached
📐 Video dimensions: 1280x720
▶️ Video playing
✅ TensorFlow.js ready
✅ BlazePose model loaded
🚀 Starting pose detection loop
📐 Canvas resized to 1280x720
```

### 9️⃣ Check Camera Feed
You should see:
- ✅ Your face/body in the camera area
- ✅ Skeleton overlay (white lines)
- ✅ Colored joints (green/yellow/red)
- ✅ Angle labels on joints
- ✅ FPS counter (top-left)
- ✅ Form score (top-right)

---

## 🎯 Quick Test Script

Or just run:
```bash
./test-webcam-fix.sh
```

This will:
- Check if frontend is running
- Open browser to session page
- Show instructions

---

## ❌ If Still Shows Error

### Error: "Camera permission denied"
**Fix:**
1. Click camera icon 🎥 in address bar
2. Select "Always allow localhost:3000"
3. Refresh page (Cmd+Shift+R)

### Error: "No camera found"
**Fix:**
1. Check camera is connected
2. Test in Photo Booth (Mac) or Camera app (Windows)
3. Try different USB port (if external camera)

### Error: "Camera is in use"
**Fix:**
1. Close Zoom, Skype, Teams, FaceTime
2. Refresh page

### Error: "Video play failed"
**Fix:**
1. Try Chrome browser (best support)
2. Check URL is `http://localhost:3000` (not IP address)
3. Try incognito/private window

---

## 🧪 Test Camera Separately

If session page doesn't work, test camera in isolation:

```bash
open test-camera.html
```

Or visit: `http://localhost:3000/test-camera.html`

Click "Test Camera" button.

**If it works there but not in session:**
→ Share console output from session page

**If it doesn't work there either:**
→ Camera permission or hardware issue

---

## 🔍 Debug Commands

Run in browser console (F12) if still not working:

```javascript
// Test camera access
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ Camera works!');
    console.log('Tracks:', stream.getVideoTracks());
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => {
    console.error('❌ Camera error:', err.name, err.message);
  });

// Check video element
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('srcObject:', video?.srcObject);
console.log('readyState:', video?.readyState);
console.log('dimensions:', video?.videoWidth, 'x', video?.videoHeight);
console.log('paused:', video?.paused);

// Check canvas
const canvas = document.querySelector('canvas');
console.log('Canvas:', canvas?.width, 'x', canvas?.height);
```

---

## 📸 What You Should See

**Before (Black Screen):**
- ❌ Black rectangle
- ✅ FPS counter visible
- ✅ Form score visible
- ✅ 3D guide working
- ❌ No video feed

**After (Working):**
- ✅ Live video of you
- ✅ Skeleton overlay
- ✅ Colored joints
- ✅ Angle labels
- ✅ FPS counter
- ✅ Form score
- ✅ Real-time pose detection

---

## 🆘 Still Not Working?

Share these details:

1. **Console output** (F12 → Console → screenshot)
2. **Error message** (if any)
3. **Browser & version** (Chrome 120, Safari 17, etc.)
4. **Operating system** (macOS 14, Windows 11, etc.)
5. **Camera test result** (from test-camera.html)

---

## ✅ What Was Fixed

1. Added `autoPlay`, `playsInline`, `preload` attributes to video element
2. Increased timeout from 10s to 15s
3. Listen to multiple events (`loadedmetadata`, `loadeddata`)
4. Fallback: tries to play even if metadata doesn't load
5. Automatic play retry after 1 second
6. Better error messages with specific fixes

---

**Status:** Code updated ✅  
**Next:** Restart frontend and test!
