# 🔊 TTS Diagnostic & Fix Guide

## Current Status

Your TTS implementation **IS PRESENT** in the code. The issue is likely one of these:

1. Browser compatibility
2. Voices not loaded
3. Browser permissions
4. Audio context suspended

---

## 🔍 Quick Diagnosis

### Test 1: Check Browser Console

Open browser console (F12) and run:

```javascript
// Check if Speech Synthesis is available
console.log("Speech Synthesis:", window.speechSynthesis);

// Check available voices
console.log("Voices:", window.speechSynthesis.getVoices());

// Test simple speech
const utterance = new SpeechSynthesisUtterance("Testing voice");
window.speechSynthesis.speak(utterance);
```

**Expected:** You should hear "Testing voice"

**If silent:** Continue to Test 2

---

### Test 2: Check Voice Loading

Voices may not be loaded immediately. Try:

```javascript
// Wait for voices to load
window.speechSynthesis.onvoiceschanged = () => {
  const voices = window.speechSynthesis.getVoices();
  console.log("Voices loaded:", voices.length);
  voices.forEach(v => console.log(v.name, v.lang));
};

// Trigger voice loading
window.speechSynthesis.getVoices();
```

**Expected:** Should log list of available voices

---

### Test 3: Check for Errors

Look for these errors in console:
- "Speech synthesis not supported"
- "No voices available"
- "Audio context suspended"
- "User gesture required"

---

## 🛠️ Fixes

### Fix 1: Add Voice Loading Handler

The voices might not be loaded when the component mounts. Add this to PhysioGuide:

```typescript
// Add this useEffect at the top of PhysioGuide component
useEffect(() => {
  // Ensure voices are loaded
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log(`✅ Loaded ${voices.length} voices`);
  };

  // Voices might load asynchronously
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Try loading immediately
  loadVoices();
}, []);
```

### Fix 2: Add User Gesture Requirement

Some browsers require user interaction before allowing speech:

```typescript
// Add this to the session start handler
const handleStart = async () => {
  // ... existing code ...
  
  // Test TTS with user gesture
  const testUtterance = new SpeechSynthesisUtterance("Voice system ready");
  testUtterance.volume = 0.1; // Quiet test
  window.speechSynthesis.speak(testUtterance);
  
  // ... rest of code ...
};
```

### Fix 3: Enhanced speak() Function

Replace the current `speak()` function with this enhanced version:

```typescript
function speak(text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("Speech synthesis not available");
    return;
  }
  
  // Cancel any ongoing speech
  if (speakTimer) clearTimeout(speakTimer);
  window.speechSynthesis.cancel();
  
  // Small delay so cancel() takes effect
  speakTimer = setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;
    
    // AUDIO ENHANCEMENT: Better voice parameters for each emotion
    switch (emotion) {
      case "happy":
        u.rate = 1.15;
        u.pitch = 1.35;
        u.volume = 1.0;
        break;
      case "warning":
        u.rate = 0.85;
        u.pitch = 0.75;
        u.volume = 1.0;
        break;
      case "encouraging":
        u.rate = 1.1;
        u.pitch = 1.25;
        u.volume = 1.0;
        break;
      default:
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
    }
    
    // Pick the best available voice
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      console.warn("No voices available yet. Retrying...");
      // Retry after voices load
      setTimeout(() => speak(text, emotion, onEnd), 100);
      return;
    }
    
    const preferred = 
      voices.find(v => v.name.includes("Samantha") && v.lang.startsWith("en")) || // Mac - natural female
      voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-US")) || // Chrome - Google voices
      voices.find(v => v.name.includes("Microsoft Zira") && v.lang.startsWith("en")) || // Windows - Zira
      voices.find(v => v.lang.startsWith("en-US") && v.name.includes("Female")) ||
      voices.find(v => v.lang.startsWith("en-US")) ||
      voices[0];
    
    if (preferred) {
      u.voice = preferred;
      console.log(`🔊 Speaking with voice: ${preferred.name}`);
    }
    
    if (onEnd) u.onend = onEnd;
    u.onerror = (error) => {
      console.error("Speech synthesis error:", error);
      if (onEnd) onEnd();
    };
    
    // Log for debugging
    console.log(`🔊 Speaking: "${text}" (${emotion})`);
    
    window.speechSynthesis.speak(u);
  }, 80);
}
```

