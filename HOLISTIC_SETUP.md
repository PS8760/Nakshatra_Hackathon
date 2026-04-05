# MediaPipe Holistic Setup Guide

## 📦 Required Dependencies

Add these to your `package.json`:

```json
{
  "dependencies": {
    "@mediapipe/holistic": "^0.5.1675471629",
    "@mediapipe/camera_utils": "^0.3.1675466862",
    "@mediapipe/drawing_utils": "^0.3.1675466862"
  }
}
```

## 🚀 Installation

```bash
npm install @mediapipe/holistic @mediapipe/camera_utils @mediapipe/drawing_utils
```

Or with yarn:

```bash
yarn add @mediapipe/holistic @mediapipe/camera_utils @mediapipe/drawing_utils
```

## 📁 Files Created

### 1. **HolisticCamera.tsx** - Main Component
Location: `frontend/components/session/HolisticCamera.tsx`

**Features:**
- ✅ MediaPipe Holistic integration
- ✅ Full body tracking (33 landmarks)
- ✅ Left hand tracking (21 joints - every finger, knuckle, palm)
- ✅ Right hand tracking (21 joints - every finger, knuckle, palm)
- ✅ Hardcoded confidence thresholds (0.65 detection, 0.65 tracking)
- ✅ Real-time FPS counter (top-left)
- ✅ Threshold-gated rep counter (top-right)
- ✅ 3D angle calculation using dot product
- ✅ State machine rep logic (idle → down → up)
- ✅ Color-coded skeleton:
  - 🔵 Blue = Body
  - 🟢 Green = Right Hand
  - 🔴 Red = Left Hand

### 2. **Test Page** - `/holistic-test`
Location: `frontend/app/holistic-test/page.tsx`

Professional demonstration page with:
- Color legend
- Rep counter instructions
- Technical specifications
- Feature list
- Usage tips

## 🎯 Key Technical Specifications

### Confidence Thresholds (Hardcoded)
```typescript
const HOLISTIC_CONFIG = {
  minDetectionConfidence: 0.65,  // Filters bad initial detections
  minTrackingConfidence: 0.65,   // Filters bad frame-to-frame tracking
  modelComplexity: 1,            // 0=lite, 1=full, 2=heavy
  smoothLandmarks: true,         // Temporal smoothing
};
```

### Rep Counter Thresholds
```typescript
const REP_THRESHOLDS = {
  CONTRACTION_ANGLE: 45,   // Arm must bend < 45° for contraction
  EXTENSION_ANGLE: 160,    // Arm must extend > 160° for extension
  MIN_CONFIDENCE: 0.65,    // Minimum pose confidence to count rep
  HYSTERESIS: 10,          // Prevent jitter
};
```

### Drawing Colors
```typescript
const COLORS = {
  BODY: "#0000FF",        // Blue for body skeleton
  RIGHT_HAND: "#00FF00",  // Green for right hand
  LEFT_HAND: "#FF0000",   // Red for left hand
};
```

## 🔧 How It Works

### 1. **Initialization**
- Loads MediaPipe Holistic model from CDN
- Sets hardcoded confidence thresholds
- Initializes camera at 1280x720 resolution
- Binds camera feed to Holistic model using `@mediapipe/camera_utils`

### 2. **Frame Processing**
- Camera captures frame
- Holistic model processes frame
- `onResults` callback receives:
  - `poseLandmarks` (33 body points)
  - `leftHandLandmarks` (21 hand joints)
  - `rightHandLandmarks` (21 hand joints)

### 3. **Drawing**
- Canvas overlays exactly on video
- Uses `@mediapipe/drawing_utils` for professional rendering
- Draws connections (bones) and landmarks (joints)
- Color-coded by body part

### 4. **Angle Calculation**
```typescript
function calculate3DAngle(a, b, c) {
  // Vector BA and BC
  // Dot product: BA · BC
  // Magnitudes: |BA| × |BC|
  // Angle: arccos(dot / (mag1 × mag2))
  // Convert radians to degrees
}
```

### 5. **Rep Counting State Machine**
```
IDLE/UP → (angle > 160°) → DOWN
DOWN → (angle < 45° AND confidence ≥ 0.65) → UP [+1 REP]
```

### 6. **FPS Calculation**
- Uses `performance.now()` for high precision
- Calculates delta time between frames
- Smooths FPS display with exponential moving average
- Updates every 10 frames

