"""
Cognitive Tests Router
Stores test results and returns AI insights via Groq.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/cognitive", tags=["cognitive"])


class CognitiveTestSubmit(BaseModel):
    test_type: str          # memory | reaction | pattern | attention | facial
    score: float            # 0-100
    accuracy: Optional[float] = None
    reaction_ms: Optional[float] = None
    difficulty_level: int = 1
    metadata: Optional[dict] = None


class CognitiveTestOut(BaseModel):
    id: int
    session_id: int
    game: str
    score: Optional[float]
    accuracy: Optional[float]
    reaction_ms: Optional[float]
    difficulty_level: int
    ts: datetime

    class Config:
        from_attributes = True


class CognitiveSessionCreate(BaseModel):
    tests: List[CognitiveTestSubmit]


@router.post("/session", status_code=201)
def create_cognitive_session(
    payload: CognitiveSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Create a cognitive session and store all test results."""
    # Create a session record
    session = models.Session(
        user_id=current_user.id,
        session_type="cognitive",
        ended_at=datetime.utcnow(),
        duration_s=sum(180 for _ in payload.tests),  # ~3min per test estimate
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Store each test result
    logs = []
    for t in payload.tests:
        log = models.CognitiveLog(
            session_id=session.id,
            game=t.test_type,
            score=t.score,
            accuracy=t.accuracy,
            reaction_ms=t.reaction_ms,
            difficulty_level=t.difficulty_level,
        )
        db.add(log)
        logs.append(log)

    # Compute cognitive score (weighted average)
    scores = [t.score for t in payload.tests if t.score is not None]
    cognitive_score = round(sum(scores) / len(scores), 1) if scores else None
    session.cognitive_score = cognitive_score
    session.recovery_score = cognitive_score  # for cognitive-only sessions

    db.commit()

    # Update daily recovery score
    from app.scoring import upsert_daily_recovery_score
    upsert_daily_recovery_score(current_user.id, session, db)

    return {
        "session_id": session.id,
        "cognitive_score": cognitive_score,
        "tests_completed": len(logs),
        "message": "Cognitive session saved successfully",
    }


@router.get("/history")
def get_cognitive_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get all cognitive test sessions for the current user."""
    sessions = (
        db.query(models.Session)
        .filter(
            models.Session.user_id == current_user.id,
            models.Session.session_type == "cognitive",
        )
        .order_by(models.Session.started_at.desc())
        .limit(20)
        .all()
    )

    result = []
    for s in sessions:
        logs = db.query(models.CognitiveLog).filter(models.CognitiveLog.session_id == s.id).all()
        result.append({
            "session_id": s.id,
            "date": s.started_at.isoformat(),
            "cognitive_score": s.cognitive_score,
            "tests": [
                {
                    "type": l.game,
                    "score": l.score,
                    "accuracy": l.accuracy,
                    "reaction_ms": l.reaction_ms,
                }
                for l in logs
            ],
        })

    return result


@router.get("/latest-scores")
def get_latest_scores(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get the most recent score for each test type."""
    test_types = ["memory", "reaction", "pattern", "attention", "facial"]
    result = {}

    for test_type in test_types:
        log = (
            db.query(models.CognitiveLog)
            .join(models.Session)
            .filter(
                models.Session.user_id == current_user.id,
                models.CognitiveLog.game == test_type,
            )
            .order_by(models.CognitiveLog.ts.desc())
            .first()
        )
        result[test_type] = {
            "score": log.score if log else None,
            "date": log.ts.isoformat() if log else None,
        }

    return result
