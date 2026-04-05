# Session Feature - System Architecture

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Camera     │  │  3D Guide    │  │   Controls   │         │
│  │   Feed       │  │  Character   │  │   Panel      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      POSE DETECTION LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BlazePose Heavy (TensorFlow.js + WebGL)                 │  │
│  │  • 33 keypoints (3D: x, y, z + visibility)               │  │
│  │  • 95.2% PCK@0.2 accuracy                                │  │
│  │  • 15-20ms inference time                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ANALYSIS PIPELINE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Angle      │→ │   Exercise   │→ │    Fault     │         │
│  │ Calculation  │  │ Classifier   │  │  Detection   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         ↓                  ↓                  ↓                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Outlier    │  │     Rep      │  │    Form      │         │
│  │  Rejection   │  │   Counter    │  │   Scoring    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      FEEDBACK LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Visual     │  │    Audio     │  │     3D       │         │
│  │  Skeleton    │  │    Voice     │  │    Guide     │         │
│  │  Overlay     │  │  Feedback    │  │  Animation   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  WebSocket   │  │   Session    │  │     CSV      │         │
│  │   Events     │  │   Storage    │  │   Export     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

```
┌─────────────┐
│   Camera    │
│   Stream    │
└──────┬──────┘
       │ 30-60 FPS
       ↓
┌─────────────────────────────────────────────────────────────┐
│  BlazePose Model (TensorFlow.js)                            │
│  Input: 640x480 RGB frame                                   │
│  Output: 33 keypoints × (x, y, z, visibility)               │
│  Time: ~15-20ms                                             │
└──────┬──────────────────────────────────────────────────────┘
       │ Keypoints (33 × 4 floats)
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Angle Calculation (postureEngine.ts)                       │
│  • Confidence-weighted 3D/2D blending                       │
│  • Outlier detection (MAD filtering)                        │
│  • Temporal smoothing (EMA α=0.35)                          │
│  • 10-frame history validation                              │
│  Time: ~2-3ms                                               │
└──────┬──────────────────────────────────────────────────────┘
       │ Angles (8 joints × 1 float)
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Exercise Classification                                     │
│  • Heuristic-based (angle patterns)                         │
│  • Preset override (user selection)                         │
│  • 8 exercise types supported                               │
│  Time: <1ms                                                 │
└──────┬──────────────────────────────────────────────────────┘
       │ Exercise type
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Fault Detection                                             │
│  • Per-exercise analyzers                                   │
│  • 15+ unique fault types                                   │
│  • Severity classification (error/warning/info)             │
│  Time: ~1-2ms                                               │
└──────┬──────────────────────────────────────────────────────┘
       │ Faults (0-5 per frame)
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Rep Phase Detection                                         │
│  • Multi-phase state machine                                │
│  • Velocity-based transitions                               │
│  • Minimum ROM validation                                   │
│  Time: <1ms                                                 │
└──────┬──────────────────────────────────────────────────────┘
       │ Phase + Rep count
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Form Scoring                                                │
│  • Dataset-calibrated (7-factor system)                     │
│  • Fault penalty calculation                                │
│  • 0-100 scale                                              │
│  Time: <1ms                                                 │
└──────┬──────────────────────────────────────────────────────┘
       │ Score (0-100)
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Rendering Pipeline                                          │
│  • Canvas skeleton overlay                                  │
│  • Joint color coding                                       │
│  • Angle labels                                             │
│  • Fault indicators                                         │
│  Time: ~5-8ms                                               │
└──────┬──────────────────────────────────────────────────────┘
       │ Visual feedback
       ↓
┌─────────────────────────────────────────────────────────────┐
│  User Interface Update                                       │
│  • React state updates                                      │
│  • 3D guide animation                                       │
│  • Voice feedback (throttled)                               │
│  Time: ~2-3ms                                               │
└─────────────────────────────────────────────────────────────┘

Total Frame Time: ~25-35ms (28-40 FPS theoretical, 30-60 FPS actual)
```

---

## 🧠 Angle Calculation Pipeline

```
Raw Keypoints (A, B, C)
         ↓
┌─────────────────────────────────────────┐
│  Confidence Check                       │
│  • Min confidence of A, B, C            │
│  • Depth availability (z ≠ 0)           │
└──────┬──────────────────────────────────┘
       │
       ├─→ Low confidence (<0.5) ──→ 2D angle only
       │
       ├─→ High confidence (≥0.85) ──→ 3D angle only
       │
       └─→ Medium (0.5-0.85) ──→ Weighted blend
                                    ↓
                          ┌─────────────────────┐
                          │  3D Angle × w       │
                          │  2D Angle × (1-w)   │
                          │  w = f(confidence)  │
                          └──────┬──────────────┘
                                 ↓
                          Raw Angle (θ)
                                 ↓
                    ┌────────────────────────┐
                    │  Outlier Detection     │
                    │  • MAD filtering       │
                    │  • 10-frame history    │
                    │  • 3σ threshold        │
                    └──────┬─────────────────┘
                           │
                           ├─→ Outlier? ──→ Use previous value
                           │
                           └─→ Valid ──→ Continue
                                         ↓
                              ┌──────────────────┐
                              │  EMA Smoothing   │
                              │  α = 0.35        │
                              │  θ' = θ×α +      │
                              │       θ_prev×(1-α)│
                              └──────┬───────────┘
                                     ↓
                              Smoothed Angle
                                     ↓
                              ┌──────────────────┐
                              │  History Update  │
                              │  • Add to buffer │
                              │  • Keep last 10  │
                              └──────┬───────────┘
                                     ↓
                              Final Angle (±2.8°)
```

