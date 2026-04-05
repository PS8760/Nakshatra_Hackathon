# Webcam Joints Not Visible - Diagnostic Guide

## Problem Summary
Across ALL implementations (SimplePoseCamera, HolisticCamera, PoseCamera), the webcam appears black and no joints are visible, despite multiple approaches being tried.

## Implementations Tested

### 1. SimplePoseCamera (CDN-based MediaPipe)
- **Location**: `frontend/components/session/SimplePoseCamera.tsx`
- **Test Page**: Not yet created
- **Approach**: Loads MediaPipe Holistic via CDN scripts
- **Status**: Joints not visible

### 2. HolisticCamera (NPM MediaPipe)
- **Location**: `frontend/components/session/HolisticCamera.tsx`
- **Test Page**: `frontend/app/holistic-test/page.tsx`
- **Approach**: Uses `@mediapipe/holistic` and `@mediapipe/camera_utils` from npm
- **Status**: Joints not visible

### 3. PoseCamera (TensorFlow.js BlazePose)
- **Location**: `frontend/components/session/PoseCamera.tsx`
- **Test Page**: `frontend/app/pose-test/page.tsx`
- **Approach**: Uses `@tensorflow-models/pose-detection` with BlazePose Heavy
- **Status**: Joints not visible

## Common Issues Across All Implementations

### Potential Root Causes

1. **Video Element Not Rendering**
   - Video stream may not be properly attached
   - Video element may not be playing
   - Video metadata may not be loaded

2. **Canvas Drawing Issue**
   - Canvas may not be properly sized to match video
   - `ctx.drawImage(video, ...)` may be failing silently
   - Canvas may be cleared but not redrawn

3. **MediaPipe/TensorFlow Loading Issue**
   - Libraries may not be loading properly
   - WASM files may not be accessible
   - CDN resources may be blocked

4. **Browser Permissions**
   - Camera permission may not be granted
   - HTTPS requirement may not be met (though localhost should work)

5. **Timing Issues**
   - Drawing may start before video is ready
   - Video readyState may not be checked properly

## Diagnostic Tool Created

### Webcam Diagnostic Page
**Location**: `frontend/app/webcam-diagnostic/page.tsx`

This page tests the MOST BASIC webcam functionality without any pose detection:

**What it does:**
1. ✅ Requests camera access
2. ✅ Attaches stream to video element
3. ✅ Waits for video metadata
4. ✅ Plays video
5. ✅ Draws video frames to canvas
6. ✅ Adds test overlay (green circle)
7. ✅ Shows FPS counter
8. ✅ Provides detailed logging

**What to look for:**
- Video element should show your webcam feed
- Canvas should ALSO show your webcam feed
- Green circle should be visible in center
- Frame counter should increment
- FPS should be ~30-60
- All status indicators should be green

## How to Use the Diagnostic Tool

1. **Start the frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to the diagnostic page:**
   ```
   http://localhost:3000/webcam-diagnostic
   ```

3. **Grant camera permissions when prompted**

4. **Observe the results:**
   - Check if video element shows your face
   - Check if canvas shows your face
   - Check if green circle is visible
   - Read the diagnostic log for errors

## Expected Outcomes

### ✅ Success Case
- Both video and canvas show your webcam feed
- Green circle visible in center
- FPS counter updating
- Log shows "Drawing at X FPS"
- All 4 status indicators are green

### ❌ Failure Case 1: Video works, Canvas black
**Diagnosis**: Drawing issue
**Possible causes:**
- Canvas context not obtained
- `drawImage()` failing
- Canvas size mismatch
- Timing issue (drawing before video ready)

### ❌ Failure Case 2: Both video and canvas black
**Diagnosis**: Camera/stream issue
**Possible causes:**
- Camera permission denied
- No camera available
- Stream not attached properly
- Video element not playing

### ❌ Failure Case 3: Video works, but no pose detection
**Diagnosis**: MediaPipe/TensorFlow issue
**Possible causes:**
- Libraries not loading
- WASM files not accessible
- Model files not loading
- Inference failing silently

