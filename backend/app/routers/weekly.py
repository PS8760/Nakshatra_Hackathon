"""
Weekly Report Router
====================
GET  /analytics/weekly-report?joint=knee_left&week_offset=0
     Returns 7-day aggregated data: daily max/mean angle, target, total improvement.
     Compares current week vs previous week to classify trend.

GET  /analytics/weekly-report/pdf?joint=knee_left
     Returns a downloadable PDF progress certificate (ReportLab).
"""
from __future__ import annotations

import io
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/analytics", tags=["weekly"])

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


# ── Weekly data aggregation ───────────────────────────────────────────────────

def _week_bounds(week_offset: int = 0) -> tuple[datetime, datetime]:
    """Return (start, end) UTC datetimes for the requested ISO week."""
    today = date.today()
    # Monday of the current week
    monday = today - timedelta(days=today.weekday())
    monday -= timedelta(weeks=week_offset)
    sunday = monday + timedelta(days=6)
    start = datetime(monday.year, monday.month, monday.day, tzinfo=timezone.utc)
    end   = datetime(sunday.year, sunday.month, sunday.day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


def aggregate_week(
    user_id: int,
    joint: str,
    week_offset: int,
    db: Session,
) -> dict:
    """
    Aggregate JointLog data for a 7-day window.

    Returns:
        labels:        ["Mon", "Tue", ..., "Sun"]
        max_angles:    [float | None] per day
        mean_angles:   [float | None] per day
        target:        float (from ExerciseConfig or latest log)
        total_reps:    int
        mean_angle:    float (week average)
        max_angle:     float (week peak)
        improvement:   float (week max - week start max, degrees)
        days_active:   int
    """
    start, end = _week_bounds(week_offset)

    rows = (
        db.query(
            func.strftime("%w", models.JointLog.ts).label("dow"),  # 0=Sun..6=Sat
            func.max(models.JointLog.angle).label("max_angle"),
            func.avg(models.JointLog.angle).label("mean_angle"),
            func.count(models.JointLog.id).label("reps"),
        )
        .join(models.Session, models.Session.id == models.JointLog.session_id)
        .filter(
            models.Session.user_id == user_id,
            models.JointLog.joint == joint,
            models.JointLog.ts >= start,
            models.JointLog.ts <= end,
        )
        .group_by(func.strftime("%w", models.JointLog.ts))
        .all()
    )

    # SQLite strftime %w: 0=Sun, 1=Mon … 6=Sat → remap to Mon-first (0=Mon)
    dow_map: dict[int, dict] = {}
    for r in rows:
        dow_sqlite = int(r.dow)  # 0=Sun
        dow_mon_first = (dow_sqlite - 1) % 7  # 0=Mon
        dow_map[dow_mon_first] = {
            "max": round(r.max_angle, 1) if r.max_angle else None,
            "mean": round(r.mean_angle, 1) if r.mean_angle else None,
            "reps": r.reps,
        }

    max_angles  = [dow_map.get(i, {}).get("max")  for i in range(7)]
    mean_angles = [dow_map.get(i, {}).get("mean") for i in range(7)]
    total_reps  = sum(dow_map.get(i, {}).get("reps", 0) for i in range(7))
    days_active = sum(1 for v in max_angles if v is not None)

    # Target from ExerciseConfig, fallback to latest log
    config = db.query(models.ExerciseConfig).filter(
        models.ExerciseConfig.user_id == user_id,
        models.ExerciseConfig.joint == joint,
    ).first()
    target = config.target_rom if config else None
    if target is None:
        latest_log = (
            db.query(models.JointLog.target)
            .join(models.Session, models.Session.id == models.JointLog.session_id)
            .filter(models.Session.user_id == user_id, models.JointLog.joint == joint)
            .order_by(models.JointLog.ts.desc())
            .first()
        )
        target = latest_log.target if latest_log else 130.0

    valid_max = [v for v in max_angles if v is not None]
    week_mean = round(sum(mean_angles[i] for i in range(7) if mean_angles[i] is not None) / max(days_active, 1), 1)
    week_max  = max(valid_max) if valid_max else 0.0

    # Improvement = last active day max - first active day max
    first_val = next((v for v in max_angles if v is not None), None)
    last_val  = next((v for v in reversed(max_angles) if v is not None), None)
    improvement = round((last_val - first_val), 1) if first_val and last_val else 0.0

    return {
        "labels":      DAY_LABELS,
        "max_angles":  max_angles,
        "mean_angles": mean_angles,
        "target":      round(target, 1),
        "total_reps":  total_reps,
        "mean_angle":  week_mean,
        "max_angle":   week_max,
        "improvement": improvement,
        "days_active": days_active,
        "week_start":  start.date().isoformat(),
        "week_end":    end.date().isoformat(),
    }


def compare_weeks(current: dict, previous: dict) -> dict:
    """
    Compare current week vs previous week.

    Returns:
        trend:   "improving" | "plateauing" | "declining"
        delta_mean:  float (degrees change in weekly mean)
        delta_max:   float (degrees change in weekly peak)
        pct_change:  float (% change in mean angle)
        message:     str   (human-readable summary for voice/UI)
    """
    prev_mean = previous["mean_angle"] or 0
    curr_mean = current["mean_angle"]  or 0
    prev_max  = previous["max_angle"]  or 0
    curr_max  = current["max_angle"]   or 0

    delta_mean = round(curr_mean - prev_mean, 1)
    delta_max  = round(curr_max  - prev_max,  1)
    pct_change = round((delta_mean / prev_mean * 100), 1) if prev_mean > 0 else 0.0

    if delta_mean >= 3:
        trend = "improving"
        message = (
            f"Great progress! Your average range of motion increased by "
            f"{abs(delta_mean):.1f} degrees this week — that's a {abs(pct_change):.0f}% improvement."
        )
    elif delta_mean <= -3:
        trend = "declining"
        message = (
            f"Your range of motion decreased by {abs(delta_mean):.1f} degrees this week. "
            f"Consider consulting your physiotherapist and ensure you're completing daily exercises."
        )
    else:
        trend = "plateauing"
        message = (
            f"Your mobility is stable this week with a {abs(delta_mean):.1f} degree change. "
            f"Try increasing your exercise intensity to break through the plateau."
        )

    return {
        "trend":       trend,
        "delta_mean":  delta_mean,
        "delta_max":   delta_max,
        "pct_change":  pct_change,
        "message":     message,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/weekly-report")
def get_weekly_report(
    joint: str = Query(default="knee_left"),
    week_offset: int = Query(default=0, ge=0, le=52, description="0=current week, 1=last week"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Weekly recovery report for a joint.
    Returns current week data + previous week comparison.
    """
    current  = aggregate_week(current_user.id, joint, week_offset,     db)
    previous = aggregate_week(current_user.id, joint, week_offset + 1, db)
    comparison = compare_weeks(current, previous)

    return {
        "joint":      joint,
        "user_name":  current_user.full_name,
        "current":    current,
        "previous":   previous,
        "comparison": comparison,
    }


@router.get("/weekly-report/pdf")
def download_weekly_pdf(
    joint: str = Query(default="knee_left"),
    week_offset: int = Query(default=0, ge=0, le=52),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generate and stream a PDF Progress Certificate using ReportLab.
    Install: pip install reportlab
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="ReportLab not installed. Run: pip install reportlab",
        )

    current    = aggregate_week(current_user.id, joint, week_offset,     db)
    previous   = aggregate_week(current_user.id, joint, week_offset + 1, db)
    comparison = compare_weeks(current, previous)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=20*mm, bottomMargin=20*mm)

    TEAL   = colors.HexColor("#0fffc5")
    DARK   = colors.HexColor("#02182b")
    WHITE  = colors.white
    GREY   = colors.HexColor("#6b7280")
    RED    = colors.HexColor("#ef4444")
    GREEN  = colors.HexColor("#22c55e")
    YELLOW = colors.HexColor("#eab308")

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("title", fontSize=22, textColor=TEAL,
                                 fontName="Helvetica-Bold", spaceAfter=4)
    sub_style   = ParagraphStyle("sub",   fontSize=11, textColor=WHITE,
                                 fontName="Helvetica", spaceAfter=2)
    body_style  = ParagraphStyle("body",  fontSize=10, textColor=WHITE,
                                 fontName="Helvetica", spaceAfter=4, leading=14)
    label_style = ParagraphStyle("label", fontSize=9,  textColor=GREY,
                                 fontName="Helvetica", spaceAfter=2)
    section_style = ParagraphStyle("section", fontSize=12, textColor=TEAL,
                                   fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=6)

    trend_color = GREEN if comparison["trend"] == "improving" \
                  else RED if comparison["trend"] == "declining" else YELLOW

    story = []

    # ── Header ──
    story.append(Paragraph("NeuroRestore AI", title_style))
    story.append(Paragraph("Weekly Recovery Progress Certificate", sub_style))
    story.append(Paragraph(
        f"Patient: <b>{current_user.full_name}</b> &nbsp;|&nbsp; "
        f"Joint: <b>{joint.replace('_', ' ').title()}</b> &nbsp;|&nbsp; "
        f"Week: <b>{current['week_start']} – {current['week_end']}</b>",
        body_style,
    ))
    story.append(HRFlowable(width="100%", thickness=0.5, color=TEAL, spaceAfter=12))

    # ── Weekly stats table ──
    story.append(Paragraph("Weekly Summary", section_style))
    stats_data = [
        ["Metric", "This Week", "Last Week", "Change"],
        ["Mean Angle",
         f"{current['mean_angle']:.1f}°",
         f"{previous['mean_angle']:.1f}°" if previous['mean_angle'] else "—",
         f"{comparison['delta_mean']:+.1f}°"],
        ["Peak Angle",
         f"{current['max_angle']:.1f}°",
         f"{previous['max_angle']:.1f}°" if previous['max_angle'] else "—",
         f"{comparison['delta_max']:+.1f}°"],
        ["Target ROM",   f"{current['target']:.1f}°", "—", "—"],
        ["Total Reps",   str(current['total_reps']),  str(previous['total_reps']), "—"],
        ["Days Active",  str(current['days_active']),  str(previous['days_active']), "—"],
        ["Weekly Improvement", f"{current['improvement']:+.1f}°", "—", "—"],
    ]
    tbl = Table(stats_data, colWidths=[50*mm, 35*mm, 35*mm, 35*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), DARK),
        ("TEXTCOLOR",    (0,0), (-1,0), TEAL),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 9),
        ("TEXTCOLOR",    (0,1), (-1,-1), WHITE),
        ("BACKGROUND",   (0,1), (-1,-1), colors.HexColor("#031e35")),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#031e35"), colors.HexColor("#041828")]),
        ("GRID",         (0,0), (-1,-1), 0.3, colors.HexColor("#1e3a4a")),
        ("ALIGN",        (1,0), (-1,-1), "CENTER"),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 10*mm))

    # ── Daily breakdown ──
    story.append(Paragraph("Daily Breakdown", section_style))
    daily_data = [["Day", "Max Angle", "Mean Angle", "vs Target"]]
    for i, day in enumerate(DAY_LABELS):
        mx = current["max_angles"][i]
        mn = current["mean_angles"][i]
        vs = f"{(mx - current['target']):+.1f}°" if mx is not None else "—"
        daily_data.append([
            day,
            f"{mx:.1f}°" if mx is not None else "—",
            f"{mn:.1f}°" if mn is not None else "—",
            vs,
        ])
    dtbl = Table(daily_data, colWidths=[30*mm, 40*mm, 40*mm, 45*mm])
    dtbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,0), DARK),
        ("TEXTCOLOR",    (0,0), (-1,0), TEAL),
        ("FONTNAME",     (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0), (-1,-1), 9),
        ("TEXTCOLOR",    (0,1), (-1,-1), WHITE),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#031e35"), colors.HexColor("#041828")]),
        ("GRID",         (0,0), (-1,-1), 0.3, colors.HexColor("#1e3a4a")),
        ("ALIGN",        (1,0), (-1,-1), "CENTER"),
        ("VALIGN",       (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",   (0,0), (-1,-1), 5),
        ("BOTTOMPADDING",(0,0), (-1,-1), 5),
    ]))
    story.append(dtbl)
    story.append(Spacer(1, 10*mm))

    # ── Trend assessment ──
    story.append(Paragraph("Trend Assessment", section_style))
    trend_label = comparison["trend"].upper()
    story.append(Paragraph(
        f'<font color="#{trend_color.hexval()[1:]}"><b>{trend_label}</b></font> — {comparison["message"]}',
        body_style,
    ))
    story.append(Spacer(1, 6*mm))

    # ── Footer ──
    story.append(HRFlowable(width="100%", thickness=0.3, color=GREY, spaceAfter=6))
    story.append(Paragraph(
        "This certificate is generated by NeuroRestore AI and is not a substitute for professional medical advice.",
        ParagraphStyle("footer", fontSize=8, textColor=GREY, fontName="Helvetica"),
    ))

    doc.build(story)
    buf.seek(0)

    filename = f"NeuroRestore_Weekly_{joint}_{current['week_start']}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