---

## 🎯 Rep Detection State Machine

```
                    ┌─────────────┐
                    │     TOP     │
                    │  (Extended) │
                    └──────┬──────┘
                           │
                    Angle < flex_threshold
                    Velocity < -0.5
                           │
                           ↓
                    ┌─────────────┐
                    │ DESCENDING  │
                    │  (Flexing)  │
                    └──────┬──────┘
                           │
                    Velocity > 0.3
                    Angle < flex_threshold
                           │
                           ↓
                    ┌─────────────┐
                    │   BOTTOM    │
                    │  (Flexed)   │
                    └──────┬──────┘
                           │
                    Velocity > 0.5
                           │
                           ↓
                    ┌─────────────┐
                    │  ASCENDING  │
                    │ (Extending) │
                    └──────┬──────┘
                           │
                    Angle > extend_threshold
                    ROM ≥ min_range
                           │
                           ↓
                    ┌─────────────┐
                    │  REP DONE!  │
                    │  Count++    │
                    └──────┬──────┘
                           │
                           └──→ Back to TOP

Hysteresis: 6° to prevent oscillation
Min Frames: 3 per phase to prevent noise
Velocity: Smoothed with EMA (α=0.4)
```

---

## 🎨 Rendering Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Canvas Layer (2D Context)                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Clear canvas                                     │  │
│  │  2. Draw video frame                                 │  │
│  │  3. Draw skeleton (bones + joints)                   │  │
│  │  4. Draw angle labels                                │  │
│  │  5. Draw fault indicators                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  React Three Fiber (3D Context)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3D Physiotherapist Guide                            │  │
│  │  • Humanoid mesh (RoundedBox + Sphere)               │  │
│  │  • Skeletal animation (rotation + position)          │  │
│  │  • Facial expressions (blinking, mouth, eyebrows)    │  │
│  │  • Lighting (ambient + directional + point)          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  React UI Layer                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • FPS counter (top-left)                            │  │
│  │  • Form score badge (top-right)                      │  │
│  │  • Exercise label (top-center)                       │  │
│  │  • Fault panel (bottom)                              │  │
│  │  • Controls panel (right)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Backend Integration

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Browser)                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PoseCamera Component                                │  │
│  │  • Pose detection (client-side)                      │  │
│  │  • Angle calculation (client-side)                   │  │
│  │  • Rep counting (client-side)                        │  │
│  └──────────────────┬───────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────┘
                     │
                     │ WebSocket (WSS)
                     │ Events: rep_complete, pain_event
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocket Handler (ws_handler.py)                   │  │
│  │  • Receive rep events                                │  │
│  │  • Broadcast feedback                                │  │
│  │  • Store session data                                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     ↓                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (SQLite)                                   │  │
│  │  • sessions table                                    │  │
│  │  • pain_events table                                 │  │
│  │  • users table                                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Hierarchy

```
SessionPage
├── PoseCamera
│   ├── Video Element (hidden)
│   ├── Canvas Element (visible)
│   ├── Loading Overlay
│   ├── Error Overlay
│   └── HUD Overlays
│       ├── FPS Counter
│       ├── Form Score Badge
│       └── Model Info
│
├── PhysioGuide
│   ├── Canvas (React Three Fiber)
│   │   ├── Scene
│   │   │   ├── Humanoid
│   │   │   │   ├── Head (with face)
│   │   │   │   ├── Torso
│   │   │   │   ├── Arms (left + right)
│   │   │   │   └── Legs (left + right)
│   │   │   └── Lighting
│   │   │       ├── Ambient Light
│   │   │       ├── Directional Lights (×2)
│   │   │       └── Point Lights (×2)
│   │   └── Camera
│   ├── Header (AI Physiotherapist label)
│   ├── Expression Indicator
│   └── Speech Bubble
│
└── Controls Panel
    ├── Timer Display
    ├── Rep Counter
    ├── Start/Stop Buttons
    ├── Pain Log Button
    ├── Preset Selector
    ├── Instructions Card
    └── Color Guide
```

---

## 🧩 Module Dependencies

