"""
Session Adjuster — Pre-Session Triage Decision Engine
======================================================
Pure function: takes intake data → returns a SessionConfig JSON.

Rules:
    pain > 7                        → Recovery Session
    pain < 3 AND yesterday == good  → Progression Session
    new pain area detected          → Standard + physio flag
    otherwise                       → Standard Session

Does NOT touch any existing table or function.
Intake data is saved to PainEvent (existing table) for correlation tracking.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ── Session type configs ──────────────────────────────────────────────────────

SESSION_CONFIGS = {
    "recovery": {
        "session_type":       "recovery",
        "label":              "Recovery Session",
        "emoji":              "🌿",
        "duration_min":       10,
        "duration_s":         600,
        "angle_target_pct":   0.70,   # 70% of normal target ROM
        "rep_target":         6,
        "intensity":          "low",
        "focus":              "stretching",
        "color":              "#f97316",
        "description":        "Gentle stretching only. Stop immediately if pain increases.",
        "voice_intro":        "High pain detected. Starting a gentle recovery session. Focus on slow, controlled stretches.",
    },
    "progression": {
        "session_type":       "progression",
        "label":              "Progression Session",
        "emoji":              "🚀",
        "duration_min":       30,
        "duration_s":         1800,
        "angle_target_pct":   1.10,   # 110% of normal target — push for new max
        "rep_target":         12,
        "intensity":          "high",
        "focus":              "strength",
        "color":              "#22c55e",
        "description":        "You're feeling great! Push for new personal bests today.",
        "voice_intro":        "Excellent condition detected. Starting a progression session. Let's push for new records!",
    },
    "standard": {
        "session_type":       "standard",
        "label":              "Standard Session",
        "emoji":              "💪",
        "duration_min":       20,
        "duration_s":         1200,
        "angle_target_pct":   1.00,   # normal target
        "rep_target":         10,
        "intensity":          "moderate",
        "focus":              "rehabilitation",
        "color":              "#0fffc5",
        "description":        "Steady rehabilitation session at your current target.",
        "voice_intro":        "Starting your standard rehabilitation session. Maintain good form throughout.",
    },
}

KNOWN_JOINTS = {
    "knee_left", "knee_right",
    "elbow_left", "elbow_right",
    "shoulder_left", "shoulder_right",
    "hip_left", "hip_right",
    "wrist_left", "wrist_right",
    "ankle_left", "ankle_right",
}


@dataclass
class TriageInput:
    """Intake form data from the pre-session modal."""
    pain_intensity: int          # 1–10
    yesterday_experience: str    # "good" | "okay" | "bad" | "no_session"
    pain_joint: str              # joint name or "none"
    mood: str = "neutral"        # "great" | "good" | "neutral" | "tired" | "bad"
    notes: str = ""


@dataclass
class SessionConfig:
    """Personalised session plan returned to the frontend."""
    session_type: str
    label: str
    emoji: str
    duration_min: int
    duration_s: int
    angle_target_pct: float
    rep_target: int
    intensity: str
    focus: str
    color: str
    description: str
    voice_intro: str
    physio_flag: bool = False
    physio_flag_reason: str = ""
    new_pain_area: bool = False
    triage_input: dict = field(default_factory=dict)


def adjust_session_plan(intake: TriageInput, known_pain_joints: list[str] = None) -> SessionConfig:
    """
    Decision engine: maps intake data to a personalised SessionConfig.

    Args:
        intake:            TriageInput from the pre-session modal
        known_pain_joints: list of joints the user has previously reported pain in
                           (pulled from PainEvent history by the router)

    Returns:
        SessionConfig with duration, targets, and voice intro.
    """
    known_pain_joints = known_pain_joints or []
    physio_flag = False
    physio_flag_reason = ""
    new_pain_area = False

    # ── Detect new pain area ──────────────────────────────────────────────────
    if (
        intake.pain_joint != "none"
        and intake.pain_joint in KNOWN_JOINTS
        and intake.pain_joint not in known_pain_joints
        and intake.pain_intensity >= 3
    ):
        new_pain_area = True
        physio_flag = True
        physio_flag_reason = (
            f"New pain area reported: {intake.pain_joint.replace('_', ' ')} "
            f"(intensity {intake.pain_intensity}/10). Physiotherapist review recommended."
        )

    # ── Select session type ───────────────────────────────────────────────────
    if intake.pain_intensity > 7:
        cfg_key = "recovery"
        if not physio_flag_reason:
            physio_flag = True
            physio_flag_reason = f"Pain intensity {intake.pain_intensity}/10 — above safe exercise threshold."

    elif intake.pain_intensity < 3 and intake.yesterday_experience == "good":
        cfg_key = "progression"

    else:
        cfg_key = "standard"

    # Mood modifier — tired/bad mood → drop to standard even if progression eligible
    if intake.mood in ("tired", "bad") and cfg_key == "progression":
        cfg_key = "standard"

    base = SESSION_CONFIGS[cfg_key].copy()

    # Personalise voice intro for new pain area
    if new_pain_area:
        base["voice_intro"] = (
            f"New pain detected in your {intake.pain_joint.replace('_', ' ')}. "
            "Your physiotherapist has been flagged. Proceeding with a modified session."
        )

    return SessionConfig(
        **base,
        physio_flag=physio_flag,
        physio_flag_reason=physio_flag_reason,
        new_pain_area=new_pain_area,
        triage_input={
            "pain_intensity":       intake.pain_intensity,
            "yesterday_experience": intake.yesterday_experience,
            "pain_joint":           intake.pain_joint,
            "mood":                 intake.mood,
            "notes":                intake.notes,
        },
    )
