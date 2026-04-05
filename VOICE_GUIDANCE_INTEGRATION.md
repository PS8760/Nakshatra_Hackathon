# 🔊 Voice Guidance System - Integration Guide

## Overview

Complete clinical-grade voice guidance system with:
- ✅ Step-by-step audio instructions
- ✅ ML-based posture correction
- ✅ Smart cooldown (3-5 seconds)
- ✅ Priority-based queuing
- ✅ JSON exercise sequences
- ✅ Web Speech API integration

---

## Quick Start (5 Minutes)

### 1. Import the Libraries

```typescript
import { voiceEngine, speakStep } from '@/lib/voiceGuidance';
import { exerciseManager } from '@/lib/exerciseSequence';
import { correctPosture } from '@/lib/postureCorrection';
```

### 2. Load Exercises

```typescript
// Load from JSON file
await exerciseManager.loadExercises('/exercises.json');

// Or load from object
exerciseManager.loadExercisesFromObject([
  {
    id: 'my_exercise',
    name: 'My Exercise',
    description: 'Description',
    category: 'rehab',
    difficulty: 'beginner',
    duration: 120,
    steps: [
      {
        id: 'step_1',
        text: 'Lift your leg',
        audioText: 'Slowly lift your right leg',
        holdTime: 5,
      },
    ],
  },
]);
```

### 3. Start Exercise

```typescript
exerciseManager.startExercise(
  'my_exercise',
  (step, index) => {
    console.log(`Step ${index + 1}:`, step.text);
  },
  () => {
    console.log('Exercise complete!');
  }
);
```

### 4. Integrate ML Model

```typescript
// When your ML model detects an issue
const mlOutput = yourMLModel.predict(frame);

if (mlOutput.label === 'slouch' && mlOutput.confidence > 0.7) {
  correctPosture('slouch', mlOutput.confidence);
}
```

---

## Core Features

### 1. Voice Engine

**Basic Usage:**
```typescript
import { voiceEngine } from '@/lib/voiceGuidance';

// Simple speech
voiceEngine.speak({
  text: 'Hello, let\'s begin',
  priority: 'normal',
  emotion: 'neutral',
});

// With priority
voiceEngine.speak({
  text: 'Stop! Incorrect posture!',
  priority: 'critical',  // Interrupts current speech
  emotion: 'urgent',
});
```

**Priority Levels:**
- `critical` - Interrupts everything (safety alerts)
- `high` - Front of queue (posture corrections)
- `normal` - Regular queue (exercise steps)
- `low` - Skipped if already speaking (encouragement)

**Emotions:**
- `neutral` - Normal voice (rate: 1.0, pitch: 1.0)
- `encouraging` - Upbeat (rate: 1.1, pitch: 1.25)
- `warning` - Serious (rate: 0.9, pitch: 0.85)
- `urgent` - Alert (rate: 1.2, pitch: 1.4)

**Advanced:**
```typescript
voiceEngine.speak({
  text: 'Custom message',
  priority: 'high',
  emotion: 'warning',
  config: {
    rate: 0.95,
    pitch: 0.9,
    volume: 1.0,
    lang: 'en-US',
  },
  onStart: () => console.log('Started'),
  onEnd: () => console.log('Ended'),
  onError: (error) => console.error(error),
});
```

**Control:**
```typescript
voiceEngine.cancel();  // Stop all speech
voiceEngine.pause();   // Pause current
voiceEngine.resume();  // Resume paused
voiceEngine.setCooldown(5000);  // Set cooldown (ms)
```

---

### 2. Exercise Sequence Manager

**Load Exercises:**
```typescript
// From JSON file
await exerciseManager.loadExercises('/exercises.json');

// From object
exerciseManager.loadExercisesFromObject(exercises);
```

**Start Exercise:**
```typescript
exerciseManager.startExercise(
  'exercise_id',
  (step, index) => {
    // Called on each step change
    console.log(`Step ${index + 1}:`, step.text);
    updateUI(step);
  },
  () => {
    // Called on completion
    console.log('Exercise complete!');
    showCompletionScreen();
  }
);
```

**Control Exercise:**
```typescript
exerciseManager.pause();   // Pause
exerciseManager.resume();  // Resume
exerciseManager.stop();    // Stop
exerciseManager.nextStep(); // Manual next step
```

**Get Progress:**
```typescript
const progress = exerciseManager.getProgress();
console.log(progress.currentStepIndex);
console.log(progress.completedSteps);
console.log(progress.elapsedTime);
```

---

### 3. Posture Correction

**Single Correction:**
```typescript
import { correctPosture } from '@/lib/postureCorrection';

// When ML model detects issue
correctPosture('slouch', 0.85);  // label, confidence
```

