from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("/summary")
def get_progress_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get comprehensive progress summary for the user including:
    - Total sessions count
    - Average recovery score trend
    - Most improved joints
    - Recent activity streak
    - Comparison with previous period
    """
    # Get all sessions
    sessions = db.query(models.Session).filter(
        models.Session.user_id == current_user.id,
        models.Session.ended_at.isnot(None)
    ).order_by(models.Session.started_at.desc()).all()

    if not sessions:
        return {
            "total_sessions": 0,
            "avg_recovery_score": None,
            "trend": "no_data",
            "streak_days": 0,
            "total_reps": 0,
            "most_improved_joint": None,
            "recent_sessions": [],
        }

    # Basic stats
    total_sessions = len(sessions)
    scores = [s.recovery_score for s in sessions if s.recovery_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else None

    # Calculate trend (last 7 days vs previous 7 days)
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    recent_scores = [
        s.recovery_score for s in sessions
        if s.recovery_score and s.started_at >= week_ago
    ]
    previous_scores = [
        s.recovery_score for s in sessions
        if s.recovery_score and two_weeks_ago <= s.started_at < week_ago
    ]

    trend = "stable"
    trend_percentage = 0
    if recent_scores and previous_scores:
        recent_avg = sum(recent_scores) / len(recent_scores)
        previous_avg = sum(previous_scores) / len(previous_scores)
        diff = recent_avg - previous_avg
        trend_percentage = round((diff / previous_avg) * 100, 1) if previous_avg > 0 else 0
        if diff > 5:
            trend = "improving"
        elif diff < -5:
            trend = "declining"

    # Calculate activity streak
    streak_days = 0
    check_date = now.date()
    session_dates = set(s.started_at.date() for s in sessions)
    while check_date in session_dates:
        streak_days += 1
        check_date -= timedelta(days=1)

    # Total reps across all sessions
    total_reps = db.query(func.count(models.JointLog.id)).filter(
        models.JointLog.session_id.in_([s.id for s in sessions])
    ).scalar() or 0

    # Most improved joint (compare first 3 sessions vs last 3 sessions)
    joint_improvement = {}
    for joint_name in ["knee_left", "knee_right", "shoulder_left", "shoulder_right", "elbow_left", "elbow_right"]:
        joint_logs = db.query(models.JointLog).join(models.Session).filter(
            models.Session.user_id == current_user.id,
            models.JointLog.joint == joint_name
        ).order_by(models.Session.started_at).all()

        if len(joint_logs) >= 6:
            early_angles = [log.angle for log in joint_logs[:3]]
            recent_angles = [log.angle for log in joint_logs[-3:]]
            early_avg = sum(early_angles) / len(early_angles)
            recent_avg = sum(recent_angles) / len(recent_angles)
            improvement = recent_avg - early_avg
            joint_improvement[joint_name] = round(improvement, 1)

    most_improved = None
    if joint_improvement:
        best_joint = max(joint_improvement.items(), key=lambda x: x[1])
        if best_joint[1] > 0:
            most_improved = {
                "joint": best_joint[0],
                "improvement_degrees": best_joint[1]
            }

    # Recent sessions (last 5)
    recent_sessions = []
    for s in sessions[:5]:
        recent_sessions.append({
            "id": s.id,
            "date": s.started_at.isoformat() if s.started_at else None,
            "recovery_score": s.recovery_score,
            "duration_s": s.duration_s,
            "session_type": s.session_type,
        })

    return {
        "total_sessions": total_sessions,
        "avg_recovery_score": avg_score,
        "trend": trend,
        "trend_percentage": trend_percentage,
        "streak_days": streak_days,
        "total_reps": total_reps,
        "most_improved_joint": most_improved,
        "recent_sessions": recent_sessions,
        "last_session_date": sessions[0].started_at.isoformat() if sessions else None,
    }


@router.get("/joint-trends")
def get_joint_trends(
    joint: Optional[str] = None,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get joint angle trends over time.
    Returns time series data for charting.
    """
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = db.query(
        models.JointLog.joint,
        models.JointLog.angle,
        models.JointLog.target,
        models.Session.started_at
    ).join(models.Session).filter(
        models.Session.user_id == current_user.id,
        models.Session.started_at >= cutoff
    )

    if joint:
        query = query.filter(models.JointLog.joint == joint)

    logs = query.order_by(models.Session.started_at).all()

    # Group by joint
    joint_data = {}
    for log in logs:
        if log.joint not in joint_data:
            joint_data[log.joint] = {
                "joint": log.joint,
                "data_points": []
            }
        joint_data[log.joint]["data_points"].append({
            "date": log.started_at.isoformat(),
            "angle": log.angle,
            "target": log.target,
        })

    return {"joints": list(joint_data.values())}


