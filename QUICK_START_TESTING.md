# Quick Start Testing Guide

## How to Test the New Features

### Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`
- Camera access enabled
- Modern browser (Chrome/Edge recommended)

---

## 1. Test Progress Tracking

### Step 1: Complete Multiple Sessions
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Start frontend (in new terminal)
cd frontend
npm run dev
```

### Step 2: Create Test Data
1. Navigate to `http://localhost:3000/auth`
2. Sign in or register
3. Go to `/session`
4. Complete 3-5 sessions with different scores
5. Vary the duration and exercises

### Step 3: View Progress
1. Navigate to `/profile`
2. Verify you see:
   - ✅ Total sessions count
   - ✅ Average recovery score
   - ✅ 7-day trend indicator (📈/📉/➡️)
   - ✅ Current streak (🔥)
   - ✅ Total reps
   - ✅ Most improved joint (if enough data)
   - ✅ Achievement badges
   - ✅ Personal best score

### Expected Results
- All metrics display correctly
- Trend shows "improving" if recent scores are higher
- Streak shows consecutive days with sessions
- Badges unlock at milestones (1, 10, 50, 100 sessions, etc.)

---

## 2. Test Clean Pose Visualization

### Step 1: Start a Session
1. Navigate to `/session`
2. Click "Start Session"
3. Allow camera access
4. Wait for MediaPipe to load

### Step 2: Verify Clean Display
Check that you see:
- ✅ Colored dots only (no text labels on joints)
- ✅ 6 different colors for body parts:
  - Pink dots (face)
  - Turquoise dots (left arm)
  - Light turquoise dots (right arm)
  - Yellow dots (torso)
  - Red dots (left leg)
  - Dark red dots (right leg)
- ✅ White borders around dots
- ✅ Glow effect on dots
- ✅ Angle labels (e.g., "124°") above joints
- ✅ Color guide legend below camera

### Step 3: Verify Functionality
- ✅ Skeleton tracks your movement
- ✅ Reps are counted
- ✅ Form feedback appears
- ✅ Angles update in real-time
- ✅ FPS counter shows 20-30 FPS

### Expected Results
- Clean, uncluttered camera view
- Easy to see skeleton
- Professional appearance
- Smooth tracking

---

## 3. Test API Endpoints

### Test Progress Summary
```bash
# Get JWT token first (from login)
TOKEN="your_jwt_token_here"

# Test progress summary
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/progress/summary

# Expected response:
{
  "total_sessions": 5,
  "avg_recovery_score": 78.5,
  "trend": "improving",
  "trend_percentage": 12.3,
  "streak_days": 3,
  "total_reps": 150,
  "most_improved_joint": {
    "joint": "knee_left",
    "improvement_degrees": 15.2
  },
  "recent_sessions": [...]
}
```

### Test Milestones
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/progress/milestones

# Expected response:
{
  "total_sessions": 5,
  "total_reps": 150,
  "total_hours": 2.5,
  "best_recovery_score": 92.0,
  "best_session_date": "2026-04-05T10:30:00",
  "milestones": [
    {"title": "First Session", "icon": "🎯", "achieved": true},
    {"title": "10 Sessions", "icon": "🔥", "achieved": false}
  ]
}
```

### Test Joint Trends
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/progress/joint-trends?joint=knee_left&days=30"

# Expected response:
{
  "joints": [
    {
      "joint": "knee_left",
      "data_points": [
        {"date": "2026-04-01T10:00:00", "angle": 110, "target": 120},
        {"date": "2026-04-02T10:00:00", "angle": 115, "target": 120},
        ...
      ]
    }
  ]
}
```

### Test Weekly Summary
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/progress/weekly-summary?weeks=4"