**Batch Processing:**
```typescript
import { correctPostureBatch } from '@/lib/postureCorrection';

// Process multiple predictions
const predictions = [
  { label: 'slouch', confidence: 0.85 },
  { label: 'forward_head', confidence: 0.72 },
  { label: 'rounded_shoulders', confidence: 0.68 },
];

correctPostureBatch(predictions);
// Speaks highest priority correction only
```

**Built-in Posture Labels:**
- `slouch` - Rounded back
- `forward_head` - Head too far forward
- `rounded_shoulders` - Shoulders rolled forward
- `knee_valgus` - Knees caving in
- `excessive_arch` - Too much lower back arch
- `hip_shift` - Hips shifted to one side
- `elbow_flare` - Elbows too far from body
- `locked_knees` - Knees hyperextended
- `weight_forward` - Too much weight on toes
- `asymmetric` - Uneven stance

**Add Custom Rules:**
```typescript
import { postureCorrector } from '@/lib/postureCorrection';

postureCorrector.addCustomRule('custom_issue', {
  mlLabel: 'custom_issue',
  corrections: {
    mild: 'Minor correction message',
    moderate: 'Moderate correction message',
    severe: 'Severe correction message',
  },
  priority: 7,  // 1-10 (10 = most critical)
});
```

**Cooldown Control:**
```typescript
postureCorrector.setCooldown(5000);  // 5 seconds
postureCorrector.clearCooldowns();   // Clear all (testing)
```

---

## Exercise JSON Format

```json
{
  "exercises": [
    {
      "id": "unique_id",
      "name": "Exercise Name",
      "description": "Brief description",
      "category": "knee_rehab",
      "difficulty": "beginner",
      "duration": 180,
      "warmupSteps": [
        {
          "id": "warmup_1",
          "text": "Display text",
          "audioText": "Spoken text (optional)",
          "nextStepDelay": 4000
        }
      ],
      "steps": [
        {
          "id": "step_1",
          "text": "Display text",
          "audioText": "Spoken text",
          "duration": 10,
          "holdTime": 5,
          "repetitions": 10,
          "nextStepDelay": 3000
        }
      ],
      "cooldownSteps": [
        {
          "id": "cooldown_1",
          "text": "Relax",
          "audioText": "Take a deep breath and relax",
          "duration": 5
        }
      ]
    }
  ]
}
```

**Step Types:**

1. **Timed Step** (duration)
   ```json
   {
     "text": "Hold position",
     "duration": 10
   }
   ```
   Automatically advances after 10 seconds with countdown.

2. **Hold Step** (holdTime)
   ```json
   {
     "text": "Hold stretch",
     "holdTime": 5
   }
   ```
   Speaks "Hold for 5 seconds" with countdown.

3. **Repetition Step** (repetitions)
   ```json
   {
     "text": "Complete reps",
     "repetitions": 10
   }
   ```
   Waits for manual progression (rep counting).

4. **Auto-Advance Step** (nextStepDelay)
   ```json
   {
     "text": "Get ready",
     "nextStepDelay": 3000
   }
   ```
   Advances after 3 seconds.

---

## ML Model Integration

### Example: TensorFlow.js

```typescript
import * as tf from '@tensorflow/tfjs';
import { correctPosture } from '@/lib/postureCorrection';

// Load your model
const model = await tf.loadLayersModel('/model/model.json');

// Process frame
function processFrame(videoElement: HTMLVideoElement) {
  // Preprocess
  const tensor = tf.browser.fromPixels(videoElement)
    .resizeBilinear([224, 224])
    .expandDims(0)
    .div(255.0);

  // Predict
  const predictions = model.predict(tensor) as tf.Tensor;
  const data = await predictions.data();

  // Get top prediction
  const maxIndex = data.indexOf(Math.max(...Array.from(data)));
  const confidence = data[maxIndex];
  const label = LABELS[maxIndex];

  // Trigger correction
  if (confidence > 0.7) {
    correctPosture(label, confidence);
  }

  // Cleanup
  tensor.dispose();
  predictions.dispose();
}

// Run continuously
setInterval(() => processFrame(videoRef.current), 1000);
```

### Example: MediaPipe Pose

```typescript
import { Pose } from '@mediapipe/pose';
import { correctPosture } from '@/lib/postureCorrection';

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
});

pose.onResults((results) => {
  if (results.poseLandmarks) {
    // Analyze posture
    const issue = analyzePosture(results.poseLandmarks);
    
    if (issue) {
      correctPosture(issue.label, issue.confidence);
    }
  }
});

function analyzePosture(landmarks) {
  // Your posture analysis logic
  const shoulderAngle = calculateAngle(
    landmarks[11], // left shoulder
    landmarks[23], // left hip
    landmarks[25]  // left knee
  );

  if (shoulderAngle < 160) {
    return { label: 'slouch', confidence: 0.85 };
  }

  return null;
}
```

