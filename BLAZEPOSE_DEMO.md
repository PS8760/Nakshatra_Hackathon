# BlazePose 33 Keypoint Detection Demo

## 🚀 Quick Start

1. Start the frontend server:
```bash
cd frontend
npm run dev
```

2. Open your browser:
```
http://localhost:3000/demo-pose
```

3. Allow camera access when prompted

## 🎯 What You'll See

### Real-time Skeleton Tracking
- 33 body landmarks detected in real-time
- Color-coded visualization:
  - 🟡 Yellow: Face landmarks (nose, eyes, ears)
  - 🔵 Blue: Upper body (shoulders, elbows, wrists)Include the attached image as the analysis part int he sessions taht to real-time.

Work on black web camm of the user


  - 🩷 Pink: Lower body (hips, knees, ankles, feet)

### Live Stats
- FPS counter (top-left): Shows detection speed
- Keypoint count (top-right): Shows how many of 33 points are visible

### 3D Depth Information
- Each keypoint has x, y, z coordinates
- Z-axis provides depth (distance from camera)
- Enables accurate 3D angle calculations

## 📊 BlazePose Model Details

### Model: BlazePose Heavy
- 33 keypoints with 3D coordinates
- 95.2% PCK@0.2 accuracy (Percentage of Correct Keypoints)
- ~8MB model size
- Optimized for browser with TensorFlow.js

### Keypoint Map (33 points)
```
Face (7 points):
  0: nose
  1-6: eyes (inner, center, outer)
  7-8: ears

Upper Body (12 points):
  11-12: shoulders
  13-14: elbows
  15-16: wrists
  17-22: hands (pinky, index, thumb)

Lower Body (14 points):
  23-24: hips
  25-26: knees
  27-28: ankles
  29-30: heels
  31-32: foot index
```

## 🔧 Technical Details

### Requirements
- Modern browser (Chrome, Edge, Safari)
- Webcam access
- HTTPS or localhost (required for camera API)
- WebGL support (for GPU acceleration)

### Performance
- Target: 20-30 FPS on modern devices
- GPU accelerated with WebGL backend
- Temporal smoothing enabled for stable tracking
- Confidence threshold: 0.3 (filters low-quality detections)

### Model Configuration
```typescript
{
  runtime: "tfjs",           // TensorFlow.js (browser-based)
  modelType: "heavy",        // Best accuracy (vs "full" or "lite")
  enableSmoothing: true,     // Temporal smoothing for stability
  enableSegmentation: false, // Disabled to save memory
}
```

## 🎨 Visualization Features

### Skeleton Drawing
- Bones: Cyan lines connecting keypoints
- Joints: Colored circles at each keypoint
- Larger circles for major joints (shoulders, elbows, hips, knees)
- Smaller circles for minor points (face, hands, feet)

### Confidence-based Filtering
- Only shows keypoints with confidence ≥ 0.3
- Low-confidence points are hidden
- Prevents noisy/incorrect detections

## 🔍 Use Cases

### Physical Therapy
- Track patient movement during exercises
- Measure joint angles in 3D
- Detect form errors and asymmetry
- Monitor range of motion

### Fitness Training
- Real-time form correction
- Rep counting with phase detection
- Exercise classification
- Performance scoring

### Research & Development
- Pose estimation experiments
- Movement analysis
- Biomechanics studies
- ML model training data collection

## 🐛 Troubleshooting

### Camera Not Working
1. Check browser permissions (allow camera access)
2. Ensure you're on HTTPS or localhost
3. Try a different browser (Chrome recommended)
4. Check if another app is using the camera

### Low FPS
1. Close other browser tabs
2. Ensure GPU acceleration is enabled
3. Try reducing video resolution
4. Check CPU/GPU usage

### No Skeleton Visible
1. Ensure good lighting
2. Stand 1-2 meters from camera
3. Keep full body in frame
4. Avoid cluttered background

### Model Loading Fails
1. Check internet connection (model downloads on first use)
2. Clear browser cache
3. Try incognito/private mode
4. Check browser console for errors

## 📚 Integration with Main App

The demo uses the same BlazePose implementation as the main session page:
- `frontend/components/session/PoseCamera.tsx` - Full session component
- `frontend/lib/postureEngine.ts` - Pose analysis engine
- `frontend/app/demo-pose/page.tsx` - Simplified demo

To integrate BlazePose into your own component:
```typescript
import * as poseDetection from "@tensorflow-models/pose-detection";

// Create detector
const detector = await poseDetection.createDetector(
  poseDetection.SupportedModels.BlazePose,
  {
    runtime: "tfjs",
    modelType: "heavy",
    enableSmoothing: true,
  }
);

// Estimate poses
const poses = await detector.estimatePoses(videoElement, {
  maxPoses: 1,
  flipHorizontal: false,
  scoreThreshold: 0.3,
});

// Access keypoints
const keypoints = poses[0].keypoints3D; // 33 points with x, y, z
```

## 🎓 Learn More

- [BlazePose Paper](https://arxiv.org/abs/2006.10204)
- [TensorFlow.js Pose Detection](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)
- [MediaPipe BlazePose](https://google.github.io/mediapipe/solutions/pose.html)

---

**Built for Nakshatra Hackathon 2026**  
Healthcare Track · AI-Powered Rehabilitation
