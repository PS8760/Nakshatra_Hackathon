# 🎥 WEBCAM FIX - DO THIS NOW

## The Problem
Black screen instead of webcam feed. Session works but no video.

## THE FIX (Do in Order)

### Step 1: Check Browser Console (MOST IMPORTANT)
1. Open session page: http://localhost:3000/session
2. Press **F12** (or Cmd+Option+I on Mac)
3. Click **Console** tab
4. Look for camera-related messages (🎥, ✅, ❌)
5. **Take screenshot and share**

### Step 2: Grant Camera Permission
**Chrome/Edge:**
1. Look at address bar (top)
2. See camera icon 🎥? Click it
3. Select "Always allow localhost:3000 to access your camera"
4. Click "Done"
5. **Reload page**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

**Safari:**
1. Safari menu → Settings → Websites → Camera
2. Find "localhost" in list
3. Change dropdown to "Allow"
4. Close settings
5. **Reload page**

### Step 3: Test Camera in Console
In browser console (F12), paste and run:

```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    console.log('✅ CAMERA WORKS!');
    console.log('Video tracks:', stream.getVideoTracks());
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => {
    console.error('❌ CAMERA ERROR:', err.name);
    console.error('Message:', err.message);
  })
```

**What you'll see:**
- ✅ "CAMERA WORKS!" → Camera is fine, issue is in code
- ❌ "NotAllowedError" → Need to grant permission (Step 2)
- ❌ "NotFoundError" → No camera detected
- ❌ "NotReadableError" → Camera in use by another app

### Step 4: Check URL
Make sure you're using:
- ✅ `http://localhost:3000/session`
- ❌ NOT `http://192.168.x.x:3000/session`

Camera API requires localhost or HTTPS!

### Step 5: Close Other Apps
Close these if running:
- Zoom
- Skype
- Microsoft Teams
- FaceTime
- Photo Booth
- Any video recording software

### Step 6: Try Different Browser
If still not working:
1. Try Chrome (best support)
2. Try Edge (also good)
3. Avoid Safari for now (permission issues)

---

## What I Changed in Code

1. **Camera first, models later**: Now requests camera BEFORE loading heavy TensorFlow models
2. **Better error messages**: Shows specific error (permission denied, no camera, etc.)
3. **Video dimension check**: Ensures video has valid dimensions before drawing
4. **Console logging**: Added debug logs (🎥, ✅, ❌) to track initialization
5. **Fallback resolution**: If 1280x720 fails, tries 640x480

---

## Expected Console Output (When Working)

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

---

## If Still Black Screen After All Steps

Run this in console to check video element:

```javascript
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video srcObject:', video?.srcObject);
console.log('Video readyState:', video?.readyState);
console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);
console.log('Video playing:', !video?.paused);

const canvas = document.querySelector('canvas');
console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
```

Share the output!

---

## Quick Test Page

Open this in browser: `test-camera.html`

Or visit: http://localhost:3000/test-camera.html

Click "Test Camera" button. If camera works there but not in session page, it's a code issue.

---

## CRITICAL: After Code Changes

The code has been updated. You MUST:

1. **Stop frontend** (Ctrl+C in terminal)
2. **Restart frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
4. **Check console** for new debug messages

---

## Status: UPDATED ✅

Camera initialization code has been improved with:
- Camera permission requested first
- Better error handling
- Console debug logs
- Fallback resolution
- Video dimension validation

**Next:** Follow steps above and share console output!