---

## React Component Integration

### Basic Component

```typescript
'use client';

import { useEffect, useState } from 'react';
import { exerciseManager } from '@/lib/exerciseSequence';
import { correctPosture } from '@/lib/postureCorrection';

export default function ExerciseSession() {
  const [currentStep, setCurrentStep] = useState(null);

  useEffect(() => {
    // Load exercises
    exerciseManager.loadExercises('/exercises.json');
  }, []);

  const startExercise = () => {
    exerciseManager.startExercise(
      'knee_flexion_basic',
      (step, index) => setCurrentStep(step),
      () => alert('Complete!')
    );
  };

  // Integrate with ML model
  useEffect(() => {
    const interval = setInterval(() => {
      // Your ML model prediction
      const prediction = yourMLModel.predict();
      
      if (prediction.confidence > 0.7) {
        correctPosture(prediction.label, prediction.confidence);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <button onClick={startExercise}>Start</button>
      {currentStep && <p>{currentStep.text}</p>}
    </div>
  );
}
```

---

## Smart Cooldown System

### How It Works

1. **Global Cooldown** (3-5 seconds)
   - Prevents any voice from overlapping
   - Configurable per engine

2. **Per-Label Cooldown**
   - Each posture issue has its own timer
   - Prevents repeating same correction

3. **Severity-Based Cooldown**
   - Mild: 8 seconds
   - Moderate: 5 seconds
   - Severe: 2 seconds (more urgent)

4. **Priority Override**
   - Critical priority interrupts everything
   - High priority goes to front of queue
   - Low priority skipped if busy

### Configuration

```typescript
// Voice engine cooldown
voiceEngine.setCooldown(3000);  // 3 seconds

// Posture correction cooldown
postureCorrector.setCooldown(5000);  // 5 seconds
```

---

## Testing

### Test Voice

```typescript
import { voiceEngine } from '@/lib/voiceGuidance';

voiceEngine.speak({
  text: 'Testing voice system',
  priority: 'normal',
  emotion: 'neutral',
});
```

### Test Exercise

```typescript
import { exerciseManager } from '@/lib/exerciseSequence';

// Load test exercise
exerciseManager.loadExercisesFromObject([{
  id: 'test',
  name: 'Test',
  description: 'Test exercise',
  category: 'test',
  difficulty: 'beginner',
  duration: 30,
  steps: [
    { id: '1', text: 'Step 1', audioText: 'First step', nextStepDelay: 3000 },
    { id: '2', text: 'Step 2', audioText: 'Second step', nextStepDelay: 3000 },
  ],
}]);

// Start
exerciseManager.startExercise('test');
```

### Test Posture Correction

```typescript
import { correctPosture } from '@/lib/postureCorrection';

// Test different severities
correctPosture('slouch', 0.6);  // Mild
correctPosture('slouch', 0.8);  // Moderate
correctPosture('slouch', 0.95); // Severe
```

---

## Browser Compatibility

✅ **Excellent:**
- Chrome 33+
- Edge 14+
- Safari 7+

⚠️ **Limited:**
- Firefox 49+ (fewer voices)

❌ **Not Supported:**
- IE 11 and below

---

## Troubleshooting

### No Voice Output

1. Check browser console for errors
2. Verify Speech Synthesis API available:
   ```javascript
   console.log(window.speechSynthesis);
   ```
3. Check system volume
4. Try different browser (Chrome recommended)

### Voice Cuts Off

- Already handled with smart cooldown
- Adjust cooldown if needed:
  ```typescript
  voiceEngine.setCooldown(5000);
  ```

### Corrections Too Frequent

- Increase cooldown:
  ```typescript
  postureCorrector.setCooldown(8000);
  ```
- Lower ML confidence threshold

### Steps Not Advancing

- Check exercise JSON format
- Verify step has duration, holdTime, or nextStepDelay
- Check console for errors

---

## Best Practices

1. **Cooldown Settings**
   - Voice: 3-5 seconds
   - Posture: 5-8 seconds
   - Adjust based on exercise pace

2. **ML Integration**
   - Run predictions every 1-2 seconds
   - Use confidence threshold (0.7+)
   - Batch process multiple predictions

3. **Exercise Design**
   - Clear, concise audio text
   - Appropriate step durations
   - Include warmup/cooldown

4. **User Experience**
   - Test with actual users
   - Adjust voice rate/pitch
   - Provide visual feedback too

---

## API Reference

See individual files for complete API:
- `frontend/lib/voiceGuidance.ts`
- `frontend/lib/exerciseSequence.ts`
- `frontend/lib/postureCorrection.ts`

---

## Support

For issues or questions:
1. Check console logs
2. Review this guide
3. Test with example component
4. Verify browser compatibility

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**License:** MIT
