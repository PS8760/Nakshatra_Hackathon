from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
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
