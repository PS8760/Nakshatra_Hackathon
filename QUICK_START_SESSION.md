# Quick Start Guide - Session Feature

## 🚀 Getting Started in 5 Minutes

### 1. Start the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Access the Session
Navigate to: `http://localhost:3000/session`

---

## 🎯 Key Features at a Glance

### Real-Time Pose Detection
- **Model**: BlazePose Heavy (33 keypoints, 3D)
- **Accuracy**: 95%+ joint angle accuracy
- **Performance**: 60 FPS target
- **Latency**: <50ms end-to-end

### Exercise Support
| Exercise | Primary Joints | Target ROM |
|----------|---------------|------------|
| Squat | Knee, Hip | 90° knee flexion |
| Lunge | Knee, Hip | 90° front knee |
| Shoulder Press | Shoulder, Elbow | 170° extension |
| Bicep Curl | Elbow | 45° flexion |
| Lateral Raise | Shoulder | 90° abduction |
| Hip Abduction | Hip | 45° abduction |

### Form Scoring
- **0-100 scale** (dataset-calibrated)
- **Excellent**: ≥92 (top 25%)
- **Good**: ≥77 (median)
- **Fair**: ≥60
- **Needs Work**: <60

---

## 🔧 Common Tasks

### Change Exercise Type
```typescript
// In session page
const [preset, setPreset] = useState(JOINT_PRESETS[0]);

// User selects different preset
setPreset(JOINT_PRESETS.find(p => p.id === "knee"));
```

### Export Session Data
```typescript
import { SessionDataCollector } from "@/lib/sessionExport";

const collector = new SessionDataCollector(sessionId, "squat");

// Record each rep
collector.recordRep(repNumber, phase, angles, formScore, faults);

// Download CSV at end
collector.downloadCSV();
```

### Monitor Performance
```typescript
import { PerformanceMonitor } from "@/lib/performanceMonitor";

const monitor = new PerformanceMonitor();

// In render loop
monitor.recordFrame({ total, pose, analysis, draw });

// Check metrics
const metrics = monitor.getMetrics();
console.log(`FPS: ${metrics.fps}`);
```

### Customize Fault Detection
```typescript
// In postureEngine.ts
function analyzeSquat(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];
  
  // Add custom fault check
  if (angles["knee_left"] < 60) {
    faults.push({
      severity: "warning",
      fault: "too_deep",
      message: "Don't go too deep — protect your knees",
      joint: "knee",
    });
  }
  
  return faults;
}
```

---

## 🐛 Troubleshooting

### Low FPS (<30)
1. Check console for performance warnings
2. Close other browser tabs
3. Reduce video quality in camera settings
4. System will auto-switch to "balanced" or "low" mode

### Inaccurate Angles
1. Ensure good lighting (not too dark/bright)
2. Stand 1-2 meters from camera
3. Keep full body visible in frame
4. Clean camera lens
5. Check console for low confidence warnings

### Rep Not Counting
1. Ensure full range of motion (check target angles)
2. Move slowly and deliberately
3. Check phase indicator (should cycle: top → descending → bottom → ascending)
4. Verify exercise type is correct

### Camera Not Working
1. Grant camera permissions in browser
2. Use HTTPS or localhost (required for camera access)
3. Check if camera is in use by another app
4. Try different browser (Chrome/Edge recommended)

---

## 📊 Performance Benchmarks

### Target Devices
| Device | FPS | Quality | Notes |
|--------|-----|---------|-------|
| High-end Desktop | 60 | High | Full features |
| Mid-range Laptop | 45-60 | High/Balanced | Occasional drops |
| Low-end Laptop | 30-45 | Balanced/Low | Reduced quality |
| Tablet (iPad Pro) | 50-60 | High | Excellent |
| Phone (flagship) | 40-50 | Balanced | Good |

### Timing Breakdown (Typical)
- **Pose Detection**: 15-20ms (60-70% of frame time)
- **Analysis**: 3-5ms (10-15%)
- **Rendering**: 5-8ms (15-20%)
- **Total**: 23-33ms (30-43 FPS)

---

## 🎨 Customization

