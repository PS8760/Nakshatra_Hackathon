# Progress Tracking Features - User Guide

## What's New

Your NeuroRestore AI profile now tracks and displays comprehensive rehabilitation progress!

## Profile Page - Progress Overview

### 📊 Progress Metrics Dashboard

When you visit your profile (`/profile`), you'll now see:

#### 1. **Total Sessions**
- Count of all completed rehabilitation sessions
- Shows your commitment to recovery

#### 2. **Average Recovery Score**
- Your overall performance score (0-100)
- Calculated from all completed sessions
- Combines physical ROM and cognitive performance

#### 3. **7-Day Trend** 📈📉➡️
- Compares last 7 days vs previous 7 days
- Visual indicators:
  - 📈 Green = Improving (score increased >5%)
  - 📉 Red = Declining (score decreased >5%)
  - ➡️ Gray = Stable (within ±5%)
- Shows percentage change

#### 4. **Current Streak** 🔥
- Consecutive days with at least one session
- Motivates daily practice
- Resets if you skip a day

#### 5. **Total Reps**
- Cumulative repetitions across all exercises
- Shows total work completed

#### 6. **Most Improved Joint** 💪
- Identifies which joint has improved the most
- Compares early sessions (first 3) vs recent (last 3)
- Shows ROM improvement in degrees

### 🏆 Achievements Section

Unlock milestone badges as you progress:

- 🎯 **First Session** - Complete your first session
- 🔥 **10 Sessions** - Reach 10 completed sessions
- 💪 **50 Sessions** - Achieve 50 sessions milestone
- 🏆 **100 Sessions** - Century club!
- 💯 **100 Reps** - Complete 100 total reps
- 🚀 **1000 Reps** - Reach 1000 reps milestone
- ⭐ **90+ Score** - Achieve a recovery score of 90 or higher

**Personal Best** display shows:
- Your highest recovery score ever
- Date when you achieved it

## Session History Page

The history page (`/history`) provides detailed session tracking:

### Features Already Available:
- ✅ Complete session list with dates and scores
- ✅ Edit session notes
- ✅ Delete sessions
- ✅ Download per-session PDF reports
- ✅ View cognitive test history
- ✅ Detailed session breakdown with joint stats

### Session Details Include:
- Date and duration
- Recovery score (color-coded)
- Session type (physical/cognitive/combined)
- Joint performance stats (reps, avg angle, target)
- Pain events logged during session
- Personal notes

## How Progress is Calculated

### Recovery Score Formula
```
Recovery Score = (60% × Physical Score) + (40% × Cognitive Score)
```

### Physical Score
- Based on joint ROM (Range of Motion) achieved vs target
- Each rep: `(achieved angle / target angle) × 100`
- Averaged across all reps in session

### Trend Analysis
- Compares average scores from last 7 days vs previous 7 days
- Percentage change calculated
- Trend direction determined by ±5% threshold

### Most Improved Joint
- Compares average angles from first 3 sessions vs last 3 sessions
- Calculates ROM improvement in degrees
- Shows joint with highest improvement

### Streak Calculation
- Checks if you had at least one session each day
- Counts consecutive days backwards from today
- Resets when a day is skipped

## Using the Progress Data

### Motivation
- Track your streak to stay consistent
- Celebrate milestones as you unlock them
- See tangible improvement in ROM

### Goal Setting
- Use trend indicators to adjust effort
- Focus on joints that need more work
- Aim to beat your personal best

### Communication with Clinician
- Share progress metrics during appointments
- Download PDF reports for medical records
- Show specific joint improvements

### Self-Assessment
- Identify patterns in your recovery
- Understand which exercises work best
- Adjust routine based on data

## Tips for Best Results

1. **Complete Sessions Regularly**
   - Consistency improves trend accuracy
   - Builds your streak
   - Unlocks milestones faster

2. **Log Pain Events**
   - Helps track problem areas
   - Provides context for scores
   - Informs treatment adjustments

3. **Add Session Notes**
   - Record how you felt
   - Note any challenges
   - Track external factors

4. **Review Progress Weekly**
   - Check your trend indicator
   - Identify improvements
   - Adjust goals as needed

5. **Celebrate Achievements**
   - Acknowledge milestones
   - Share progress with support network
   - Use achievements as motivation

## Privacy & Data

- All progress data is private to your account
- Only you (and assigned clinician if applicable) can view your data
- Data stored securely in encrypted database
- You can delete sessions at any time
- Export your data via PDF reports

## Future Features (Coming Soon)

Potential enhancements being considered:
- 📈 Visual charts and graphs
- 🎯 Custom goal setting
- 📊 Clinician dashboard view
- 📤 CSV/Excel data export
- 🔄 Session comparison tool
- 🤖 AI-powered recovery predictions
- 🔔 Session reminder notifications

## Need Help?

- Visit the dashboard for quick overview
- Check history page for detailed sessions
- Use AI chatbot for questions about your progress
- Contact your clinician for medical guidance

---

**Remember**: Progress isn't always linear. Some fluctuation is normal. Focus on the overall trend and celebrate small wins along the way! 🎉
