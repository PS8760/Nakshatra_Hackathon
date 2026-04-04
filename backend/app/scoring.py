"""
Recovery Score Algorithm
========================
Recovery Score = (0.60 × Physical ROM Score) + (0.40 × Cognitive Score)
Physical ROM Score = avg(joint ROM achieved / target ROM) across all exercises
Cognitive Score = weighted avg of accuracy and reaction time across active mini-games

Adaptive Difficulty:
- 3-session rolling window
- If rolling avg > 85% for 3 consecutive sessions → level up (+5 degrees ROM)
- If rolling avg < 50% → supportive prompt, optionally reduce difficulty
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app import models
from datetime import date


PHYSICAL_WEIGHT = 0.60
COGNITIVE_WEIGHT = 0.40
LEVEL_UP_THRESHOLD = 0.85
LEVEL_DOWN_THRESHOLD = 0.50
ROM_INCREMENT_DEGREES = 5.0
ROLLING_WINDOW = 3


def compute_physical_score(joint_logs: List[models.JointLog]) -> float:
    """
    For each rep, compute ratio of achieved angle to target.
    Capped at 1.0 (can't score above 100%).
    Returns 0-100 float.
    """
    if not joint_logs:
        return 0.0
    ratios = []
    for log in joint_logs:
        if log.target and log.target > 0:
            ratio = min(log.angle / log.target, 1.0)
            ratios.append(ratio)
    if not ratios:
        return 0.0
    return round(sum(ratios) / len(ratios) * 100, 2)


def compute_cognitive_score(cognitive_logs: List[models.CognitiveLog]) -> float:
    """
    Weighted average of accuracy (70%) and normalised reaction time (30%).
    Reaction time normalised: 300ms = 100%, 2000ms = 0%.
    Returns 0-100 float.
    """
    if not cognitive_logs:
        return 0.0
    scores = []
    for log in cognitive_logs:
        accuracy_score = (log.accuracy or 0) * 100
        if log.reaction_ms:
            rt_score = max(0, min(100, (1 - (log.reaction_ms - 300) / 1700) * 100))
        else:
            rt_score = accuracy_score
        weighted = 0.7 * accuracy_score + 0.3 * rt_score
        scores.append(weighted)
    return round(sum(scores) / len(scores), 2)


def compute_composite_score(physical: Optional[float], cognitive: Optional[float]) -> float:
    """Composite = 60% physical + 40% cognitive. Handles missing tracks."""
    if physical is None and cognitive is None:
        return 0.0
    if physical is None:
        return round(cognitive * COGNITIVE_WEIGHT / (COGNITIVE_WEIGHT) , 2)
    if cognitive is None:
        return round(physical * PHYSICAL_WEIGHT / (PHYSICAL_WEIGHT), 2)
    return round(PHYSICAL_WEIGHT * physical + COGNITIVE_WEIGHT * cognitive, 2)


def check_and_apply_adaptive_difficulty(user_id: int, joint: str, db: Session) -> dict:
    """
    Check last ROLLING_WINDOW sessions for this joint.
    Returns action: 'level_up' | 'level_down' | 'maintain' and new target_rom.
    """
    config = db.query(models.ExerciseConfig).filter(
        models.ExerciseConfig.user_id == user_id,
        models.ExerciseConfig.joint == joint
    ).first()

    if not config:
        return {"action": "maintain", "target_rom": 90.0}

    # Get last N sessions' physical scores for this user
    recent_sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == user_id, models.Session.physical_score.isnot(None))
        .order_by(models.Session.started_at.desc())
        .limit(ROLLING_WINDOW)
        .all()
    )

    if len(recent_sessions) < ROLLING_WINDOW:
        return {"action": "maintain", "target_rom": config.target_rom}

    avg_score = sum(s.physical_score for s in recent_sessions) / len(recent_sessions)

    if avg_score >= LEVEL_UP_THRESHOLD * 100:
        config.consecutive_successes += 1
        if config.consecutive_successes >= ROLLING_WINDOW:
            config.target_rom += ROM_INCREMENT_DEGREES
            config.consecutive_successes = 0
            db.commit()
            return {"action": "level_up", "target_rom": config.target_rom}
    elif avg_score < LEVEL_DOWN_THRESHOLD * 100:
        config.consecutive_successes = 0
        db.commit()
        return {"action": "level_down", "target_rom": config.target_rom}
    else:
        config.consecutive_successes = 0
        db.commit()

    return {"action": "maintain", "target_rom": config.target_rom}


def upsert_daily_recovery_score(user_id: int, session: models.Session, db: Session):
    """Update or create today's aggregate recovery score."""
    today = date.today().isoformat()
    record = db.query(models.RecoveryScore).filter(
        models.RecoveryScore.user_id == user_id,
        models.RecoveryScore.date == today
    ).first()

    composite = compute_composite_score(session.physical_score, session.cognitive_score)

    if record:
        # Average with existing day score
        if session.physical_score is not None:
            record.physical_score = (
                ((record.physical_score or 0) + session.physical_score) / 2
            )
        if session.cognitive_score is not None:
            record.cognitive_score = (
                ((record.cognitive_score or 0) + session.cognitive_score) / 2
            )
        record.composite_score = compute_composite_score(record.physical_score, record.cognitive_score)
    else:
        record = models.RecoveryScore(
            user_id=user_id,
            date=today,
            physical_score=session.physical_score,
            cognitive_score=session.cognitive_score,
            composite_score=composite,
        )
        db.add(record)

    db.commit()