### Change Colors
```typescript
// In PoseCamera.tsx
const FAULT_COLOR: Record<string, string> = {
  error: "#ef4444",    // Red
  warning: "#eab308",  // Yellow
  info: "#60a5fa",     // Blue
};
```

### Adjust Smoothing
```typescript
// In postureEngine.ts
const SMOOTH = 0.35; // Lower = more responsive, Higher = smoother
```

### Modify Rep Thresholds
```typescript
// In postureEngine.ts
const THRESHOLDS = {
  squat: { flex: 115, extend: 158, minRange: 30 },
  // Adjust these values per exercise
};
```

### Change Voice Settings
```typescript
// In PhysioGuide.tsx
const speak = (text: string, emotion: "happy" | "warning" | "encouraging") => {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = emotion === "happy" ? 1.15 : 1.0;
  u.pitch = emotion === "happy" ? 1.3 : 1.0;
  window.speechSynthesis.speak(u);
};
```

---

## 📈 Analytics & Insights

### Session Metrics
```typescript
const sessionData = collector.getSessionData();

console.log(`Total Reps: ${sessionData.totalReps}`);
console.log(`Avg Score: ${sessionData.averageFormScore}`);
console.log(`Best Rep: #${sessionData.summary.bestRep}`);
console.log(`Most Common Fault: ${sessionData.summary.mostCommonFault}`);
```

### Angle Analysis
```typescript
const angleRanges = sessionData.summary.angleRanges;

for (const [joint, range] of Object.entries(angleRanges)) {
  console.log(`${joint}: ${range.min}° - ${range.max}° (avg: ${range.avg}°)`);
}
```

### Fault Frequency
```typescript
const faultFreq = sessionData.summary.faultFrequency;

for (const [fault, count] of Object.entries(faultFreq)) {
  const pct = (count / sessionData.totalReps) * 100;
  console.log(`${fault}: ${count} times (${pct.toFixed(1)}%)`);
}
```

---

## 🔐 Security & Privacy

### Data Handling
- **Video**: Processed locally in browser, never uploaded
- **Keypoints**: Only coordinates sent to backend (no images)
- **Session Data**: Stored in backend database
- **CSV Export**: Generated client-side, user controls download

### Permissions
- **Camera**: Required for pose detection
- **Microphone**: Not used
- **Storage**: LocalStorage for auth token only

---

## 🚦 Status Indicators

### FPS Counter
- **Green**: ≥30 FPS (good)
- **Yellow**: 20-30 FPS (acceptable)
- **Red**: <20 FPS (poor)

### Form Score Badge
- **Green**: ≥85 (excellent/good)
- **Yellow**: 60-85 (fair)
- **Red**: <60 (needs work)

### Joint Colors
- **Green**: Perfect form
- **Yellow**: Minor deviation
- **Red**: Major fault
- **Gray**: Not visible

---

## 📚 Additional Resources

- **Full Documentation**: `SESSION_IMPROVEMENTS.md`
- **Enhancement Plan**: `SESSION_ENHANCEMENT_PLAN.md`
- **API Reference**: `backend/app/routers/`
- **Type Definitions**: `frontend/types/index.ts`

---

## 💡 Pro Tips

1. **Lighting**: Natural light from front/side is best
2. **Distance**: 1.5-2 meters from camera is optimal
3. **Clothing**: Fitted clothing helps tracking accuracy
4. **Background**: Plain background improves detection
5. **Warm-up**: Do 2-3 practice reps before starting session
6. **Calibration**: First rep is used for baseline, make it good!
7. **Consistency**: Same camera position for all sessions
8. **Export Data**: Download CSV after each session for progress tracking

---

## 🎯 Quick Commands

```bash
# Run tests
npm test

# Check diagnostics
npm run lint

# Build for production
npm run build

# Start production server
npm start

# View performance report (in browser console)
monitor.getPerformanceReport()

# Export session data
collector.downloadCSV()
```

---

**Need Help?** Check the console for detailed error messages and performance warnings.

**Found a Bug?** Export your session data and include it in the bug report.

**Want to Contribute?** See `SESSION_ENHANCEMENT_PLAN.md` for roadmap.
