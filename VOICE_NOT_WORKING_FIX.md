# 🔇 Voice Not Working - Immediate Fix

## Problem

The voice guidance system I created is separate from your existing PhysioGuide component. They're not connected yet.

## Quick Diagnosis

### Step 1: Test if Browser Supports Voice

Visit this page in your browser:
```
http://localhost:3000/test-voice
```

Click "🔊 Test Basic Speech" button.

**If you hear voice:** ✅ Browser works, issue is integration
**If no voice:** ❌ Browser/system issue (see troubleshooting below)

---

## Fix Option 1: Test Your Existing PhysioGuide (Fastest)

Your PhysioGuide already has voice code. Let's verify it works:

### Open Browser Console (F12) and run:

```javascript
// Test if Speech Synthesis works
const test = new SpeechSynthesisUtterance("Testing voice");
test.onstart = () => console.log("✅ Started!");
test.onerror = (e) => console.error("❌ Error:", e.error);
window.speechSynthesis.speak(test);
```

**If you hear "Testing voice":**
- ✅ Voice works in browser
- Issue is in your app code

**If no sound:**
- Check system volume
- Check browser tab not muted
- Try different browser (Chrome)

---

## Fix Option 2: Force Voice to Work

Add this button to your session page to test voice on demand:

### File: `frontend/app/session/page.tsx`

Add this button somewhere in your UI:

```typescript
<button
  onClick={() => {
    // Force test voice
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(
        "Voice test. If you hear this, voice is working."
      );
      
      utterance.onstart = () => console.log("✅ Voice started!");
      utterance.onend = () => console.log("✅ Voice ended!");
      utterance.onerror = (e) => console.error("❌ Voice error:", e.error);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Speech Synthesis not available");
    }
  }}
  style={{
    position: 'fixed',
    bottom: 20,
    right: 20,
    padding: '15px 25px',
    background: '#0fffc5',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: 16,
    zIndex: 9999,
  }}
>
  🔊 Test Voice
</button>
```

---

## Fix Option 3: Check PhysioGuide Voice Code

Your PhysioGuide component has voice code. Let's verify it's working:

### Check Console Logs

When you start a session, look for:

```
✅ TTS: Loaded X voices
🔊 Speaking with voice: [name]
🔊 Started speaking: "Hey! I'm your AI physiotherapist..."
```

**If you see these logs but no sound:**
1. Check system volume
2. Check browser tab not muted (🔇 icon)
3. Check browser console for errors

**If you don't see these logs:**
1. Voices might not be loading
2. Component might not be calling speak()

---

## Fix Option 4: Add Voice Test to PhysioGuide

Add a test button directly in PhysioGuide:

### File: `frontend/components/session/PhysioGuide.tsx`

Add this near the top of the component (after the Canvas):

```typescript
{/* Voice Test Button - Remove after testing */}
<button
  onClick={() => {
    console.log("🧪 Testing voice from PhysioGuide...");
    speak("Testing voice from PhysioGuide component", "neutral", () => {
      console.log("✅ Voice test complete");
    });
  }}
  style={{
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100,
    padding: '10px 20px',
    background: '#0fffc5',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  🔊 Test Voice
</button>
```

---

## Common Issues & Solutions

### Issue 1: "No voices loaded"

**Cause:** Voices load asynchronously

**Fix:** Wait 1-2 seconds after page load, then test

```javascript
// In console
setTimeout(() => {
  const voices = window.speechSynthesis.getVoices();
  console.log(`Voices: ${voices.length}`);
}, 2000);
```

### Issue 2: "Speech synthesis error: interrupted"

**Cause:** New speech interrupting old speech (NORMAL)

**Fix:** This is expected behavior, not an error

### Issue 3: No sound but no errors

**Cause:** System volume or browser tab muted

**Fix:**
1. Check system volume > 50%
2. Right-click browser tab → Check for mute icon
3. Try YouTube to verify audio works

### Issue 4: Works in console but not in app

**Cause:** Timing issue - voices not loaded when app tries to speak

**Fix:** Add delay before first speech:

```typescript
// In PhysioGuide intro sequence
setTimeout(() => {
  say("Hey! I'm your AI physiotherapist...", "encouraging");
}, 2000); // Wait 2 seconds for voices to load
```

---

## Browser-Specific Issues

### Chrome/Edge
- Usually works best
- Check site permissions (🔒 icon in address bar)
- Try: chrome://settings/content/sound

### Safari
- Requires user interaction first
- Click "Start Session" button (provides user gesture)
- Check: System Preferences → Sound

### Firefox
- Limited voice support
- Try: about:config → media.webspeech.synth.enabled = true
- Consider using Chrome instead

---

## System-Specific Issues

### macOS
- Check: System Preferences → Accessibility → Speech
- Verify voices installed: System Preferences → Accessibility → Speech → System Voice

### Windows
- Check: Settings → Time & Language → Speech
- Verify voices installed: Settings → Time & Language → Speech → Manage voices

### Linux
- Install espeak: `sudo apt-get install espeak`
- Or festival: `sudo apt-get install festival`

---

## Debugging Checklist

Run through this in order:

1. [ ] Visit `/test-voice` page
2. [ ] Click "Test Basic Speech"
3. [ ] Check if you hear sound
4. [ ] Check browser console for errors
5. [ ] Check system volume
6. [ ] Check browser tab not muted
7. [ ] Try different browser (Chrome)
8. [ ] Try incognito mode
9. [ ] Restart browser
10. [ ] Check OS audio settings

---

## Still Not Working?

### Get Detailed Info

Run this in browser console:

```javascript
// Comprehensive diagnostic
console.log("=== VOICE DIAGNOSTIC ===");
console.log("API Available:", !!window.speechSynthesis);
console.log("Voices:", window.speechSynthesis.getVoices().length);
console.log("Speaking:", window.speechSynthesis.speaking);
console.log("Paused:", window.speechSynthesis.paused);
console.log("Pending:", window.speechSynthesis.pending);

// Test speech
const test = new SpeechSynthesisUtterance("Diagnostic test");
test.onstart = () => console.log("✅ STARTED");
test.onend = () => console.log("✅ ENDED");
test.onerror = (e) => console.error("❌ ERROR:", e.error, e.message);
window.speechSynthesis.speak(test);

// Check after 1 second
setTimeout(() => {
  console.log("After 1s - Speaking:", window.speechSynthesis.speaking);
}, 1000);
```

Copy the output and share it for further debugging.

---

## Quick Fixes Summary

1. **Visit `/test-voice`** - Test if browser supports voice
2. **Check volume** - System and browser tab
3. **Try Chrome** - Best voice support
4. **Add test button** - Force test voice in your app
5. **Check console** - Look for voice logs
6. **Wait 2 seconds** - Let voices load before speaking

---

## Next Steps

1. Visit `http://localhost:3000/test-voice`
2. Click "Test Basic Speech"
3. If it works: Voice is supported, issue is integration
4. If it doesn't work: Follow troubleshooting above
5. Share console output if still stuck

---

**Most Common Cause:** System volume muted or browser tab muted (90% of cases)

**Second Most Common:** Voices not loaded yet (wait 2 seconds)

**Third Most Common:** Wrong browser (use Chrome)