@router.get("/weekly-summary")
def get_weekly_summary(
    weeks: int = 4,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get week-by-week summary for the last N weeks.
    """
    now = datetime.utcnow()
    summaries = []

    for week_offset in range(weeks):
        week_end = now - timedelta(days=week_offset * 7)
        week_start = week_end - timedelta(days=7)

        sessions = db.query(models.Session).filter(
            models.Session.user_id == current_user.id,
            models.Session.started_at >= week_start,
            models.Session.started_at < week_end,
            models.Session.ended_at.isnot(None)
        ).all()

        if not sessions:
            continue

        scores = [s.recovery_score for s in sessions if s.recovery_score]
        avg_score = round(sum(scores) / len(scores), 1) if scores else None

        total_duration = sum(s.duration_s for s in sessions)
        total_reps = db.query(func.count(models.JointLog.id)).filter(
            models.JointLog.session_id.in_([s.id for s in sessions])
        ).scalar() or 0

        summaries.append({
            "week_start": week_start.date().isoformat(),
            "week_end": week_end.date().isoformat(),
            "session_count": len(sessions),
            "avg_recovery_score": avg_score,
            "total_duration_minutes": round(total_duration / 60, 1),
            "total_reps": total_reps,
        })

    return {"weeks": summaries}


@router.get("/milestones")
def get_milestones(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Get user milestones and achievements.
    """
    sessions = db.query(models.Session).filter(
        models.Session.user_id == current_user.id,
        models.Session.ended_at.isnot(None)
    ).all()

    total_sessions = len(sessions)
    total_reps = db.query(func.count(models.JointLog.id)).join(models.Session).filter(
        models.Session.user_id == current_user.id
    ).scalar() or 0

    total_duration = sum(s.duration_s for s in sessions)
    total_hours = round(total_duration / 3600, 1)

    # Best recovery score
    best_score = None
    best_session = None
    if sessions:
        scored_sessions = [s for s in sessions if s.recovery_score]
        if scored_sessions:
            best_session = max(scored_sessions, key=lambda s: s.recovery_score)
            best_score = best_session.recovery_score

    # Milestones achieved
    milestones = []
    if total_sessions >= 1:
        milestones.append({"title": "First Session", "icon": "🎯", "achieved": True})
    if total_sessions >= 10:
        milestones.append({"title": "10 Sessions", "icon": "🔥", "achieved": True})
    if total_sessions >= 50:
        milestones.append({"title": "50 Sessions", "icon": "💪", "achieved": True})
    if total_sessions >= 100:
        milestones.append({"title": "100 Sessions", "icon": "🏆", "achieved": True})
    if total_reps >= 100:
        milestones.append({"title": "100 Reps", "icon": "💯", "achieved": True})
    if total_reps >= 1000:
        milestones.append({"title": "1000 Reps", "icon": "🚀", "achieved": True})
    if best_score and best_score >= 90:
        milestones.append({"title": "90+ Score", "icon": "⭐", "achieved": True})

    return {
        "total_sessions": total_sessions,
        "total_reps": total_reps,
        "total_hours": total_hours,
        "best_recovery_score": best_score,
        "best_session_date": best_session.started_at.isoformat() if best_session else None,
        "milestones": milestones,
    }
