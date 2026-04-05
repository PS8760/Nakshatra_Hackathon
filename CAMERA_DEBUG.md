# 🔧 Camera Debug Guide - "Nhi ho rha" Fix

## Current Issue
Camera shows **black screen** instead of live webcam feed. Session starts (timer running, 3D guide working) but no video.

---

## 🚀 Quick Fix Steps (Try in Order)

### Step 1: Test Camera Separately
```bash
# Open the test file in browser
open test-camera.html
# OR
# Visit: http://localhost:3000/test-camera.html (after copying to frontend/public/)
```

Click "Test Camera" button and see what error appears.

### Step 2: Grant Camera Permissions

**Chrome/Edge:**
1. Look at address bar → Click 🎥 camera icon
2. Select "Always allow localhost:3000 to access your camera"
3. Click "Done"
4. **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

**Safari:**
1. Safari → Settings → Websites → Camera
2. Find "localhost" → Change to "Allow"
3. Refresh page

### Step 3: Check URL
Make sure you're using:
- ✅ `http://localhost:3000/session`
- ❌ NOT `http://192.168.x.x:3000/session`

### Step 4: Close Other Apps
Close these if running:
- Zoom
- Skype
- Microsoft Teams
- FaceTime
- Photo Booth

### Step 5: Check Browser Console
1. Press **F12** (or Cmd+Option+I on Mac)
2. Go to **Console** tab
3. Look for red errors
4. Take screenshot and share

---

## 🔍 Common Errors & Fixes

### Error: "NotAllowedError: Permission denied"
**Fix:** Grant camera permissions (see Step 2 above)

### Error: "NotFoundError: Requested device not found"
**Fix:** 
- Check camera is connected
- Test camera in Photo Booth (Mac) or Camera app (Windows)
- Try different USB port if external camera

### Error: "NotReadableError: Could not start video source"
**Fix:** Close Zoom, Skype, Teams, FaceTime, etc.

### Error: "OverconstrainedError"
**Fix:** Camera resolution too high. Edit `frontend/components/session/PoseCamera.tsx`:
```typescript
// Line ~280, change from:
video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },

// To:
video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
```

---

## 🧪 Browser Console Tests

Open browser console (F12) and run:

### Test 1: Check Camera Access
```javascript
navigator.mediaDevices.getUserMedia({ video: true })
  .then(() => console.log('✅ Camera works!'))
  .catch(err => console.error('❌ Error:', err.name, err.message))
```

### Test 2: List Cameras
```javascript
navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    const cameras = devices.filter(d => d.kind === 'videoinput');
    console.log('📷 Cameras:', cameras.length);
    cameras.forEach(c => console.log('  -', c.label));
  })
```

### Test 3: Check Permissions
```javascript
navigator.permissions.query({ name: 'camera' })
  .then(result => console.log('Permission:', result.state))
```

---

## 🎯 Expected Results

When working:
1. Browser asks for camera permission (first time)
2. Loading screen: "Loading TensorFlow.js..." → "Loading BlazePose Heavy model..." → "Starting camera..."
3. **Camera feed appears** with your face
4. **Skeleton overlay** appears on your body (green/yellow/red joints)
5. FPS counter shows 30-60 FPS (top-left)
6. Form score shows 0-100 (top-right)

---

## 📸 Screenshot Comparison

**❌ Current (Black Screen):**
- Black rectangle where camera should be
- FPS counter shows (62 FPS)
- Form score shows (100)
- 3D guide works on right side
- Timer running (00:20)

**✅ Expected (Working):**
- Live video feed of user
- Skeleton overlay on body
- Green/yellow/red joints
- Angle labels on joints
- Real-time pose detection

---

## 🛠️ Advanced Debugging

### Check Video Element
Open console and run:
```javascript
const video = document.querySelector('video');
console.log('Video element:', video);
console.log('Video srcObject:', video?.srcObject);
console.log('Video readyState:', video?.readyState);
console.log('Video dimensions:', video?.videoWidth, 'x', video?.videoHeight);
```

### Check Canvas Element
```javascript
const canvas = document.querySelector('canvas');
console.log('Canvas:', canvas);
console.log('Canvas dimensions:', canvas?.width, 'x', canvas?.height);
console.log('Canvas context:', canvas?.getContext('2d'));
```

### Check TensorFlow.js
```javascript
console.log('TensorFlow loaded:', typeof tf !== 'undefined');
if (typeof tf !== 'undefined') {
  console.log('Backend:', tf.getBackend());
  console.log('Ready:', await tf.ready());
}
```

---

## 🔄 Reset Everything

If nothing works, try complete reset:

```bash
# 1. Stop frontend
# Press Ctrl+C in terminal running npm run dev

# 2. Clear browser cache
# Chrome: Cmd+Shift+Delete → Clear cached images and files

# 3. Clear browser permissions
# Chrome: chrome://settings/content/camera
# Remove localhost from blocked/allowed lists

# 4. Restart frontend
cd frontend
npm run dev

# 5. Open in new incognito window
# Chrome: Cmd+Shift+N (Mac) or Ctrl+Shift+N (Windows)
# Visit: http://localhost:3000/session

# 6. Grant permissions when asked
```

---

## 📞 Need More Help?

Share these details:
1. **Browser Console Errors** (F12 → Console → screenshot)
2. **Camera Test Result** (from test-camera.html)
3. **Browser & Version** (Chrome 120, Safari 17, etc.)
4. **Operating System** (macOS 14, Windows 11, etc.)
5. **Camera Type** (Built-in MacBook camera, External USB, etc.)
6. **URL you're using** (localhost:3000 or IP address?)

---

**Status:** Debugging in progress  
**Last Updated:** 2026-04-05  
**Issue:** Black screen instead of camera feed
