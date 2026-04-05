# 🔊 Voice Guidance - Quick Reference

## 30-Second Setup

```typescript
// 1. Import
import { voiceEngine } from '@/lib/voiceGuidance';
import { exerciseManager } from '@/lib/exerciseSequence';
import { correctPosture } from '@/lib/postureCorrection';

// 2. Load exercises
await exerciseManager.loadExercises('/exercises.json');

// 3. Start exercise
exerciseManager.startExercise('exercise_id');

// 4. Integrate ML model
if (mlOutput.label === 'slouch' && mlOutput.confidence > 0.7) {
  correctPosture('slouch', mlOutput.confidence);
}
```

---

## Common Tasks

### Speak Text
```typescript
voiceEngine.speak({
  text: 'Your message',
  priority: 'normal',  // critical | high | normal | low
  emotion: 'neutral',  // neutral | encouraging | warning | urgent
});
```

### Exercise Steps
```typescript
// Auto-advance after 3s
{ text: "Get ready", nextStepDelay: 3000 }

// Countdown from 10s
{ text: "Hold position", duration: 10 }

// Hold for 5s with countdown
{ text: "Hold stretch", holdTime: 5 }

// Wait for reps
{ text: "Complete 10 reps", repetitions: 10 }
```

### Posture Correction
```typescript
// Single
correctPosture('slouch', 0.85);

// Batch (speaks highest priority only)
correctPostureBatch([
  { label: 'slouch', confidence: 0.85 },
  { label: 'forward_head', confidence: 0.72 },
]);
```

---

## Built-in Posture Labels

| Label | Description |
|-------|-------------|
| `slouch` | Rounded back |
| `forward_head` | Head too far forward |
| `rounded_shoulders` | Shoulders rolled forward |
| `knee_valgus` | Knees caving in |
| `excessive_arch` | Too much lower back arch |
| `hip_shift` | Hips shifted to one side |
| `elbow_flare` | Elbows too far from body |
| `locked_knees` | Knees hyperextended |
| `weight_forward` | Too much weight on toes |
| `asymmetric` | Uneven stance |

---

## Priority Levels

| Priority | Behavior | Use For |
|----------|----------|---------|
| `critical` | Interrupts everything | Safety alerts |
| `high` | Front of queue | Posture corrections |
| `normal` | Regular queue | Exercise steps |
| `low` | Skipped if busy | Encouragement |

---

## Cooldown Settings

```typescript
// Voice engine (default: 3s)
voiceEngine.setCooldown(5000);

// Posture corrections (default: 5s)
postureCorrector.setCooldown(8000);
```

**Severity-based cooldowns:**
- Mild: 8 seconds
- Moderate: 5 seconds
- Severe: 2 seconds

---

## Control Functions

```typescript
// Voice
voiceEngine.cancel();  // Stop all
voiceEngine.pause();   // Pause
voiceEngine.resume();  // Resume

// Exercise
exerciseManager.pause();
exerciseManager.resume();
exerciseManager.stop();
exerciseManager.nextStep();  // Manual advance
```

---

## ML Integration Pattern

```typescript
// Run every 1-2 seconds
setInterval(() => {
  const prediction = yourMLModel.predict(frame);
  
  if (prediction.confidence > 0.7) {
    correctPosture(prediction.label, prediction.confidence);
  }
}, 1000);
```

---

## Files Created

1. `frontend/lib/voiceGuidance.ts` - Core voice engine
2. `frontend/lib/exerciseSequence.ts` - Exercise manager
3. `frontend/lib/postureCorrection.ts` - Posture system
4. `frontend/public/exercises.json` - Example exercises
5. `frontend/components/VoiceGuidedExercise.tsx` - Example component

---

## Testing

```typescript
// Test voice
voiceEngine.speak({ text: 'Test', priority: 'normal' });

// Test posture
correctPosture('slouch', 0.85);

// Test exercise
exerciseManager.startExercise('knee_flexion_basic');
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No sound | Check volume, browser tab not muted |
| Voice cuts off | Increase cooldown |
| Too many corrections | Increase cooldown, lower ML threshold |
| Steps don't advance | Check JSON format, add duration/delay |

---

**Full Guide:** `VOICE_GUIDANCE_INTEGRATION.md`