## Next Steps Based on Diagnostic Results

### If diagnostic tool works (video + canvas visible):
The issue is with pose detection libraries, not basic webcam functionality.

**Action items:**
1. Check browser console for MediaPipe/TensorFlow errors
2. Verify WASM files are accessible
3. Check network tab for failed resource loads
4. Test with simpler pose detection (MoveNet Lite instead of BlazePose Heavy)
5. Add more logging to pose detection initialization

### If diagnostic tool fails (black video/canvas):
The issue is with basic webcam functionality.

**Action items:**
1. Check camera permissions in browser settings
2. Test in different browser (Chrome, Firefox, Safari)
3. Verify HTTPS or localhost
4. Check if other apps can access camera
5. Try different video constraints (lower resolution)

### If video works but canvas is black:
The issue is with canvas drawing.

**Action items:**
1. Verify canvas size matches video size
2. Check if `ctx.drawImage()` throws errors
3. Ensure video.readyState >= 2 before drawing
4. Try drawing after a delay
5. Check if canvas is being cleared but not redrawn

## Code Patterns to Check

### ✅ Correct Pattern (from diagnostic tool):
```typescript
// 1. Wait for video metadata
await new Promise<void>((resolve) => {
  video.onloadedmetadata = () => resolve();
});

// 2. Play video
await video.play();

// 3. Set canvas size
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;

// 4. Check readyState before drawing
function drawLoop() {
  if (video.readyState < 2) {
    requestAnimationFrame(drawLoop);
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  requestAnimationFrame(drawLoop);
}
```

### ❌ Common Mistakes:
```typescript
// Drawing before video is ready
ctx.drawImage(video, 0, 0); // May fail if video.readyState < 2

// Canvas size not set
// Canvas defaults to 300x150, video may be 640x480

// Not checking if video is playing
// Video may be paused or not started

// Clearing canvas but not redrawing
ctx.clearRect(0, 0, w, h);
// Missing: ctx.drawImage(video, 0, 0, w, h);
```

## Browser Console Checks

When testing any of the pose detection pages, check console for:

1. **MediaPipe errors:**
   - "Failed to load WASM"
   - "Could not locate file"
   - "Holistic is not defined"

2. **TensorFlow errors:**
   - "Backend not found"
   - "Model loading failed"
   - "WebGL not supported"

3. **Camera errors:**
   - "Permission denied"
   - "Device not found"
   - "getUserMedia failed"

4. **Canvas errors:**
   - "Failed to execute 'drawImage'"
   - "Canvas context is null"
   - "Invalid state error"

## Testing Checklist

- [ ] Run diagnostic tool at `/webcam-diagnostic`
- [ ] Verify video element shows webcam feed
- [ ] Verify canvas shows webcam feed
- [ ] Verify green circle is visible
- [ ] Check FPS counter is updating
- [ ] Read diagnostic log for errors
- [ ] Check browser console for errors
- [ ] Test in different browser
- [ ] Test with camera permissions reset
- [ ] Compare working vs non-working implementations

## Files to Review

1. **Diagnostic Tool**: `frontend/app/webcam-diagnostic/page.tsx`
2. **SimplePoseCamera**: `frontend/components/session/SimplePoseCamera.tsx`
3. **HolisticCamera**: `frontend/components/session/HolisticCamera.tsx`
4. **PoseCamera**: `frontend/components/session/PoseCamera.tsx`
5. **Session Page**: `frontend/app/session/page.tsx`

## Recommended Immediate Action

1. **Run the diagnostic tool first** to establish baseline webcam functionality
2. **Share the diagnostic results** (screenshot of page + browser console)
3. **Based on results**, we can narrow down the exact issue
4. **Then fix** the specific problem in all pose detection implementations

## Success Criteria

The issue will be considered resolved when:
- ✅ Diagnostic tool shows video + canvas with green circle
- ✅ At least one pose detection implementation shows skeleton overlay
- ✅ Joints are visible and tracking in real-time
- ✅ No black screen in any implementation
- ✅ FPS is acceptable (>15 FPS)