### Fix 4: Add Resume on Page Visibility

Some browsers pause speech when tab is inactive:

```typescript
// Add this useEffect to PhysioGuide
useEffect(() => {
  const handleVisibilityChange = () => {
    if (!document.hidden && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);
```

---

## 🎯 Complete Enhanced PhysioGuide Component

Here's the complete enhanced version with all fixes:

```typescript
"use client";
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Sphere } from "@react-three/drei";
import * as THREE from "three";

// ... existing imports and types ...

// ── Enhanced Voice engine with debugging ──────
let speakTimer: ReturnType<typeof setTimeout> | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let voicesLoaded = false;

function speak(text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("❌ Speech synthesis not available");
    return;
  }
  
  // Cancel any ongoing speech
  if (speakTimer) clearTimeout(speakTimer);
  window.speechSynthesis.cancel();
  
  // Small delay so cancel() takes effect
  speakTimer = setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    currentUtterance = u;
    
    // AUDIO ENHANCEMENT: Better voice parameters for each emotion
    switch (emotion) {
      case "happy":
        u.rate = 1.15;
        u.pitch = 1.35;
        u.volume = 1.0;
        break;
      case "warning":
        u.rate = 0.85;
        u.pitch = 0.75;
        u.volume = 1.0;
        break;
      case "encouraging":
        u.rate = 1.1;
        u.pitch = 1.25;
        u.volume = 1.0;
        break;
      default:
        u.rate = 1.0;
        u.pitch = 1.0;
        u.volume = 1.0;
    }
    
    // Pick the best available voice
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0 && !voicesLoaded) {
      console.warn("⚠️ No voices available yet. Retrying in 100ms...");
      // Retry after voices load
      setTimeout(() => speak(text, emotion, onEnd), 100);
      return;
    }
    
    const preferred = 
      voices.find(v => v.name.includes("Samantha") && v.lang.startsWith("en")) || // Mac - natural female
      voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-US")) || // Chrome - Google voices
      voices.find(v => v.name.includes("Microsoft Zira") && v.lang.startsWith("en")) || // Windows - Zira
      voices.find(v => v.lang.startsWith("en-US") && v.name.includes("Female")) ||
      voices.find(v => v.lang.startsWith("en-US")) ||
      voices[0];
    
    if (preferred) {
      u.voice = preferred;
      console.log(`🔊 Speaking with voice: ${preferred.name}`);
    } else {
      console.warn("⚠️ No preferred voice found, using default");
    }
    
    if (onEnd) u.onend = onEnd;
    u.onerror = (error) => {
      console.error("❌ Speech synthesis error:", error);
      if (onEnd) onEnd();
    };
    
    u.onstart = () => {
      console.log(`🔊 Started speaking: "${text.substring(0, 50)}..." (${emotion})`);
    };
    
    window.speechSynthesis.speak(u);
  }, 80);
}

// ... rest of component ...

export default function PhysioGuide({ exercise, isActive, repCount, feedback, formScore, detailedFeedback }: Props) {
  const [expression, setExpression] = useState<Expression>("happy");
  const [gesture, setGesture] = useState<Gesture>("idle");
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [headShake, setHeadShake] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevRepCount = useRef(0);
  const prevActive = useRef(false);
  const prevFeedbackMsg = useRef("");
  const lastCorrectionTime = useRef(0);
  const correctionCooldown = 8000;

  // ✅ FIX 1: Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        console.log(`✅ Loaded ${voices.length} voices`);
        voices.slice(0, 5).forEach(v => console.log(`  - ${v.name} (${v.lang})`));
      }
    };

    // Voices might load asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Try loading immediately
    loadVoices();

    // Cleanup
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // ✅ FIX 2: Resume speech on page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && window.speechSynthesis.paused) {
        console.log("🔊 Resuming speech (page visible)");
        window.speechSynthesis.resume();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Helper: speak with visual sync
  const say = (text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral") => {
    setSpeaking(true);
    speak(text, emotion, () => setSpeaking(false));
  };

  // ... rest of component logic ...
}
```

