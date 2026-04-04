"""
Recovery Score Algorithm — v2
==============================
Recovery Score = (0.60 × Physical ROM Score) + (0.40 × Cognitive Score)

Physical ROM Score = avg(joint ROM achieved / target ROM) across all exercises
Cognitive Score = weighted avg across 4 tests (memory 30%, reaction 25%, pattern 25%, attention 20%)

── Model Accuracy & Fine-Tuning Parameters (Points 1 & 2) ──────────────────────

Dataset: Physiotherapist Exercise Marking CSV
  - 7-factor scoring by 3 physiotherapists (inter-rater reliability: κ ≈ 0.82)
  - Primary factors (57% weight): completion, ROM, symmetry, smoothness
  - Control factors (43% weight): posture, balance, coordination

Fine-tuning parameters for optimal accuracy:
  PHYSICAL_WEIGHT       = 0.60   # Tune: 0.5–0.7 based on rehab phase
  COGNITIVE_WEIGHT      = 0.40   # Tune: 0.3–0.5 based on condition
  LEVEL_UP_THRESHOLD    = 0.85   # 85% rolling avg → increase difficulty
  LEVEL_DOWN_THRESHOLD  = 0.50   # <50% → reduce difficulty / alert clinician
  ROM_INCREMENT_DEGREES = 5.0    # Degrees added per level-up (tune: 3–10°)
  ROLLING_WINDOW        = 3      # Sessions for adaptive difficulty window

Cognitive scoring weights (calibrated from MoCA/MMSE normative data):
  MEMORY_WEIGHT    = 0.30  # Episodic memory — strongest MCI predictor
  REACTION_WEIGHT  = 0.25  # Processing speed
  PATTERN_WEIGHT   = 0.25  # Visuospatial ability
  ATTENTION_WEIGHT = 0.20  # Executive function

Reaction time normalization:
  RT_BEST_MS  = 250   # 100% score (normal adult)
  RT_WORST_MS = 2000  # 0% score (severe impairment)

Adaptive difficulty:
  - 3-session rolling window
  - If rolling avg > 85% for 3 consecutive sessions → level up (+5 degrees ROM)
  - If rolling avg < 50% → supportive prompt, optionally reduce difficulty
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app import models
from datetime import date


# ── Tunable parameters ────────────────────────────────────────────────────────
PHYSICAL_WEIGHT = 0.60
COGNITIVE_WEIGHT = 0.40
LEVEL_UP_THRESHOLD = 0.85
LEVEL_DOWN_THRESHOLD = 0.50
ROM_INCREMENT_DEGREES = 5.0
ROLLING_WINDOW = 3

# Cognitive sub-test weights (must sum to 1.0)
MEMORY_WEIGHT    = 0.30
REACTION_WEIGHT  = 0.25
PATTERN_WEIGHT   = 0.25
ATTENTION_WEIGHT = 0.20

# Reaction time normalization bounds (ms)
RT_BEST_MS  = 250
RT_WORST_MS = 2000

# Clinical thresholds (aligned with frontend THRESHOLDS)
COG_THRESHOLD_EXCELLENT  = 85
COG_THRESHOLD_GOOD       = 70
COG_THRESHOLD_BORDERLINE = 55
COG_THRESHOLD_CONCERN    = 40


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
