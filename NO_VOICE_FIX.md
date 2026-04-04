# 🔇 No Voice? Let's Fix It!

## Quick Diagnosis (Do This First!)

### Step 1: Open Browser Console
Press **F12** (or Cmd+Option+J on Mac) to open Developer Tools

### Step 2: Copy & Paste This Code
```javascript
// Quick TTS Test
const test = new SpeechSynthesisUtterance("Testing voice");
test.onstart = () => console.log("✅ Voice started!");
test.onerror = (e) => console.error("❌ Error:", e.error);
window.speechSynthesis.speak(test);
```

### Step 3: Check Results

**If you hear "Testing voice":**
- ✅ TTS works! Issue is in the app code
- Jump to "App-Specific Fixes" below

**If you hear nothing:**
- ❌ TTS is blocked or unavailable
- Continue with "System Checks" below

---

## System Checks

### 1. Check System Volume
- [ ] System volume is not muted
- [ ] System volume is above 50%
- [ ] Correct audio output device selected

### 2. Check Browser Tab
- [ ] Browser tab is not muted (look for 🔇 icon on tab)
- [ ] Right-click tab → "Unmute site" if needed

### 3. Check Browser
- [ ] Using Chrome, Edge, or Safari (best support)
- [ ] Not using Firefox in private mode (TTS disabled)
- [ ] Not using old browser version

### 4. Check Permissions
- [ ] Browser has audio permissions
- [ ] No browser extensions blocking audio
- [ ] Try incognito/private mode to rule out extensions

### 5. Test Other Audio
- [ ] YouTube works in same browser
- [ ] System sounds work
- [ ] Other websites with audio work

---

## Browser-Specific Issues

### Chrome/Edge
**Issue:** Voices not loading
**Fix:**
```javascript
// In console, run:
window.speechSynthesis.getVoices();
// Wait 1 second, then run:
window.speechSynthesis.getVoices().length
// Should show number > 0
```

### Safari
**Issue:** Requires user interaction first
**Fix:** Click "Start Session" button (provides user gesture)

### Firefox
**Issue:** Limited voice support
**Fix:** 
1. Type `about:config` in address bar
2. Search for `media.webspeech.synth.enabled`
3. Set to `true`

---

## App-Specific Fixes

### Fix 1: Force Voice Loading

Add this to your browser console AFTER opening the session page:

```javascript
// Force reload voices
console.log("🔄 Forcing voice reload...");

window.speechSynthesis.cancel();

const loadVoices = () => {
  const voices = window.speechSynthesis.getVoices();
  console.log(`✅ Loaded ${voices.length} voices`);
  
  if (voices.length > 0) {
    // Test with first voice
    const test = new SpeechSynthesisUtterance("Voice system ready");
    test.voice = voices[0];
    test.onstart = () => console.log("✅ Speaking!");
    test.onerror = (e) => console.error("❌ Error:", e.error);
    window.speechSynthesis.speak(test);
  }
};

if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

loadVoices();
```

### Fix 2: Check Console Logs

Look for these in console when session starts:

**✅ Good signs:**
```
✅ TTS: Loaded 47 voices
  - Google US English (en-US)
  - Samantha (en-US)
🔊 Speaking with voice: Google US English
🔊 Started speaking: "Hey! I'm your AI physiotherapist..."
```

**❌ Bad signs:**
```
❌ Speech synthesis not available
⚠️ No voices available yet
❌ Speech synthesis error: synthesis-failed
```

### Fix 3: Manual Voice Test

In console, test the exact code your app uses:

```javascript
// Test PhysioGuide voice
function testVoice() {
  const text = "Hey! I'm your AI physiotherapist";
  const u = new SpeechSynthesisUtterance(text);
  
  u.rate = 1.1;
  u.pitch = 1.25;
  u.volume = 1.0;
  
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang.startsWith("en-US")) || voices[0];
  
  if (preferred) {
    u.voice = preferred;
    console.log("🔊 Using voice:", preferred.name);
  }
  
  u.onstart = () => console.log("✅ Started!");
  u.onend = () => console.log("✅ Ended!");
  u.onerror = (e) => console.error("❌ Error:", e.error);
  
  window.speechSynthesis.speak(u);
}

testVoice();
```

---

## Common Issues & Solutions

### Issue: "No voices available"
**Cause:** Voices not loaded yet
**Fix:** Wait 1-2 seconds after page load, then start session

### Issue: "synthesis-failed"
**Cause:** Browser/OS issue
**Fix:** 
1. Restart browser
2. Try different browser
3. Restart computer

### Issue: "audio-busy"
**Cause:** Another app using audio
**Fix:** Close other audio apps (Spotify, YouTube, etc.)

### Issue: "network"
**Cause:** Network voice failed
**Fix:** Use local voices or check internet

### Issue: Voices work in console but not in app
**Cause:** Timing issue - voices not loaded when app tries to speak
**Fix:** See "Fix 4" below

---

## Fix 4: Enhanced Voice Loading (Apply to Code)

If voices work in console but not in app, the issue is timing. Let me enhance the voice loading:

**File:** `frontend/components/session/PhysioGuide.tsx`

Find the `speak()` function and add this at the very beginning:

```typescript
function speak(text: string, emotion: "happy" | "warning" | "encouraging" | "neutral" = "neutral", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("❌ Speech synthesis not available");
    return;
  }
  
  // ✅ NEW: Force voice loading if not loaded
  if (!voicesLoaded) {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      voicesLoaded = true;
      console.log(`✅ TTS: Force-loaded ${voices.length} voices`);
    } else {
      console.warn("⚠️ Voices still not loaded, retrying...");
      setTimeout(() => speak(text, emotion, onEnd), 200);
      return;
    }
  }
  
  // ... rest of function
```

---

## Fix 5: Add Test Button

Add this to your session page to test TTS on demand:

```typescript
// Add this button to your session page UI
<button 
  onClick={() => {
    const test = new SpeechSynthesisUtterance("Testing voice system");
    test.onstart = () => console.log("✅ Voice works!");
    test.onerror = (e) => console.error("❌ Error:", e.error);
    window.speechSynthesis.speak(test);
  }}
  style={{
    position: 'fixed',
    bottom: 20,
    right: 20,
    padding: '10px 20px',
    background: '#0fffc5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    zIndex: 9999
  }}
>
  🔊 Test Voice
</button>
```

---

## Debugging Checklist

Run through this checklist:

1. [ ] Open browser console (F12)
2. [ ] Run quick TTS test (see Step 2 above)
3. [ ] Check for console logs when starting session
4. [ ] Look for "✅ TTS: Loaded X voices"
5. [ ] Look for "🔊 Speaking with voice: [name]"
6. [ ] Look for "🔊 Started speaking: [text]"
7. [ ] Check system volume
8. [ ] Check browser tab not muted
9. [ ] Try different browser
10. [ ] Try incognito mode

---

## Still No Voice?

### Last Resort Fixes:

**1. Clear Browser Cache**
```
Chrome: Ctrl+Shift+Delete → Clear cache
Safari: Cmd+Option+E
Firefox: Ctrl+Shift+Delete
```

**2. Reset Speech Synthesis**
```javascript
// In console:
window.speechSynthesis.cancel();
window.speechSynthesis.getVoices();
location.reload();
```

**3. Try Different Browser**
- Chrome (best support)
- Edge (good support)
- Safari (good on Mac)
- Avoid Firefox (limited support)

**4. Check OS Settings**
- **Mac:** System Preferences → Accessibility → Speech
- **Windows:** Settings → Time & Language → Speech
- **Linux:** Check espeak/festival installed

**5. Update Browser**
- Chrome: chrome://settings/help
- Edge: edge://settings/help
- Safari: App Store → Updates

---

## Expected Behavior

### When Working Correctly:

**Console logs:**
```
✅ TTS: Loaded 47 voices
  - Google US English (en-US)
  - Samantha (en-US)
  - Microsoft Zira Desktop (en-US)
🔊 Speaking with voice: Google US English
🔊 Started speaking: "Hey! I'm your AI physiotherapist. Let me show..."
ℹ️ Speech interrupted: "Watch my demonstration..."
🔊 Started speaking: "Now follow along with me..."
```

**What you hear:**
- Intro: "Hey! I'm your AI physiotherapist..."
- Instructions: "Watch my demonstration carefully..."
- Guidance: "Now follow along with me..."
- Corrections: "Bend your elbow more!"
- Praise: "Perfect form!"
- Reps: "Excellent! Rep 1 completed!"

---

## Quick Test Script

Copy this entire script into console:

```javascript
(async function quickTest() {
  console.log("🧪 Quick TTS Test Starting...\n");
  
  // 1. API Check
  if (!window.speechSynthesis) {
    console.error("❌ FAIL: Speech Synthesis not available");
    return;
  }
  console.log("✅ PASS: Speech Synthesis available");
  
  // 2. Voice Check
  let voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    console.log("⏳ Waiting for voices...");
    await new Promise(resolve => {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve();
      };
    });
  }
  
  if (voices.length === 0) {
    console.error("❌ FAIL: No voices available");
    return;
  }
  console.log(`✅ PASS: ${voices.length} voices available`);
  
  // 3. Speech Test
  console.log("🔊 Testing speech...");
  const test = new SpeechSynthesisUtterance("Voice test successful");
  test.voice = voices[0];
  
  const result = await new Promise((resolve) => {
    test.onstart = () => {
      console.log("✅ PASS: Speech started");
      resolve(true);
    };
    test.onerror = (e) => {
      console.error("❌ FAIL: Speech error:", e.error);
      resolve(false);
    };
    setTimeout(() => {
      console.error("❌ FAIL: Speech timeout");
      resolve(false);
    }, 3000);
    window.speechSynthesis.speak(test);
  });
  
  if (result) {
    console.log("\n🎉 SUCCESS: TTS is working!");
    console.log("💡 If you can't hear it, check system volume");
  } else {
    console.log("\n❌ FAILED: TTS is not working");
    console.log("💡 Try different browser or check OS settings");
  }
})();
```

---

## Contact Info

If none of these fixes work:

1. **Share console output** - Copy all console logs
2. **Share browser info** - What browser and version?
3. **Share OS info** - Mac, Windows, Linux?
4. **Share test results** - Did quick test work?

---

## Summary

Most common causes:
1. ✅ **System volume muted** - Check volume
2. ✅ **Browser tab muted** - Check tab icon
3. ✅ **Voices not loaded** - Wait 1-2 seconds
4. ✅ **Wrong browser** - Use Chrome
5. ✅ **No user gesture** - Click Start Session button

**Next steps:**
1. Run quick test in console
2. Check console logs
3. Verify system audio works
4. Try different browser
5. Apply Fix 4 if needed

Good luck! 🎉