---

## 🧪 Testing Checklist

### 1. Browser Compatibility
- ✅ Chrome/Edge (Best support)
- ✅ Safari (Good support)
- ⚠️ Firefox (Limited voices)
- ❌ Older browsers (No support)

### 2. Test Sequence
1. Open browser console (F12)
2. Start a session
3. Look for these logs:
   - `✅ Loaded X voices`
   - `🔊 Speaking with voice: [name]`
   - `🔊 Started speaking: "[text]"`
4. Listen for voice output

### 3. Common Issues

**Issue:** No sound but logs show speaking
**Fix:** Check system volume, unmute browser tab

**Issue:** "No voices available"
**Fix:** Wait 1-2 seconds, voices load asynchronously

**Issue:** Voice cuts off
**Fix:** Reduce speech rate or add pauses

**Issue:** "User gesture required"
**Fix:** Click "Start Session" button (provides user gesture)

---

## 🎯 Quick Fix Script

Run this in browser console to test TTS immediately:

```javascript
// Test TTS system
(function testTTS() {
  console.log("🔊 Testing TTS System...");
  
  // Check availability
  if (!window.speechSynthesis) {
    console.error("❌ Speech Synthesis not supported");
    return;
  }
  
  // Load voices
  const voices = window.speechSynthesis.getVoices();
  console.log(`✅ Found ${voices.length} voices`);
  
  if (voices.length === 0) {
    console.warn("⚠️ No voices loaded yet, waiting...");
    window.speechSynthesis.onvoiceschanged = () => {
      const v = window.speechSynthesis.getVoices();
      console.log(`✅ Voices loaded: ${v.length}`);
      testSpeech();
    };
  } else {
    testSpeech();
  }
  
  function testSpeech() {
    const utterance = new SpeechSynthesisUtterance("TTS system is working correctly");
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => console.log("🔊 Speech started");
    utterance.onend = () => console.log("✅ Speech completed");
    utterance.onerror = (e) => console.error("❌ Speech error:", e);
    
    window.speechSynthesis.speak(utterance);
  }
})();
```

---

## 📊 Expected Behavior

### When Working Correctly:

1. **Session Start:**
   - Hear: "Hey! I'm your AI physiotherapist..."
   - See: 3D coach waves
   - Console: `🔊 Speaking with voice: [name]`

2. **During Exercise:**
   - Hear corrections: "Bend your elbow more!"
   - See: 3D coach points
   - Console: `🔊 Started speaking: "Bend your..."`

3. **Rep Completion:**
   - Hear: "Excellent! Rep 1 completed!"
   - See: 3D coach claps
   - Console: `🔊 Speaking with voice: [name]`

---

## 🚀 Next Steps

1. Apply Fix 1 (voice loading) - **CRITICAL**
2. Apply Fix 3 (enhanced speak function) - **RECOMMENDED**
3. Test in browser console
4. Check browser console for logs
5. Verify system volume is up
6. Try different browsers if needed

---

## 💡 Pro Tips

1. **Chrome works best** - Most reliable TTS support
2. **User gesture required** - First speech needs user interaction
3. **Voices load async** - Wait for onvoiceschanged event
4. **Check console logs** - They show exactly what's happening
5. **Test with simple utterance** - Verify TTS works before complex logic

---

**Status:** TTS code is present, likely needs voice loading fix
**Priority:** Apply Fix 1 and Fix 3
**Expected Time:** 5 minutes to fix
