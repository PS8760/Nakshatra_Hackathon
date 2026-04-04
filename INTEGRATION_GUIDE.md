# Session Report Integration Guide

## Quick Start

### Step 1: Import the SessionReport Component

Add to your session page (`frontend/app/session/page.tsx`):

```typescript
import SessionReport from "@/components/session/SessionReport";
import { SessionMetrics } from "@/lib/sessionReport";
```

### Step 2: Add State for Report

```typescript
const [showReport, setShowReport] = useState(false);
const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
```

### Step 3: Collect Metrics During Session

The PoseCamera component now automatically tracks all metrics. When ending the session:

```typescript
const handleEnd = async () => {
  if (!sessionId || ending) return;
  setEnding(true);

  // Get metrics from PoseCamera (you'll need to expose this method)
  const metrics: SessionMetrics = {
    sessionId,
    duration: Math.floor((Date.now() - startTime) / 1000),
    totalReps: repCount,
    avgFormScore: physScores.length 
      ? physScores.reduce((a, b) => a + b, 0) / physScores.length 
      : 0,
    peakFormScore: physScores.length ? Math.max(...physScores) : 0,
    lowestFormScore: physScores.length ? Math.min(...physScores) : 0,
    painEvents: [], // Collect from pain logging
    jointAngles: {}, // Collected by PoseCamera
    exerciseType: preset.label,
    completionRate: 100,
  };

  setSessionMetrics(metrics);
  setShowReport(true);
  setIsActive(false);
  setEnding(false);
};
```

### Step 4: Render the Report

```typescript
return (
  <div>
    {/* Your existing session UI */}
    
    {/* Session Report Modal */}
    {showReport && sessionMetrics && (
      <SessionReport
        metrics={sessionMetrics}
        token={token!}
        onClose={() => {
          setShowReport(false);
          router.push("/dashboard");
        }}
      />
    )}
  </div>
);
```

---

## Complete Example

Here's a complete example of the session end flow:

```typescript
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import PoseCamera from "@/components/session/PoseCamera";
import PhysioGuide from "@/components/session/PhysioGuide";
import SessionReport from "@/components/session/SessionReport";
import { SessionMetrics } from "@/lib/sessionReport";

export default function SessionPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics | null>(null);
  
  // Track session data
  const startTimeRef = useRef<number>(0);
  const repCountRef = useRef<number>(0);
  const formScoresRef = useRef<number[]>([]);
  const painEventsRef = useRef<any[]>([]);

  const handleStart = async () => {
    // Start session logic
    startTimeRef.current = Date.now();
    repCountRef.current = 0;
    formScoresRef.current = [];
    painEventsRef.current = [];
    setIsActive(true);
  };

  const handleRepComplete = (joint: string, angle: number, count: number) => {
    repCountRef.current = count;
  };

  const handleFormScore = (score: number) => {
    formScoresRef.current.push(score);
  };

  const handlePainLog = (joint: string, intensity: number) => {
    painEventsRef.current.push({
      joint,
      intensity,
      timestamp: Date.now(),
    });
  };

  const handleEnd = () => {
    // Calculate metrics
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const formScores = formScoresRef.current;

    const metrics: SessionMetrics = {
      sessionId: sessionId!,
      duration,
      totalReps: repCountRef.current,
      avgFormScore: formScores.length 
        ? formScores.reduce((a, b) => a + b, 0) / formScores.length 
        : 0,
      peakFormScore: formScores.length ? Math.max(...formScores) : 0,
      lowestFormScore: formScores.length ? Math.min(...formScores) : 0,
      painEvents: painEventsRef.current,
      jointAngles: {}, // Collected by PoseCamera
      exerciseType: "Full Body",
      completionRate: 100,
    };

    setSessionMetrics(metrics);
    setShowReport(true);
    setIsActive(false);
  };

  return (
    <div>
      {/* Session UI */}
      <div className="grid grid-cols-3 gap-4">
        {/* Camera */}
        <div>
          {isActive && (
            <PoseCamera
              sessionId={sessionId!}
              token="your-token"
              onRepComplete={handleRepComplete}
              onFormScore={handleFormScore}
            />
          )}
        </div>

        {/* 3D Guide */}
        <div>
          <PhysioGuide
            exercise="squat"
            isActive={isActive}
            repCount={repCountRef.current}
            feedback={null}
            formScore={formScoresRef.current[formScoresRef.current.length - 1] || null}
          />
        </div>

        {/* Controls */}
        <div>
          {!isActive ? (
            <button onClick={handleStart}>Start Session</button>
          ) : (
            <button onClick={handleEnd}>End Session</button>
          )}
          
          <button onClick={() => handlePainLog("knee_left", 5)}>
            Log Pain
          </button>
        </div>
      </div>

      {/* Session Report */}
      {showReport && sessionMetrics && (
        <SessionReport
          metrics={sessionMetrics}
          token="your-token"
          onClose={() => {
            setShowReport(false);
            router.push("/dashboard");
          }}
        />
      )}
    </div>
  );
}
```