## 📊 Landmark Details

### Body Landmarks (33 points)
- Face: nose, eyes, ears, mouth
- Torso: shoulders, hips
- Arms: elbows, wrists
- Legs: knees, ankles, heels, feet

### Hand Landmarks (21 points each)
- Wrist (1 point)
- Thumb (4 points: CMC, MCP, IP, TIP)
- Index finger (4 points: MCP, PIP, DIP, TIP)
- Middle finger (4 points: MCP, PIP, DIP, TIP)
- Ring finger (4 points: MCP, PIP, DIP, TIP)
- Pinky (4 points: MCP, PIP, DIP, TIP)

**Total: 75 landmarks** (33 body + 21 left hand + 21 right hand)

## 🎮 Usage

1. Navigate to `/holistic-test` in your browser
2. Allow camera access
3. Stand 1.5-2 meters from camera
4. Ensure good lighting
5. Keep hands visible for full tracking
6. Perform bicep curls with right arm to test rep counter

## 🔍 Debugging

### Check Console Logs
- `🚀 Initializing MediaPipe Holistic...`
- `✅ Holistic configuration: {...}`
- `✅ Camera started successfully`
- `📐 Stage: DOWN (angle: X°)`
- `✅ REP COMPLETED! Total: X`
- `⚠️ Confidence too low: X < 0.65`

### Common Issues

**Black screen:**
- Check camera permissions
- Ensure HTTPS or localhost
- Check browser console for errors

**No skeleton drawn:**
- Check if MediaPipe CDN is accessible
- Verify drawing_utils import
- Check canvas size matches video

**Rep not counting:**
- Check confidence level (bottom-left display)
- Ensure full range of motion (< 45° and > 160°)
- Verify right elbow is visible

**Low FPS:**
- Reduce resolution (change camera width/height)
- Use modelComplexity: 0 (lite)
- Close other browser tabs

## 🚀 Performance Tips

1. **Optimal Resolution:** 1280x720 balances quality and speed
2. **Model Complexity:** Use 1 (full) for best accuracy
3. **Lighting:** Good lighting improves tracking confidence
4. **Distance:** 1.5-2 meters from camera is optimal
5. **Background:** Plain background improves detection

## 📈 Next Steps

### Integration with Existing App
Replace the current PoseCamera component:

```typescript
// In your session page
import HolisticCamera from "@/components/session/HolisticCamera";

// Use it
<HolisticCamera />
```

### Customization Options

**Change tracked joint:**
```typescript
// Track left elbow instead
const angle = calculate3DAngle(
  pose[POSE_LANDMARKS.LEFT_SHOULDER],
  pose[POSE_LANDMARKS.LEFT_ELBOW],
  pose[POSE_LANDMARKS.LEFT_WRIST]
);
```

**Adjust thresholds:**
```typescript
// For squats (knee angle)
const REP_THRESHOLDS = {
  CONTRACTION_ANGLE: 90,   // Squat down
  EXTENSION_ANGLE: 170,    // Stand up
  MIN_CONFIDENCE: 0.65,
};
```

**Add more angles:**
```typescript
// Track multiple joints
const leftElbowAngle = calculate3DAngle(...);
const rightKneeAngle = calculate3DAngle(...);
const leftShoulderAngle = calculate3DAngle(...);
```

## 🎓 Expert Notes

### Why MediaPipe Holistic?
- **More landmarks:** 75 vs 33 (BlazePose)
- **Hand tracking:** Every finger joint tracked
- **Better for PT:** Can track grip, finger movements
- **Proven accuracy:** Used in medical research
- **Active development:** Regular updates from Google

### Confidence Threshold Rationale
- **0.65 is optimal** for physical therapy
- Lower (0.5): More false positives
- Higher (0.8): Misses valid movements
- **0.65 balances** accuracy and coverage

### State Machine Benefits
- **No false counts:** Requires full ROM
- **Hysteresis:** Prevents jitter
- **Confidence gating:** Only counts good data
- **Clear stages:** Easy to debug

## 📚 References

- [MediaPipe Holistic Docs](https://google.github.io/mediapipe/solutions/holistic.html)
- [Hand Landmark Model](https://google.github.io/mediapipe/solutions/hands.html)
- [Pose Landmark Model](https://google.github.io/mediapipe/solutions/pose.html)

---

**Built by Expert Computer Vision Engineer**
**Optimized for Physical Therapy Applications**