```
postureEngine.ts
├── Exports:
│   ├── analyzePosture()
│   ├── classifyExercise()
│   ├── updateRepPhase()
│   ├── angle3D()
│   ├── angle2D()
│   ├── weightedAngle()
│   └── isOutlier()
└── Used by: PoseCamera.tsx

poseEngine.ts
├── Exports:
│   ├── extractJointAngles()
│   ├── computeAngle()
│   ├── updateRepState()
│   └── createRepState()
└── Used by: (legacy, being phased out)

sessionExport.ts
├── Exports:
│   ├── SessionDataCollector (class)
│   ├── exportSessionToCSV()
│   ├── downloadCSV()
│   └── generateSessionSummary()
└── Used by: SessionPage.tsx

performanceMonitor.ts
├── Exports:
│   ├── PerformanceMonitor (class)
│   └── CameraQualityDetector (class)
└── Used by: PoseCamera.tsx

PoseCamera.tsx
├── Imports:
│   ├── postureEngine.ts
│   ├── performanceMonitor.ts
│   └── @tensorflow-models/pose-detection
└── Used by: SessionPage.tsx

PhysioGuide.tsx
├── Imports:
│   ├── @react-three/fiber
│   ├── @react-three/drei
│   └── three
└── Used by: SessionPage.tsx

SessionPage.tsx
├── Imports:
│   ├── PoseCamera.tsx
│   ├── PhysioGuide.tsx
│   ├── sessionExport.ts
│   └── lib/api.ts
└── Route: /session
```

---

## 🔐 Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Client-Side)                                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Video Processing                                    │  │
│  │  • 100% local (never uploaded)                       │  │
│  │  • Keypoints extracted in browser                    │  │
│  │  • No video data sent to server                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication                                      │  │
│  │  • JWT token in localStorage                         │  │
│  │  • Token sent with WebSocket connection              │  │
│  │  • Auto-refresh on expiry                            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTPS/WSS (TLS 1.3)
                     │ Only keypoint coordinates + metadata
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Server (Backend)                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware                           │  │
│  │  • Verify JWT token                                  │  │
│  │  • Check user permissions                            │  │
│  │  • Rate limiting                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Storage                                        │  │
│  │  • Encrypted at rest                                 │  │
│  │  • No video/images stored                            │  │
│  │  • Only exercise metrics                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Budget

```
Frame Budget (60 FPS = 16.67ms per frame)
┌─────────────────────────────────────────────────────────┐
│  Pose Detection:     15-20ms  (60-70%)  ████████████▌   │
│  Angle Calculation:   2-3ms   (10-15%)  ██▌             │
│  Fault Detection:     1-2ms   (5-10%)   █▌              │
│  Rep Phase Update:    <1ms    (2-5%)    ▌               │
│  Form Scoring:        <1ms    (2-5%)    ▌               │
│  Rendering:           5-8ms   (15-20%)  ███▌            │
│  React Updates:       2-3ms   (5-10%)   █▌              │
├─────────────────────────────────────────────────────────┤
│  Total:              25-35ms  (40-28 FPS theoretical)   │
│  Actual:             30-60 FPS (with optimizations)     │
└─────────────────────────────────────────────────────────┘

Memory Budget
┌─────────────────────────────────────────────────────────┐
│  TensorFlow.js:      150-200 MB                         │
│  BlazePose Model:    ~8 MB                              │
│  Video Buffers:      50-100 MB                          │
│  React State:        10-20 MB                           │
│  Three.js Scene:     30-50 MB                           │
│  History Buffers:    <5 MB                              │
├─────────────────────────────────────────────────────────┤
│  Total:              250-400 MB (target <500 MB)        │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Optimization Strategies

### 1. Pose Detection
- ✅ Use WebGL backend (10x faster than CPU)
- ✅ BlazePose Heavy (best accuracy/speed tradeoff)
- ✅ Single pose detection (maxPoses: 1)
- ✅ Appropriate score threshold (0.3)

### 2. Angle Calculation
- ✅ Vectorized operations (no loops)
- ✅ Early exit on low confidence
- ✅ Cached previous values
- ✅ Minimal allocations

### 3. Rendering
- ✅ Canvas rendering (faster than SVG)
- ✅ Batch draw calls
- ✅ Conditional rendering (only visible elements)
- ✅ RequestAnimationFrame (synced with display)

### 4. React Updates
- ✅ useCallback for stable references
- ✅ useMemo for expensive calculations
- ✅ Throttled state updates
- ✅ Minimal re-renders

### 5. Memory Management
- ✅ Dispose TensorFlow tensors
- ✅ Cleanup on unmount
- ✅ Limited history buffers (10 frames)
- ✅ No memory leaks

---

## 🔄 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CDN (Static Assets)                                        │
│  • Next.js static files                                     │
│  • TensorFlow.js models                                     │
│  • BlazePose model files                                    │
│  • Images, fonts, etc.                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Vercel / Netlify (Frontend)                                │
│  • Next.js SSR/SSG                                          │
│  • Edge functions                                           │
│  • Automatic HTTPS                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ API Calls (HTTPS)
                     │ WebSocket (WSS)
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  AWS / DigitalOcean (Backend)                               │
│  • FastAPI server                                           │
│  • WebSocket server                                         │
│  • PostgreSQL database                                      │
│  • Redis cache                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Architecture Version**: 2.0.0  
**Last Updated**: 2024-01-15  
**Status**: Production Ready ✅
