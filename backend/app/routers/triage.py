"""
Triage Router
=============
POST /triage/intake
    Accepts pre-session intake form data.
    Saves pain event to existing PainEvent table (for correlation tracking).
    Returns personalised SessionConfig JSON.

GET /triage/last-intake
    Returns the user's most recent intake data for pre-filling the form.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.session_adjuster import adjust_session_plan, TriageInput

router = APIRouter(prefix="/triage", tags=["triage"])


class IntakeRequest(BaseModel):
    pain_intensity:        int    = 0      # 1–10, 0 = no pain
    yesterday_experience:  str    = "okay" # good | okay | bad | no_session
    pain_joint:            str    = "none" # joint name or "none"
    mood:                  str    = "neutral"
    notes:                 str    = ""
    session_id:            Optional[int] = None   # attach to existing session if provided


@router.post("/intake")
def submit_intake(
    payload: IntakeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Process pre-session intake and return a personalised session plan.

    Side effects (using existing tables only):
    - If pain_intensity > 0 and pain_joint != "none":
        saves a PainEvent row (session_id=-1 as pre-session marker,
        or the provided session_id)
    """
    # ── Save intake pain to PainEvent for correlation tracking ────────────────
    if payload.pain_intensity > 0 and payload.pain_joint != "none":
        # Use session_id=0 as a sentinel for pre-session pain
        # (avoids FK violation — we use a nullable workaround via notes)
        # Instead: find the user's most recent session to attach to
        recent_session = (
            db.query(models.Session)
            .filter(models.Session.user_id == current_user.id)
            .order_by(models.Session.started_at.desc())
            .first()
        )
        if recent_session or payload.session_id:
            sid = payload.session_id or recent_session.id
            pain_event = models.PainEvent(
                session_id=sid,
                user_id=current_user.id,
                joint=payload.pain_joint,
                intensity=payload.pain_intensity,
                note=f"[PRE-SESSION TRIAGE] {payload.notes or ''} | mood={payload.mood} | yesterday={payload.yesterday_experience}",
            )
            db.add(pain_event)
            db.commit()

    # ── Get user's known pain joints (for new-area detection) ─────────────────
    known_joints = (
        db.query(models.PainEvent.joint)
        .filter(models.PainEvent.user_id == current_user.id)
        .distinct()
        .all()
    )
    known_pain_joints = [r[0] for r in known_joints]

    # ── Run decision engine ───────────────────────────────────────────────────
    intake = TriageInput(
        pain_intensity=payload.pain_intensity,
        yesterday_experience=payload.yesterday_experience,
        pain_joint=payload.pain_joint,
        mood=payload.mood,
        notes=payload.notes,
    )
    config = adjust_session_plan(intake, known_pain_joints)

    return {
        "session_type":       config.session_type,
        "label":              config.label,
        "emoji":              config.emoji,
        "duration_min":       config.duration_min,
        "duration_s":         config.duration_s,
        "angle_target_pct":   config.angle_target_pct,
        "rep_target":         config.rep_target,
        "intensity":          config.intensity,
        "focus":              config.focus,
        "color":              config.color,
        "description":        config.description,
        "voice_intro":        config.voice_intro,
        "physio_flag":        config.physio_flag,
        "physio_flag_reason": config.physio_flag_reason,
        "new_pain_area":      config.new_pain_area,
        "triage_input":       config.triage_input,
    }


@router.get("/last-intake")
def get_last_intake(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Return the most recent pre-session pain event for form pre-filling."""
    last = (
        db.query(models.PainEvent)
        .filter(
            models.PainEvent.user_id == current_user.id,
            models.PainEvent.note.like("%PRE-SESSION TRIAGE%"),
        )
        .order_by(models.PainEvent.ts.desc())
        .first()
    )
    if not last:
        return {"has_previous": False}

    return {
        "has_previous":  True,
        "joint":         last.joint,
        "intensity":     last.intensity,
        "ts":            last.ts.isoformat() if last.ts else None,
    }
