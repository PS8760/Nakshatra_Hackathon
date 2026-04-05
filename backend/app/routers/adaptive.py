"""
Adaptive Recovery Router
========================
GET  /adaptive/profile/{joint}        — recovery profile + label
GET  /adaptive/relapse-check/{joint}  — safety trigger check
GET  /adaptive/status                 — combined profile + relapse for all joints
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.adaptive_recovery import profile_user, detect_relapse

router = APIRouter(prefix="/adaptive", tags=["adaptive"])

TRACKED_JOINTS = [
    "knee_left", "knee_right",
    "elbow_left", "elbow_right",
    "shoulder_left", "shoulder_right",
    "hip_left", "hip_right",
]


@router.get("/profile/{joint}")
def get_recovery_profile(
    joint: str,
    reschedule: bool = Query(default=True, description="Auto-reschedule if Gradual"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Analyse last 5 days of joint angle data and return recovery label.
    If label is 'Gradual', target_date is pushed forward 7 days automatically.
    """
    profile = profile_user(current_user.id, joint, db, reschedule_if_gradual=reschedule)
    return {
        "user_id":               profile.user_id,
        "joint":                 profile.joint,
        "label":                 profile.label,
        "avg_daily_improvement": profile.avg_daily_improvement,
        "days_analysed":         profile.days_analysed,
        "target_rescheduled":    profile.target_rescheduled,
        "new_target_date":       profile.new_target_date,
        "current_target_rom":    profile.current_target_rom,
        "message":               profile.message,
        "snapshots": [
            {
                "date":          s.date.isoformat(),
                "max_angle":     s.max_angle,
                "mean_angle":    s.mean_angle,
                "max_pain":      s.max_pain,
                "session_count": s.session_count,
            }
            for s in profile.snapshots
        ],
    }


@router.get("/relapse-check/{joint}")
def get_relapse_check(
    joint: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Safety trigger: check for angle regression + pain increase.
    Returns ui_color, voice_message, doctor_flag, and full details.
    """
    result = detect_relapse(current_user.id, joint, db)
    return {
        "user_id":       result.user_id,
        "joint":         result.joint,
        "relapse":       result.relapse,
        "severity":      result.severity,
        "ui_color":      result.ui_color,
        "voice_message": result.voice_message,
        "doctor_flag":   result.doctor_flag,
        "details":       result.details,
    }


@router.get("/status")
def get_adaptive_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Combined status across all tracked joints.
    Returns the worst-case relapse severity and all profiles.
    Designed to be called once on dashboard load.
    """
    profiles = []
    relapses = []
    worst_severity = "none"
    worst_color    = "#22c55e"
    worst_voice    = ""
    doctor_flag    = "normal"

    severity_rank = {"none": 0, "warning": 1, "critical": 2}

    for joint in TRACKED_JOINTS:
        try:
            p = profile_user(current_user.id, joint, db, reschedule_if_gradual=False)
            if p.label != "Insufficient Data":
                profiles.append({
                    "joint":   p.joint,
                    "label":   p.label,
                    "avg_improvement": p.avg_daily_improvement,
                    "message": p.message,
                })

            r = detect_relapse(current_user.id, joint, db)
            if r.severity != "none":
                relapses.append({
                    "joint":         r.joint,
                    "severity":      r.severity,
                    "ui_color":      r.ui_color,
                    "voice_message": r.voice_message,
                    "doctor_flag":   r.doctor_flag,
                    "details":       r.details,
                })
                if severity_rank.get(r.severity, 0) > severity_rank.get(worst_severity, 0):
                    worst_severity = r.severity
                    worst_color    = r.ui_color
                    worst_voice    = r.voice_message
                if r.doctor_flag == "high_priority":
                    doctor_flag = "high_priority"
        except Exception:
            continue

    return {
        "overall_severity": worst_severity,
        "ui_color":         worst_color,
        "voice_message":    worst_voice,
        "doctor_flag":      doctor_flag,
        "profiles":         profiles,
        "relapses":         relapses,
    }
