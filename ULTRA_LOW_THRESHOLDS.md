# Ultra-Low Threshold Configuration

## ✅ All Thresholds Minimized for Maximum Detection

### Changes Applied

As an expert computer vision engineer, I've lowered ALL confidence thresholds to the absolute minimum to ensure the skeleton draws no matter what.

### 1. MediaPipe Pose Configuration

```typescript
pose.setOptions({
  modelComplexity: 0,              // Lite model for speed
  smoothLandmarks: true,           // Reduce jitter
  enableSegmentation: false,       // Disable for performance
  minDetectionConfidence: 0.1,     // 10% - VERY LOW threshold
  minTrackingConfidence: 0.1       // 10% - VERY LOW threshold
});
```

**Before**: 0.5 (50%)
**After**: 0.1 (10%)

This means MediaPipe will accept poses with only 10% confidence instead of 50%.

### 2. Drawing Visibility Thresholds

#### Skeleton Connections
```typescript
// LOWERED from 0.3 to 0.1
if (startLm && endLm && startLm.visibility > 0.1 && endLm.visibility > 0.1) {
  // Draw connection
}
```

**Before**: 0.3 (30%)
**After**: 0.1 (10%)

#### Joint Landmarks
```typescript
// LOWERED from 0.3 to 0.1
if (landmark.visibility < 0.1) return;
```

**Before**: 0.3 (30%)
**After**: 0.1 (10%)

#### Angle Labels
```typescript
// LOWERED from 0.3 to 0.1
if (!landmark || landmark.visibility < 0.1) continue;
```

**Before**: 0.3 (30%)
**After**: 0.1 (10%)

### 3. Debug Logging

Added detailed console logging on every frame:

```typescript
pose.onResults((results: any) => {
  // DEBUG: Log nose keypoint confidence on every frame
  if (results.poseLandmarks && results.poseLandmarks[0]) {
    console.log('Nose visibility:', results.poseLandmarks[0].visibility);
    console.log('Total landmarks detected:', results.poseLandmarks.length);
  } else {
    console.log('NO LANDMARKS DETECTED');
  }
  
  // ... rest of processing
});
```

### What You'll See in Console

**When pose is detected:**
```
Nose visibility: 0.9876543
Total landmarks detected: 33
```

**When no pose detected:**
```
NO LANDMARKS DETECTED
```

### Threshold Summary

| Component | Previous | Current | Change |
|-----------|----------|---------|--------|
| Detection Confidence | 50% | 10% | -80% |
| Tracking Confidence | 50% | 10% | -80% |
| Connection Visibility | 30% | 10% | -67% |
| Landmark Visibility | 30% | 10% | -67% |
| Label Visibility | 30% | 10% | -67% |

### Expected Behavior

With these ultra-low thresholds:

1. **More Joints Visible**: Even low-confidence keypoints will be drawn
2. **More Connections**: Skeleton lines will appear even with uncertain tracking
3. **More Labels**: Angle labels will show for more joints
4. **Possible Jitter**: Lower confidence may cause more unstable tracking
5. **False Positives**: May detect poses when none exist

### Diagnostic Process

1. **Start a session** and open browser console (F12)
2. **Check console logs** on every frame:
   - If you see "NO LANDMARKS DETECTED" → Model isn't detecting any pose
   - If you see visibility scores → Model is detecting but may be filtering
3. **Check visibility values**:
   - Values > 0.1 → Should be drawn
   - Values < 0.1 → Will be filtered out
4. **Verify skeleton appears** on webcam

### Troubleshooting

If skeleton still doesn't appear:

**Check 1: Is MediaPipe loading?**
- Look for "Loading MediaPipe libraries…" in UI
- Check console for script loading errors

**Check 2: Is pose being detected?**
- Check console logs
- If "NO LANDMARKS DETECTED" → Position yourself better in frame
- If visibility scores shown → Thresholds are working

**Check 3: Are visibility scores too low?**
- If nose visibility < 0.1 → Even ultra-low thresholds won't help
- Solution: Better lighting, better camera position, clearer background

**Check 4: Is canvas rendering?**
- Check if video feed is visible
- Check if canvas element exists
- Check browser console for rendering errors

### Performance Impact

Lower thresholds may affect performance:

- **More Processing**: Drawing more keypoints takes more CPU
- **More Jitter**: Low-confidence tracking is less stable
- **More False Positives**: May detect non-existent poses

### Recommended Next Steps

1. **Test with ultra-low thresholds** (current settings)
2. **Check console logs** to see actual visibility scores
3. **If skeleton appears but is jittery**:
   - Increase thresholds gradually (0.15, 0.2, 0.25)
   - Find sweet spot between visibility and stability
4. **If skeleton still doesn't appear**:
   - Check lighting conditions
   - Check camera position
   - Check if full body is in frame
   - Try different background

### Code Locations

All changes made in: `frontend/components/session/PoseCamera.tsx`

**Line ~420**: MediaPipe configuration
```typescript
minDetectionConfidence: 0.1,
minTrackingConfidence: 0.1
```

**Line ~430**: Debug logging
```typescript
console.log('Nose visibility:', results.poseLandmarks[0].visibility);
```

**Line ~230**: Connection visibility threshold
```typescript
if (startLm && endLm && startLm.visibility > 0.1 && endLm.visibility > 0.1)
```

**Line ~250**: Landmark visibility threshold
```typescript
if (landmark.visibility < 0.1) return;
```

**Line ~290**: Label visibility threshold
```typescript
if (!landmark || landmark.visibility < 0.1) continue;
```

### Current Status

✅ **All Thresholds Minimized**
- Detection: 10% (was 50%)
- Tracking: 10% (was 50%)
- Drawing: 10% (was 30%)
- Debug logging: Active
- Ready for testing

---

**The system will now draw a skeleton with the absolute minimum confidence requirements!**

Check your browser console to see the actual visibility scores on every frame.
