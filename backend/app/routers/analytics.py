from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/recovery-scores", response_model=List[schemas.RecoveryScoreOut])
def get_recovery_scores(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.RecoveryScore)
        .filter(models.RecoveryScore.user_id == current_user.id)
        .order_by(models.RecoveryScore.date.asc())
        .all()
    )


@router.get("/exercise-configs", response_model=List[schemas.ExerciseConfigOut])
def get_exercise_configs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.ExerciseConfig)
        .filter(models.ExerciseConfig.user_id == current_user.id)
        .all()
    )


@router.get("/joint-progress/{joint}")
def get_joint_progress(
    joint: str,
    limit: int = Query(default=30, le=90, description="Number of sessions to return"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Recovery Progress chart data for a specific joint.

    Returns per-session aggregates: avg angle, max angle, target, rep count.
    Designed to feed directly into a Recharts/Chart.js line chart.

    Example response item:
        {
          "session_id": 12,
          "date": "2026-04-01T09:30:00",
          "avg_angle": 118.4,
          "max_angle": 127.0,
          "target": 130.0,
          "reps": 8,
          "avg_deviation": -11.6
        }
    """
    rows = (
        db.query(
            models.JointLog.session_id,
            func.min(models.Session.started_at).label("date"),
            func.avg(models.JointLog.angle).label("avg_angle"),
            func.max(models.JointLog.angle).label("max_angle"),
            func.avg(models.JointLog.target).label("target"),
            func.count(models.JointLog.id).label("reps"),
            func.avg(models.JointLog.deviation).label("avg_deviation"),
        )
        .join(models.Session, models.Session.id == models.JointLog.session_id)
        .filter(
            models.Session.user_id == current_user.id,
            models.JointLog.joint == joint,
        )
        .group_by(models.JointLog.session_id)
        .order_by(func.min(models.Session.started_at).asc())
        .limit(limit)
        .all()
    )

    return [
        {
            "session_id": r.session_id,
            "date": r.date.isoformat() if r.date else None,
            "avg_angle": round(r.avg_angle, 1) if r.avg_angle else 0,
            "max_angle": round(r.max_angle, 1) if r.max_angle else 0,
            "target": round(r.target, 1) if r.target else 0,
            "reps": r.reps,
            "avg_deviation": round(r.avg_deviation, 1) if r.avg_deviation else 0,
        }
        for r in rows
    ]


@router.get("/joint-live-stats")
def get_joint_live_stats(
    joint: str = Query(default="knee_left", description="Joint to track"),
    sessions: int = Query(default=10, le=30, description="Number of recent sessions"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Live graph data: last N sessions for a joint.
    Returns Chart.js-compatible labels + datasets including daily best,
    mean angle, target line, and highlights the session with the highest angle.
    """
    from datetime import date as _date, timedelta

    rows = (
        db.query(
            models.JointLog.session_id,
            func.min(models.Session.started_at).label("date"),
            func.avg(models.JointLog.angle).label("mean_angle"),
            func.max(models.JointLog.angle).label("max_angle"),
            func.avg(models.JointLog.target).label("target"),
            func.count(models.JointLog.id).label("reps"),
        )
        .join(models.Session, models.Session.id == models.JointLog.session_id)
        .filter(
            models.Session.user_id == current_user.id,
            models.JointLog.joint == joint,
        )
        .group_by(models.JointLog.session_id)
        .order_by(func.min(models.Session.started_at).desc())
        .limit(sessions)
        .all()
    )

    rows = list(reversed(rows))   # chronological order

    if not rows:
        return {
            "joint": joint,
            "labels": [],
            "max_angles": [],
            "mean_angles": [],
            "target": [],
            "highlight_index": None,
            "today_best": None,
            "yesterday_best": None,
            "total_gain": None,
        }

    labels, max_angles, mean_angles, targets = [], [], [], []
    today     = _date.today()
    yesterday = today - timedelta(days=1)
    today_best, yesterday_best = None, None

    for i, r in enumerate(rows):
        dt = r.date.date() if r.date else None
        labels.append(f"S{i+1}" if not dt else r.date.strftime("%b %d"))
        max_a  = round(r.max_angle, 1) if r.max_angle else 0
        mean_a = round(r.mean_angle, 1) if r.mean_angle else 0
        tgt    = round(r.target, 1) if r.target else 90
        max_angles.append(max_a)
        mean_angles.append(mean_a)
        targets.append(tgt)

        if dt == today and (today_best is None or max_a > today_best):
            today_best = max_a
        if dt == yesterday and (yesterday_best is None or max_a > yesterday_best):
            yesterday_best = max_a

    # Index of the session with the highest max angle (gold star)
    highlight_index = int(max_angles.index(max(max_angles))) if max_angles else None

    total_gain = None
    if today_best is not None and yesterday_best is not None:
        total_gain = round(today_best - yesterday_best, 1)
    elif len(max_angles) >= 2:
        total_gain = round(max_angles[-1] - max_angles[0], 1)

    return {
        "joint": joint,
        "labels": labels,
        "max_angles": max_angles,
        "mean_angles": mean_angles,
        "target": targets,
        "highlight_index": highlight_index,
        "today_best": today_best,
        "yesterday_best": yesterday_best,
        "total_gain": total_gain,
    }


@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Aggregated dashboard data for the patient."""
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.started_at.desc())
        .limit(21)
        .all()
    )
    recovery_scores = (
        db.query(models.RecoveryScore)
        .filter(models.RecoveryScore.user_id == current_user.id)
        .order_by(models.RecoveryScore.date.asc())
        .all()
    )
    latest_score = recovery_scores[-1].composite_score if recovery_scores else None
    total_sessions = db.query(models.Session).filter(models.Session.user_id == current_user.id).count()

    return {
        "user": {"id": current_user.id, "name": current_user.full_name, "role": current_user.role},
        "latest_recovery_score": latest_score,
        "total_sessions": total_sessions,
        "recent_sessions": [
            {
                "id": s.id,
                "type": s.session_type,
                "started_at": s.started_at,
                "duration_s": s.duration_s,
                "recovery_score": s.recovery_score,
                "physical_score": s.physical_score,
            }
            for s in sessions
        ],
        "recovery_trend": [
            {"date": r.date, "composite": r.composite_score, "physical": r.physical_score, "cognitive": r.cognitive_score}
            for r in recovery_scores
        ],
    }
