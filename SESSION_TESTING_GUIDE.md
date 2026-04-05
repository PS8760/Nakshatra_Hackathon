# Session Feature - Testing Guide

## 🧪 Comprehensive Testing Checklist

### Pre-Test Setup
```bash
# 1. Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 2. Start frontend
cd frontend
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000/session
```

---

## 1️⃣ Basic Functionality Tests

### Test 1.1: Camera Initialization
**Steps:**
1. Navigate to `/session`
2. Click "Start Session"
3. Grant camera permissions

**Expected:**
- ✅ Camera feed appears within 5 seconds
- ✅ Loading progress bar shows (0% → 100%)
- ✅ Loading messages update ("Loading TensorFlow.js..." → "Starting camera...")
- ✅ No errors in console

**Pass Criteria:**
- Camera loads successfully
- BlazePose model loads (<5 seconds)
- FPS counter appears (top-left)

---

### Test 1.2: Pose Detection
**Steps:**
1. Stand 1.5m from camera
2. Ensure full body visible
3. Observe skeleton overlay

**Expected:**
- ✅ 33 keypoints detected
- ✅ Skeleton drawn on body
- ✅ Joints color-coded (green/yellow/red/gray)
- ✅ FPS ≥30

**Pass Criteria:**
- Skeleton tracks body movements smoothly
- No jitter or lag
- Joints change color based on form

---

### Test 1.3: Exercise Classification
**Steps:**
1. Select "Knee Rehab" preset
2. Perform a squat
3. Check exercise label

**Expected:**
- ✅ Exercise label shows "squat"
- ✅ Phase indicator updates (top → descending → bottom → ascending)
- ✅ Angle labels appear on knees

**Pass Criteria:**
- Exercise correctly identified
- Phase transitions smoothly
- Angles update in real-time

---

### Test 1.4: Rep Counting
**Steps:**
1. Perform 5 squats (full range of motion)
2. Observe rep counter

