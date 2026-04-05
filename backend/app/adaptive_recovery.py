"""
Adaptive Recovery Module
========================
Standalone decision engine — reads from existing JointLog, PainEvent,
ExerciseConfig tables. Does NOT modify any existing function.

Two public functions:
    profile_user(user_id, joint, db)  -> RecoveryProfile
    detect_relapse(user_id, joint, db) -> RelapseResult

Recovery Profiling:
    Analyses the last 5 days of JointLog data.
    Daily best angle per day → compute day-over-day improvements.
    avg_improvement < 2°  → "Gradual"
    avg_improvement > 5°  → "Fast"
    otherwise             → "Moderate"

    If "Gradual": ExerciseConfig.target_date pushed forward 7 days
    (target_date is a new optional column — added via ALTER if missing,
     never touches existing columns).

Relapse Detection (Safety Trigger):
    Condition A: today's max angle < (yesterday's max angle × 0.90)
                 i.e. more than 10% regression
    Condition B: today's max pain intensity > yesterday's max pain intensity

    Both A AND B → relapse confirmed.
    Either alone → "warning" (soft alert).

    Returns RelapseResult with:
        - relapse: bool
        - severity: "none" | "warning" | "critical"
        - ui_color: hex string for dashboard
        - voice_message: string for Web Speech API
        - doctor_flag: "normal" | "high_priority"
        - details: dict with the raw numbers
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session as DBSession

from app import models

logger = logging.getLogger(__name__)

# ── Thresholds ────────────────────────────────────────────────────────────────
GRADUAL_THRESHOLD_DEG  = 2.0   # avg daily improvement below this → Gradual
FAST_THRESHOLD_DEG     = 5.0   # avg daily improvement above this → Fast
RELAPSE_ANGLE_DROP_PCT = 0.10  # 10% drop in max angle triggers condition A
GRADUAL_RESCHEDULE_DAYS = 7    # days to push target forward for Gradual users
PROFILE_WINDOW_DAYS    = 5     # days of history to analyse


# ── Data classes (no DB models — pure Python) ─────────────────────────────────

@dataclass
class DailySnapshot:
    date: date
    max_angle: float
    mean_angle: float
    max_pain: int        # 0 if no pain events that day
    session_count: int


@dataclass
class RecoveryProfile:
    user_id: int
    joint: str
    label: str                          # "Gradual" | "Moderate" | "Fast" | "Insufficient Data"
    avg_daily_improvement: float        # degrees/day over last 5 days
    days_analysed: int
    snapshots: list[DailySnapshot]
    target_rescheduled: bool = False
    new_target_date: Optional[str] = None
    current_target_rom: Optional[float] = None
    message: str = ""


@dataclass
class RelapseResult:
    user_id: int
    joint: str
    relapse: bool
    severity: str                       # "none" | "warning" | "critical"
    ui_color: str                       # hex — green / amber / orange
    voice_message: str
    doctor_flag: str                    # "normal" | "high_priority"
    details: dict = field(default_factory=dict)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_daily_snapshots(
    user_id: int,
    joint: str,
    db: DBSession,
    days: int = PROFILE_WINDOW_DAYS,
) -> list[DailySnapshot]:
    """
    Build a list of DailySnapshot for the last `days` calendar days.
    Uses existing JointLog and PainEvent tables — no schema changes.
    """
    today = date.today()
    snapshots: list[DailySnapshot] = []

    for offset in range(days - 1, -1, -1):   # oldest → newest
        day = today - timedelta(days=offset)
        day_start = f"{day.isoformat()} 00:00:00"
        day_end   = f"{day.isoformat()} 23:59:59"

        # Max and mean angle for this joint on this day
        row = (
            db.query(
                func.max(models.JointLog.angle).label("max_angle"),
                func.avg(models.JointLog.angle).label("mean_angle"),
                func.count(models.JointLog.id).label("rep_count"),
            )
            .join(models.Session, models.Session.id == models.JointLog.session_id)
            .filter(
                models.Session.user_id == user_id,
                models.JointLog.joint == joint,
                models.JointLog.ts >= day_start,
                models.JointLog.ts <= day_end,
            )
            .first()
        )

        # Max pain intensity for this day
        pain_row = (
            db.query(func.max(models.PainEvent.intensity).label("max_pain"))
            .filter(
                models.PainEvent.user_id == user_id,
                models.PainEvent.ts >= day_start,
                models.PainEvent.ts <= day_end,
            )
            .first()
        )

        # Count sessions that day
        session_count = (
            db.query(func.count(models.Session.id))
            .filter(
                models.Session.user_id == user_id,
                models.Session.started_at >= day_start,
                models.Session.started_at <= day_end,
            )
            .scalar() or 0
        )

        snapshots.append(DailySnapshot(
            date=day,
            max_angle=round(row.max_angle or 0.0, 1),
            mean_angle=round(row.mean_angle or 0.0, 1),
            max_pain=int(pain_row.max_pain or 0),
            session_count=int(session_count),
        ))

    return snapshots


def _ensure_target_date_column(db: DBSession) -> None:
    """
    Safely add target_date column to exercise_configs if it doesn't exist.
    Uses raw SQL so it never touches SQLAlchemy model definitions.
    """
    try:
        db.execute(text(
            "ALTER TABLE exercise_configs ADD COLUMN target_date TEXT"
        ))
        db.commit()
    except Exception:
        db.rollback()   # column already exists — ignore


# ── Public API ────────────────────────────────────────────────────────────────

def profile_user(
    user_id: int,
    joint: str,
    db: DBSession,
    reschedule_if_gradual: bool = True,
) -> RecoveryProfile:
    """
    Analyse the last 5 days of JointLog data for a user+joint pair.

    Returns a RecoveryProfile with:
        label: "Gradual" | "Moderate" | "Fast" | "Insufficient Data"
        avg_daily_improvement: mean day-over-day angle gain (degrees)
        target_rescheduled: True if target_date was pushed forward

    Does NOT modify any existing column. Only writes to target_date
    (added dynamically if absent).
    """
    snapshots = _get_daily_snapshots(user_id, joint, db, days=PROFILE_WINDOW_DAYS)

    # Filter to days that had actual sessions
    active = [s for s in snapshots if s.max_angle > 0]

    if len(active) < 2:
        return RecoveryProfile(
            user_id=user_id, joint=joint,
            label="Insufficient Data",
            avg_daily_improvement=0.0,
            days_analysed=len(active),
            snapshots=snapshots,
            message="Need at least 2 active days to profile recovery speed.",
        )

    # Day-over-day improvements
    improvements = [
        active[i].max_angle - active[i - 1].max_angle
        for i in range(1, len(active))
    ]
    avg_improvement = sum(improvements) / len(improvements)

    if avg_improvement < GRADUAL_THRESHOLD_DEG:
        label = "Gradual"
    elif avg_improvement > FAST_THRESHOLD_DEG:
        label = "Fast"
    else:
        label = "Moderate"

    # Fetch current ExerciseConfig
    config = (
        db.query(models.ExerciseConfig)
        .filter(
            models.ExerciseConfig.user_id == user_id,
            models.ExerciseConfig.joint == joint,
        )
        .first()
    )

    target_rescheduled = False
    new_target_date = None

    if label == "Gradual" and reschedule_if_gradual and config:
        _ensure_target_date_column(db)
        try:
            # Read existing target_date (may be None)
            row = db.execute(
                text("SELECT target_date FROM exercise_configs WHERE id = :id"),
                {"id": config.id},
            ).fetchone()
            existing = row[0] if row and row[0] else None

            if existing:
                base = date.fromisoformat(existing)
            else:
                base = date.today()

            new_date = base + timedelta(days=GRADUAL_RESCHEDULE_DAYS)
            new_target_date = new_date.isoformat()

            db.execute(
                text("UPDATE exercise_configs SET target_date = :td WHERE id = :id"),
                {"td": new_target_date, "id": config.id},
            )
            db.commit()
            target_rescheduled = True
            logger.info(
                "profile_user: user=%d joint=%s label=Gradual → target_date pushed to %s",
                user_id, joint, new_target_date,
            )
        except Exception as e:
            db.rollback()
            logger.warning("profile_user: could not reschedule target_date: %s", e)

    msg_map = {
        "Gradual":  f"Recovery is gradual ({avg_improvement:+.1f}°/day). Target date extended by {GRADUAL_RESCHEDULE_DAYS} days.",
        "Moderate": f"Recovery is on track ({avg_improvement:+.1f}°/day). Keep up the current routine.",
        "Fast":     f"Excellent progress ({avg_improvement:+.1f}°/day)! Consider increasing exercise intensity.",
        "Insufficient Data": "Not enough data yet.",
    }

    return RecoveryProfile(
        user_id=user_id,
        joint=joint,
        label=label,
        avg_daily_improvement=round(avg_improvement, 2),
        days_analysed=len(active),
        snapshots=snapshots,
        target_rescheduled=target_rescheduled,
        new_target_date=new_target_date,
        current_target_rom=config.target_rom if config else None,
        message=msg_map.get(label, ""),
    )


def detect_relapse(
    user_id: int,
    joint: str,
    db: DBSession,
) -> RelapseResult:
    """
    Safety trigger: compare today vs yesterday for angle regression + pain increase.

    Condition A: today's max angle < yesterday's max angle × (1 - RELAPSE_ANGLE_DROP_PCT)
    Condition B: today's max pain > yesterday's max pain

    Both A + B  → severity "critical"  (relapse confirmed)
    A only      → severity "warning"   (angle drop, monitor)
    B only      → severity "warning"   (pain increase, monitor)
    Neither     → severity "none"

    Returns RelapseResult — never raises, never modifies existing data.
    """
    snapshots = _get_daily_snapshots(user_id, joint, db, days=2)
    yesterday_snap = snapshots[0]   # older
    today_snap     = snapshots[1]   # newer

    today_angle     = today_snap.max_angle
    yesterday_angle = yesterday_snap.max_angle
    today_pain      = today_snap.max_pain
    yesterday_pain  = yesterday_snap.max_pain

    # Condition A: significant angle regression
    angle_threshold = yesterday_angle * (1.0 - RELAPSE_ANGLE_DROP_PCT)
    condition_a = (
        yesterday_angle > 0
        and today_angle > 0
        and today_angle < angle_threshold
    )

    # Condition B: pain increased
    condition_b = (
        today_pain > 0
        and yesterday_pain > 0
        and today_pain > yesterday_pain
    )

    # Also trigger if pain jumped from 0 to ≥ 7 (new severe pain)
    condition_b_severe = today_pain >= 7 and yesterday_pain == 0

    if condition_a and (condition_b or condition_b_severe):
        severity     = "critical"
        relapse      = True
        ui_color     = "#f97316"   # Warning Orange
        doctor_flag  = "high_priority"
        voice_message = (
            "Sudden regression detected. "
            "Please stop exercises and consult your physiotherapist immediately."
        )
    elif condition_a:
        severity     = "warning"
        relapse      = False
        ui_color     = "#eab308"   # Amber
        doctor_flag  = "normal"
        voice_message = (
            f"Your {joint.replace('_', ' ')} angle has dropped significantly today. "
            "Consider reducing exercise intensity."
        )
    elif condition_b or condition_b_severe:
        severity     = "warning"
        relapse      = False
        ui_color     = "#eab308"
        doctor_flag  = "normal"
        voice_message = (
            "Increased pain reported today. "
            "Monitor carefully and rest if needed."
        )
    else:
        severity     = "none"
        relapse      = False
        ui_color     = "#22c55e"   # Green — all clear
        doctor_flag  = "normal"
        voice_message = ""

    return RelapseResult(
        user_id=user_id,
        joint=joint,
        relapse=relapse,
        severity=severity,
        ui_color=ui_color,
        voice_message=voice_message,
        doctor_flag=doctor_flag,
        details={
            "today_angle":      today_angle,
            "yesterday_angle":  yesterday_angle,
            "angle_threshold":  round(angle_threshold, 1),
            "angle_drop_pct":   round((1 - today_angle / yesterday_angle) * 100, 1) if yesterday_angle > 0 else 0,
            "today_pain":       today_pain,
            "yesterday_pain":   yesterday_pain,
            "condition_a":      condition_a,
            "condition_b":      condition_b or condition_b_severe,
        },
    )
