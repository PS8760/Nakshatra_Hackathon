"""
Exercise Plan Router
====================
GET /exercises/plan/{joint}
    Returns the user's current exercise level, next progression,
    and available variations — based on their actual achieved ROM.

GET /exercises/library/{joint}
    Returns the full progression chain for a joint (for display).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.exercise_library import (
    EXERCISE_CHAINS,
    get_current_level,
    get_next_level,
    get_easier_variation,
    get_harder_variation,
)

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _level_to_dict(level) -> dict:
    if level is None:
        return None
    return {
        "level":         level.level,
        "name":          level.name,
        "emoji":         level.emoji,
        "description":   level.description,
        "rom_threshold": level.rom_threshold,
        "sets":          level.sets,
        "reps":          level.reps,
        "hold_s":        level.hold_s,
        "cues":          level.cues,
        "variations": [
            {
                "name":        v.name,
                "description": v.description,
                "easier":      v.easier,
                "equipment":   v.equipment,
            }
            for v in level.variations
        ],
    }


@router.get("/plan/{joint}")
def get_exercise_plan(
    joint: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Personalised exercise plan for a joint based on the user's achieved ROM.

    Logic:
    1. Query the user's best achieved angle for this joint (from JointLog)
    2. Look up the appropriate level in the progression chain
    3. Return current level + next level + easier/harder variations
    4. Include progress % toward the next threshold
    """
    if joint not in EXERCISE_CHAINS:
        return {
            "joint": joint,
            "error": f"No exercise chain defined for joint '{joint}'.",
            "supported": list(EXERCISE_CHAINS.keys()),
        }

    # Best achieved ROM for this user + joint
    best_angle_row = (
        db.query(func.max(models.JointLog.angle).label("best"))
        .join(models.Session, models.Session.id == models.JointLog.session_id)
        .filter(
            models.Session.user_id == current_user.id,
            models.JointLog.joint == joint,
        )
        .first()
    )
    achieved_rom = float(best_angle_row.best or 0.0)

    # Current ExerciseConfig target (from existing adaptive system)
    config = (
        db.query(models.ExerciseConfig)
        .filter(
            models.ExerciseConfig.user_id == current_user.id,
            models.ExerciseConfig.joint == joint,
        )
        .first()
    )
    target_rom = config.target_rom if config else 90.0

    # Determine current level
    current = get_current_level(joint, achieved_rom)
    nxt     = get_next_level(joint, current.level) if current else None
    easier  = get_easier_variation(current) if current else None
    harder  = get_harder_variation(current) if current else None

    # Progress toward next threshold
    if current and nxt:
        prev_threshold = EXERCISE_CHAINS[joint][current.level - 2].rom_threshold if current.level > 1 else 0.0
        span = current.rom_threshold - prev_threshold
        progress_pct = round(min(100, max(0, (achieved_rom - prev_threshold) / span * 100)), 1) if span > 0 else 100.0
    else:
        progress_pct = 100.0

    return {
        "joint":          joint,
        "achieved_rom":   round(achieved_rom, 1),
        "target_rom":     round(target_rom, 1),
        "current":        _level_to_dict(current),
        "next":           _level_to_dict(nxt),
        "easier_option":  {"name": easier.name, "description": easier.description, "equipment": easier.equipment} if easier else None,
        "harder_option":  {"name": harder.name, "description": harder.description, "equipment": harder.equipment} if harder else None,
        "progress_to_next_pct": progress_pct,
        "at_max_level":   nxt is None,
        "total_levels":   len(EXERCISE_CHAINS[joint]),
    }


@router.get("/library/{joint}")
def get_exercise_library(
    joint: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Full progression chain for a joint — used to render the roadmap UI."""
    chain = EXERCISE_CHAINS.get(joint)
    if not chain:
        return {"joint": joint, "chain": []}

    best_row = (
        db.query(func.max(models.JointLog.angle).label("best"))
        .join(models.Session, models.Session.id == models.JointLog.session_id)
        .filter(
            models.Session.user_id == current_user.id,
            models.JointLog.joint == joint,
        )
        .first()
    )
    achieved = float(best_row.best or 0.0)

    return {
        "joint":        joint,
        "achieved_rom": round(achieved, 1),
        "chain": [
            {
                **_level_to_dict(lvl),
                "unlocked": achieved >= (EXERCISE_CHAINS[joint][lvl.level - 2].rom_threshold if lvl.level > 1 else 0),
                "completed": achieved >= lvl.rom_threshold,
            }
            for lvl in chain
        ],
    }