**Expected:**
- ✅ Rep count increments: 1 → 2 → 3 → 4 → 5
- ✅ Voice says "Rep 1", "Rep 2", etc.
- ✅ 3D guide celebrates each rep
- ✅ No false positives (partial reps don't count)

**Pass Criteria:**
- All 5 reps counted correctly
- No extra reps counted
- Voice feedback synchronized

---

### Test 1.5: Form Scoring
**Steps:**
1. Perform 1 perfect squat (slow, controlled)
2. Perform 1 poor squat (knees caving, forward lean)
3. Compare scores

**Expected:**
- ✅ Perfect squat: Score ≥85 (green)
- ✅ Poor squat: Score <70 (yellow/red)
- ✅ Score updates in real-time
- ✅ Score badge color changes

**Pass Criteria:**
- Score accurately reflects form quality
- Color coding correct
- Score visible throughout rep

---

### Test 1.6: Fault Detection
**Steps:**
1. Perform squat with knees caving inward
2. Observe fault feedback

**Expected:**
- ✅ Red pulsing ring appears on knees
- ✅ Fault message: "Knees caving inward — push knees out"
- ✅ Voice warning (if error severity)
- ✅ 3D guide shows concerned expression

**Pass Criteria:**
- Fault detected within 1 second
- Message clear and actionable
- Visual indicator prominent

---

## 2️⃣ Performance Tests

### Test 2.1: FPS Consistency
**Steps:**
1. Start session
2. Perform 10 reps continuously
3. Monitor FPS counter

**Expected:**
- ✅ FPS ≥30 throughout
- ✅ No drops below 25
- ✅ Average FPS ≥45

**Pass Criteria:**
- Consistent frame rate
- No stuttering or freezing
- Smooth animations

---

### Test 2.2: Adaptive Quality
**Steps:**
1. Open 10+ browser tabs (simulate low performance)
2. Start session
3. Observe quality adjustments

**Expected:**
- ✅ FPS drops → system switches to "balanced" mode
- ✅ Console log: "Switching to balanced performance mode"
- ✅ FPS stabilizes

**Pass Criteria:**
- Automatic quality adjustment
- No manual intervention needed
- Session remains usable

---

### Test 2.3: Memory Usage
**Steps:**
1. Start session
2. Run for 10 minutes
3. Check browser task manager

**Expected:**
- ✅ Memory usage <500MB
- ✅ No memory leaks (usage stable)
- ✅ CPU usage <50%

**Pass Criteria:**
- Memory doesn't grow continuously
- Browser remains responsive
- No crashes

---

## 3️⃣ Accuracy Tests

### Test 3.1: Angle Accuracy
**Setup:** Use protractor or goniometer for ground truth

**Steps:**
1. Bend knee to 90° (measured)
2. Check angle display on screen

**Expected:**
- ✅ Displayed angle: 87-93° (±3° tolerance)
- ✅ Consistent across multiple measurements
- ✅ Updates smoothly (no jumps)

**Pass Criteria:**
- Angle within ±3° of ground truth
- 95% of measurements accurate

---

### Test 3.2: Rep Detection Accuracy
**Steps:**
1. Perform 20 squats (count manually)
2. Compare with system count

**Expected:**
- ✅ System count matches manual count
- ✅ False positives: 0-1 (≤5%)
- ✅ False negatives: 0 (0%)

**Pass Criteria:**
- ≥95% accuracy (19-20 correct)
- No missed reps
- Minimal false positives

---

### Test 3.3: Fault Detection Accuracy
**Steps:**
1. Perform 5 perfect squats
2. Perform 5 squats with knee cave
3. Check fault detection

**Expected:**
- ✅ Perfect squats: 0 faults
- ✅ Faulty squats: "knee_cave" detected
- ✅ Detection rate: 100%

**Pass Criteria:**
- No false positives on perfect form
- All faults detected
- Correct fault type identified

---

## 4️⃣ User Experience Tests

### Test 4.1: 3D Guide Responsiveness
**Steps:**
1. Start session
2. Observe 3D guide behavior

**Expected:**
- ✅ Guide waves on session start
- ✅ Guide demonstrates exercise
- ✅ Guide celebrates rep completions
- ✅ Guide shows concern on faults
- ✅ Facial expressions change (blinking, mouth, eyebrows)

**Pass Criteria:**
- All animations smooth (60 FPS)
- Expressions match context
- Speech bubbles appear/disappear correctly

---

### Test 4.2: Voice Feedback
**Steps:**
1. Perform 10 reps with varied form
2. Listen to voice feedback

**Expected:**
- ✅ Rep counting: "Rep 1", "Rep 2", etc.
- ✅ Fault warnings: Clear, actionable
- ✅ Encouragement: "Great job!", "Keep going!"
- ✅ Milestones: "5 reps! You're on fire!"

**Pass Criteria:**
- Voice clear and understandable
- Timing appropriate (not too frequent)
- Emotion matches context

---

### Test 4.3: Visual Feedback
**Steps:**
1. Perform reps with varied form
2. Observe visual indicators

**Expected:**
- ✅ Joint colors change (green → yellow → red)
- ✅ Angle labels update in real-time
- ✅ Pulsing rings on faulty joints
- ✅ Form score badge updates
- ✅ Feedback banner appears

**Pass Criteria:**
- All indicators visible and clear
- Colors intuitive
- No visual clutter

---

## 5️⃣ Edge Case Tests

### Test 5.1: Poor Lighting
**Steps:**
1. Turn off lights (dark room)
2. Start session

**Expected:**
- ✅ Warning: "Lighting is too dark"
- ✅ Pose detection still works (reduced accuracy)
- ✅ Confidence scores lower
- ✅ System suggests adding light

**Pass Criteria:**
- Graceful degradation
- Helpful error messages
- No crashes

---

### Test 5.2: Partial Body Visibility
**Steps:**
1. Stand too close (only upper body visible)
2. Perform exercise

**Expected:**
- ✅ Warning: "Stand further back"
- ✅ Missing joints shown in gray
- ✅ Rep counting disabled (insufficient data)
- ✅ Helpful positioning guide

**Pass Criteria:**
- Clear feedback on issue
- No false rep counts
- Recovers when user adjusts

---

### Test 5.3: Multiple People in Frame
**Steps:**
1. Have 2 people in camera view
2. Start session

**Expected:**
- ✅ System tracks only 1 person (closest/largest)
- ✅ No confusion or switching between people
- ✅ Stable tracking

**Pass Criteria:**
- Consistent tracking of single person
- No jitter from person switching

---

### Test 5.4: Camera Occlusion
**Steps:**
1. Start session
2. Walk behind furniture (partial occlusion)
3. Return to full visibility

**Expected:**
- ✅ Tracking pauses during occlusion
- ✅ Resumes smoothly when visible
- ✅ No false rep counts during occlusion

**Pass Criteria:**
- Graceful handling of occlusion
- Quick recovery
- No data corruption

---

## 6️⃣ Data Export Tests

### Test 6.1: CSV Export
**Steps:**
1. Complete session with 10 reps
2. Click "Export CSV" (if implemented)
3. Open downloaded file

**Expected:**
- ✅ File downloads successfully
- ✅ Contains all 10 reps
- ✅ Includes angles, scores, faults
- ✅ Proper CSV format

**Pass Criteria:**
- All data present and accurate
- File opens in Excel/Google Sheets
- No missing or corrupted data

---

### Test 6.2: Session Summary
**Steps:**
1. Complete session
2. View session summary

**Expected:**
- ✅ Total reps: Correct count
- ✅ Average score: Calculated correctly
- ✅ Best/worst rep: Identified correctly
- ✅ Most common fault: Accurate

**Pass Criteria:**
- All statistics accurate
- Summary matches raw data

---

## 7️⃣ Cross-Browser Tests

### Test 7.1: Chrome
- ✅ All features work
- ✅ FPS ≥60
- ✅ No console errors

### Test 7.2: Firefox
- ✅ All features work
- ✅ FPS ≥50
- ✅ No console errors

### Test 7.3: Safari
- ✅ All features work
- ✅ FPS ≥45
- ✅ No console errors

### Test 7.4: Edge
- ✅ All features work
- ✅ FPS ≥60
- ✅ No console errors

---

## 8️⃣ Mobile Tests

### Test 8.1: Mobile Chrome (Android)
- ✅ Camera works
- ✅ FPS ≥30
- ✅ Touch controls work
- ✅ Responsive layout

### Test 8.2: Mobile Safari (iOS)
- ✅ Camera works
- ✅ FPS ≥30
- ✅ Touch controls work
- ✅ Responsive layout

---

## 9️⃣ Stress Tests

### Test 9.1: Long Session
**Steps:**
1. Run session for 30 minutes
2. Perform 50+ reps

**Expected:**
- ✅ No performance degradation
- ✅ Memory usage stable
- ✅ All features still work

**Pass Criteria:**
- Session remains stable
- No crashes or freezes

---

### Test 9.2: Rapid Movements
**Steps:**
1. Perform very fast reps (1 rep/second)
2. Observe tracking

**Expected:**
- ✅ Tracking keeps up
- ✅ Rep counting accurate
- ✅ No missed frames

**Pass Criteria:**
- System handles high-speed movements
- Accuracy maintained

---

## 🔟 Regression Tests

### Test 10.1: After Code Changes
**Checklist:**
- [ ] All basic functionality tests pass
- [ ] Performance metrics unchanged
- [ ] No new console errors
- [ ] Accuracy maintained

### Test 10.2: After Dependency Updates
**Checklist:**
- [ ] TensorFlow.js version compatible
- [ ] BlazePose model loads
- [ ] No breaking changes
- [ ] Performance not degraded

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]
**Tester:** [Name]
**Browser:** [Chrome/Firefox/Safari/Edge]
**Device:** [Desktop/Laptop/Mobile]
**OS:** [Windows/Mac/Linux/iOS/Android]

