# Webcam Debug Guide

## Issue
The webcam feed appears black in the session page.

## Recent Fixes Applied

### 1. Video Drawing Order
✅ **Fixed**: Video is now drawn FIRST before skeleton overlay
```typescript
ctx.clearRect(0, 0, w, h);
ctx.drawImage(video, 0, 0, w, h);  // ← Video drawn first
// Then skeleton overlay on top
```

### 2. Canvas Size Management
✅ **Fixed**: Canvas size only updates when dimensions change (prevents flicker)

### 3. Added Debug Logging
Console logs now show:
- Camera stream settings
- Video dimensions when metadata loads
- Video playing confirmation
- Canvas resize events

## How to Debug

### Step 1: Check Browser Console
Open the session page and check console for:
```
Camera stream obtained: {width: 1280, height: 720, ...}
Video metadata loaded: 1280 x 720
Video playing
Canvas resized to: 1280 x 720
```

### Step 2: Check Camera Permissions
- Browser must have camera permission
- HTTPS or localhost required
- Check browser settings → Site permissions → Camera

### Step 3: Verify Video Element
The video element should be:
- Hidden (`display: "none"`)
- Playing (check `video.paused === false`)
- Have valid dimensions (`video.videoWidth > 0`)

### Step 4: Check Canvas
The canvas should:
- Have same dimensions as video
- Be visible on page
- Have 2D context

## Common Issues

### Black Screen Causes:
1. **Camera not started**: Check if `getUserMedia` succeeded
2. **Video not playing**: Check if `video.play()` was called
3. **Canvas not drawing**: Check if `drawImage` is being called in loop
4. **Wrong dimensions**: Video might be 0x0 if metadata not loaded

### Browser Compatibility:
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support  
- ⚠️ Safari: May need webkit prefix
- ❌ HTTP sites: Camera blocked (use HTTPS or localhost)

## Testing Steps

1. **Start a session** from the dashboard
2. **Allow camera access** when prompted
3. **Check console** for any errors
4. **Look for video feed** with skeleton overlay
5. **Verify FPS counter** shows >0 FPS (top right)

## Expected Behavior

When working correctly:
- Video feed shows user's body
- All 33 BlazePose keypoints visible as dots
- Cyan skeleton connections drawn
- Tracked joints show angle labels
- FPS counter shows 15-30 FPS
- Analysis metrics update in real-time

## Code Flow

```
1. getUserMedia() → Get camera stream
2. video.srcObject = stream → Attach to video element
3. video.play() → Start playback
4. requestAnimationFrame(runLoop) → Start render loop
5. Loop:
   a. ctx.drawImage(video) → Draw video frame
   b. detector.estimatePoses() → Get keypoints
   c. drawSkeleton() → Draw overlay
   d. Repeat
```

## If Still Black

Try these in order:

1. **Refresh the page** - Sometimes camera needs re-initialization
2. **Check other tabs** - Another tab might be using the camera
3. **Restart browser** - Clear any stuck camera locks
4. **Try different browser** - Rule out browser-specific issues
5. **Check camera hardware** - Test in another app (Zoom, etc.)

## Next Steps

If the issue persists after these fixes:
1. Check browser console for specific error messages
2. Verify camera permissions in browser settings
3. Test on a different device/browser
4. Check if camera works in other web apps
