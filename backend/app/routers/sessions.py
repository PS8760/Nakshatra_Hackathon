from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.scoring import (
    compute_physical_score,
    compute_cognitive_score,
    compute_composite_score,
    upsert_daily_recovery_score,
    check_and_apply_adaptive_difficulty,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=schemas.SessionOut, status_code=201)
def create_session(
    payload: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = models.Session(user_id=current_user.id, session_type=payload.session_type)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=List[schemas.SessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.started_at.desc())
        .all()
    )


@router.get("/{session_id}", response_model=schemas.SessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/{session_id}/end", response_model=schemas.SessionOut)
def end_session(
    session_id: int,
    payload: schemas.SessionEnd,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.utcnow()
    session.duration_s = payload.duration_s

    # Compute scores from stored logs if not provided
    if payload.physical_score is not None:
        session.physical_score = payload.physical_score
    else:
        session.physical_score = compute_physical_score(session.joint_logs)

    if payload.cognitive_score is not None:
        session.cognitive_score = payload.cognitive_score
    else:
        session.cognitive_score = compute_cognitive_score(session.cognitive_logs)

    session.recovery_score = compute_composite_score(session.physical_score, session.cognitive_score)

    db.commit()
    db.refresh(session)

    # Update daily aggregate
    upsert_daily_recovery_score(current_user.id, session, db)

    # Check adaptive difficulty for each joint in this session
    joints_in_session = {log.joint for log in session.joint_logs}
    for joint in joints_in_session:
        check_and_apply_adaptive_difficulty(current_user.id, joint, db)

    return session


@router.post("/{session_id}/joint-logs", response_model=schemas.JointLogOut, status_code=201)
def add_joint_log(
    session_id: int,
    payload: schemas.JointLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    log = models.JointLog(session_id=session_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{session_id}/joint-logs", response_model=List[schemas.JointLogOut])
def get_joint_logs(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.joint_logs


@router.post("/{session_id}/pain", response_model=schemas.PainEventOut, status_code=201)
def log_pain(
    session_id: int,
    payload: schemas.PainEventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    event = models.PainEvent(
        session_id=session_id,
        user_id=current_user.id,
        joint=payload.joint,
        intensity=payload.intensity,
        note=payload.note,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