### Results
| Test | Status | Notes |
|------|--------|-------|
| 1.1 Camera Init | ✅ Pass | Loaded in 3.2s |
| 1.2 Pose Detection | ✅ Pass | 60 FPS |
| 1.3 Exercise Classification | ✅ Pass | Correct |
| 1.4 Rep Counting | ✅ Pass | 10/10 reps |
| 1.5 Form Scoring | ✅ Pass | Accurate |
| 1.6 Fault Detection | ✅ Pass | All faults detected |
| 2.1 FPS Consistency | ✅ Pass | Avg 58 FPS |
| 2.2 Adaptive Quality | ✅ Pass | Switched correctly |
| 2.3 Memory Usage | ✅ Pass | 320MB stable |
| 3.1 Angle Accuracy | ✅ Pass | ±2.5° |
| 3.2 Rep Detection | ✅ Pass | 19/20 correct |
| 3.3 Fault Detection | ✅ Pass | 100% accuracy |

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Status
✅ All tests passed
⚠️ Minor issues found
❌ Critical issues found
```

---

## 🚨 Critical Failure Criteria

**Stop testing and fix immediately if:**
1. ❌ FPS drops below 15 consistently
2. ❌ Camera fails to initialize
3. ❌ Rep counting accuracy <90%
4. ❌ Angle accuracy >±5°
5. ❌ Browser crashes or freezes
6. ❌ Memory leak detected
7. ❌ Critical console errors

---

## ✅ Sign-Off Checklist

**Before Production Deployment:**
- [ ] All basic functionality tests pass
- [ ] All performance tests pass
- [ ] All accuracy tests pass
- [ ] All UX tests pass
- [ ] All edge case tests pass
- [ ] All cross-browser tests pass
- [ ] All mobile tests pass
- [ ] All stress tests pass
- [ ] No critical issues
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Security audit passed

**Signed Off By:**
- [ ] Developer: _______________
- [ ] QA Lead: _______________
- [ ] Product Manager: _______________
- [ ] Medical Advisor: _______________

---

## 📞 Reporting Issues

**Issue Template:**
```markdown
### Issue: [Brief description]
**Severity:** Critical / High / Medium / Low
**Test:** [Test number and name]
**Browser:** [Browser and version]
**Device:** [Device type]
**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Screenshots:** [Attach if applicable]
**Console Errors:** [Copy/paste errors]
**Performance Metrics:** [FPS, memory, etc.]
```

---

**Happy Testing! 🧪**