# Expected response:
{
  "weeks": [
    {
      "week_start": "2026-03-29",
      "week_end": "2026-04-05",
      "session_count": 3,
      "avg_recovery_score": 82.5,
      "total_duration_minutes": 45.0,
      "total_reps": 90
    },
    ...
  ]
}
```

---

## 4. Test Responsive Design

### Desktop (> 1024px)
1. Open browser at full width
2. Verify:
   - ✅ 4-column stats grid
   - ✅ 2-column main layout
   - ✅ All elements visible

### Tablet (768px - 1024px)
1. Resize browser to ~900px width
2. Verify:
   - ✅ 2-column stats grid
   - ✅ Single column main layout
   - ✅ Elements stack properly

### Mobile (< 768px)
1. Resize browser to ~400px width
2. Verify:
   - ✅ Single column stats
   - ✅ Stacked layout
   - ✅ Touch-friendly buttons
   - ✅ Readable text

---

## 5. Test Error Handling

### No Sessions Yet
1. Create new user account
2. Navigate to `/profile`
3. Verify:
   - ✅ Shows "0" for metrics
   - ✅ No trend (or "no_data")
   - ✅ No streak
   - ✅ No milestones yet
   - ✅ Friendly empty state

### Camera Permission Denied
1. Navigate to `/session`
2. Start session
3. Deny camera permission
4. Verify:
   - ✅ Error message displays
   - ✅ Retry button appears
   - ✅ Helpful instructions shown

### Network Error
1. Stop backend server
2. Try to load `/profile`
3. Verify:
   - ✅ Loading state shows
   - ✅ Error message appears
   - ✅ Redirects to auth if needed

---

## 6. Test Accessibility

### Keyboard Navigation
1. Use Tab key to navigate
2. Verify:
   - ✅ All buttons focusable
   - ✅ Focus indicators visible
   - ✅ Logical tab order
   - ✅ Enter key activates buttons

### Color Contrast
1. Check text readability
2. Verify:
   - ✅ All text meets WCAG AA
   - ✅ Colors distinguishable
   - ✅ Icons clear

### Screen Reader (Optional)
1. Enable screen reader
2. Navigate pages
3. Verify:
   - ✅ Semantic structure
   - ✅ Descriptive labels
   - ✅ Logical reading order

---

## 7. Performance Testing

### Load Time
1. Open DevTools Network tab
2. Hard refresh page
3. Verify:
   - ✅ Dashboard loads < 2s
   - ✅ Profile loads < 1.5s
   - ✅ Session loads < 3s

### Frame Rate
1. Start session with camera
2. Open DevTools Performance tab
3. Record for 10 seconds
4. Verify:
   - ✅ FPS counter shows 20-30
   - ✅ No dropped frames
   - ✅ Smooth animations

### Memory Usage
1. Open DevTools Memory tab
2. Use app for 5 minutes
3. Verify:
   - ✅ No memory leaks
   - ✅ Stable memory usage
   - ✅ Garbage collection working

---

## 8. Browser Compatibility

### Chrome/Edge
- ✅ Full support
- ✅ All features work
- ✅ Best performance

### Firefox
- ✅ Full support
- ✅ All features work
- ✅ Good performance

### Safari
- ✅ Full support
- ✅ All features work
- ✅ Good performance

---

## Common Issues & Solutions

### Issue: Camera not working
**Solution**: 
- Check browser permissions
- Use HTTPS or localhost
- Try Chrome/Edge
- Check camera not in use by other app

### Issue: Progress not showing
**Solution**:
- Complete at least one session
- Refresh page
- Check backend is running
- Verify JWT token valid

### Issue: Skeleton not visible
**Solution**:
- Ensure good lighting
- Stand 1-2m from camera
- Full body visible
- Check MediaPipe loaded

### Issue: Slow performance
**Solution**:
- Close other tabs
- Check CPU usage
- Lower video quality
- Use Chrome for best performance

---

## Success Criteria

### All Tests Pass ✅
- [ ] Progress tracking displays correctly
- [ ] Pose visualization is clean (no labels)
- [ ] Color-coded body parts visible
- [ ] API endpoints return correct data
- [ ] Responsive design works
- [ ] Error handling works
- [ ] Accessibility features work
- [ ] Performance is acceptable
- [ ] Browser compatibility confirmed

### User Experience ✅
- [ ] Interface is intuitive
- [ ] Navigation is smooth
- [ ] Feedback is clear
- [ ] Loading states are visible
- [ ] Errors are helpful

### Code Quality ✅
- [ ] No TypeScript errors
- [ ] No Python errors
- [ ] No console warnings
- [ ] Clean code structure
- [ ] Good documentation

---

## Quick Test Checklist

```
□ Backend running
□ Frontend running
□ User registered/logged in
□ Complete 3+ sessions
□ Visit /profile
□ See progress metrics
□ See achievement badges
□ Start new session
□ Camera shows clean skeleton
□ Color-coded body parts visible
□ No joint labels
□ Reps counted correctly
□ Form feedback works
□ Test on mobile
□ Test keyboard navigation
□ Check API endpoints
□ Verify no errors in console
```

---

## Need Help?

### Documentation
- `SESSION_HISTORY_PROGRESS.md` - Technical details
- `PROGRESS_TRACKING_FEATURES.md` - User guide
- `UI_UX_IMPROVEMENTS.md` - UI changes
- `BEFORE_AFTER_COMPARISON.md` - Visual comparison

### Debugging
1. Check browser console for errors
2. Check backend logs
3. Verify database has data
4. Test API endpoints directly
5. Check network tab for failed requests

---

**Happy Testing! 🎉**

If everything works as expected, you're ready to use the improved NeuroRestore AI platform!