---

## Features Available

### 1. Automatic Analysis
- Performance rating (Excellent/Good/Fair/Needs Improvement)
- Strengths identification
- Areas for improvement
- Personalized recommendations
- Risk assessment

### 2. Doctor Recommendations
- Automatically shown if high risk detected
- Location-based search
- Top 5 nearest doctors
- Specialty filtering
- Available appointment slots

### 3. Report Actions
- Save to user history
- Download as text file
- View doctor details
- Optional doctor search

---

## API Integration

### Save Report to Backend

The SessionReport component automatically calls:

```typescript
await saveSessionReport(sessionId, metrics, analysis, token);
```

This POSTs to: `POST /api/sessions/{sessionId}/report`

Expected backend endpoint:

```python
@router.post("/sessions/{session_id}/report")
async def save_session_report(
    session_id: int,
    report: SessionReportCreate,
    current_user: User = Depends(get_current_user)
):
    # Save report to database
    # Return success response
    return {"message": "Report saved successfully"}
```

### Get Session History

```typescript
const history = await getSessionHistory(token);
```

This GETs from: `GET /api/sessions/history`

Expected backend endpoint:

```python
@router.get("/sessions/history")
async def get_session_history(
    current_user: User = Depends(get_current_user)
):
    # Fetch user's session reports
    # Return list of reports
    return reports
```

---

## Customization

### Adjust Analysis Thresholds

Edit `frontend/lib/sessionReport.ts`:

```typescript
// Performance thresholds
if (metrics.avgFormScore >= 85) {
  analysis.overallPerformance = "excellent";
} else if (metrics.avgFormScore >= 70) {
  analysis.overallPerformance = "good";
}

// Pain thresholds
const highPainEvents = metrics.painEvents.filter((e) => e.intensity >= 7);
```

### Customize Doctor Search

Edit `getNearbyDoctors()` in `frontend/lib/sessionReport.ts`:

```typescript
// Integrate with real API
const response = await fetch(
  `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=doctor&keyword=physiotherapy`
);
```

### Modify Report UI

Edit `frontend/components/session/SessionReport.tsx`:

```typescript
// Change colors
const performanceColor = analysis.overallPerformance === "excellent"
  ? "#your-color"
  : "#default-color";

// Add sections
<div className="custom-section">
  {/* Your custom content */}
</div>
```

---

## Testing

### Test Session Report

```typescript
// Mock metrics
const testMetrics: SessionMetrics = {
  sessionId: 1,
  duration: 600, // 10 minutes
  totalReps: 25,
  avgFormScore: 82,
  peakFormScore: 95,
  lowestFormScore: 65,
  painEvents: [
    { joint: "knee_left", intensity: 4, timestamp: Date.now() }
  ],
  jointAngles: {
    rightElbow: [160, 45, 160, 45],
    leftKnee: [170, 90, 170, 90],
  },
  exerciseType: "Squat",
  completionRate: 95,
};

// Render report
<SessionReport
  metrics={testMetrics}
  token="test-token"
  onClose={() => console.log("Closed")}
/>
```

### Test Doctor Search

```typescript
import { getNearbyDoctors } from "@/lib/sessionReport";

// Test with coordinates
const doctors = await getNearbyDoctors(37.7749, -122.4194); // San Francisco
console.log(doctors);
```

---

## Troubleshooting

### Report Not Showing
- Check that `sessionMetrics` is not null
- Verify `showReport` state is true
- Check console for errors

### Doctors Not Loading
- Verify geolocation permission granted
- Check network requests in DevTools
- Fallback to default location if needed

### Metrics Incomplete
- Ensure PoseCamera is tracking metrics
- Verify callbacks are being called
- Check refs are being updated

---

## Summary

The Session Report system provides:

1. ✅ Comprehensive session analysis
2. ✅ AI-powered insights
3. ✅ Doctor recommendations
4. ✅ Progress tracking
5. ✅ Easy integration

Simply collect metrics during the session and pass them to the SessionReport component when the session ends!
