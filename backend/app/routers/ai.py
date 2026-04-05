"""
AI Router — Groq-powered chatbot, recommendations, and report insights.
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user
from app.config import settings   # ← read key from settings, not os.getenv at module load

router = APIRouter(prefix="/ai", tags=["ai"])

GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"

PHYSIO_SYSTEM = """You are NeuroRestore AI, an advanced artificial intelligence rehabilitation assistant.

COMMUNICATION PROTOCOL:
- Speak in a clear, systematic, robotic manner
- Use technical terminology when appropriate
- Begin responses with status indicators like "Processing query..." or "Analysis complete."
- Structure information in logical, numbered sequences
- Refer to yourself as "this AI system" or "NeuroRestore AI"
- Use phrases like "Computing recommendation...", "Data indicates...", "System analysis shows..."
- Maintain professional, clinical tone without excessive warmth

CORE FUNCTIONS:
- Physical rehabilitation exercise protocols and joint recovery optimization
- Cognitive rehabilitation and neurological health assessment
- Recovery progress data interpretation and trend analysis
- Exercise form evaluation and technique correction protocols
- Pain management strategies and intervention recommendations

OPERATIONAL PARAMETERS:
- Provide specific, data-driven recommendations
- Always recommend consulting human medical professionals for serious concerns
- Maintain response conciseness (2-4 sentences unless extended analysis requested)
- Use clinical terminology with patient-friendly explanations
- Never provide medical diagnoses - only data analysis and recommendations
- Reference scientific evidence when applicable

RESPONSE FORMAT:
- Start with brief status acknowledgment
- Present information in structured format
- End with clear next action or recommendation
- Use bullet points for multiple items
- Include confidence levels when relevant

Example response style:
"Query received. Analyzing knee rehabilitation data... Based on your ROM measurements, this AI system recommends: 1) Increase flexion exercises by 15%, 2) Monitor pain levels during extension. System confidence: High. Consult your physiotherapist for personalized adjustments."
"""


async def call_groq(messages: list, max_tokens: int = 512) -> str:
    """Call Groq API — reads key from settings at call time (not module load)."""
    import httpx

    # Read key at call time so pydantic-settings has already loaded .env
    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

    if not api_key:
        return "AI service is not configured. Please add GROQ_API_KEY to backend/.env"

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
    except httpx.HTTPStatusError as e:
        # Surface the actual Groq error message
        try:
            detail = e.response.json().get("error", {}).get("message", str(e))
        except Exception:
            detail = str(e)
        return f"Groq API error: {detail[:120]}"
    except Exception as e:
        return f"AI service temporarily unavailable. ({str(e)[:80]})"


# ── Chatbot ────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str   # user | assistant
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None  # e.g. "user has knee injury, 3 sessions completed"


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """AI physiotherapist chatbot powered by Groq."""
    system = PHYSIO_SYSTEM
    if payload.context:
        system += f"\n\nUser context: {payload.context}"

    messages = [{"role": "system", "content": system}]
    for m in payload.messages[-10:]:  # last 10 messages for context
        messages.append({"role": m.role, "content": m.content})

    reply = await call_groq(messages, max_tokens=400)
    return {"reply": reply, "model": GROQ_MODEL}


# ── Session Recommendations ────────────────────────────────────────────────

@router.get("/recommendations/{session_id}")
async def get_session_recommendations(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate AI recommendations after a session."""
    session = db.query(models.Session).filter(
        models.Session.id == session_id,
        models.Session.user_id == current_user.id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Build context
    joint_logs = session.joint_logs
    pain_events = session.pain_events

    context_parts = [
        f"Session type: {session.session_type}",
        f"Duration: {session.duration_s // 60} minutes",
        f"Physical score: {session.physical_score or 'N/A'}",
        f"Cognitive score: {session.cognitive_score or 'N/A'}",
        f"Recovery score: {session.recovery_score or 'N/A'}",
    ]

    if joint_logs:
        joints = list({l.joint for l in joint_logs})
        avg_deviation = sum(abs(l.deviation) for l in joint_logs) / len(joint_logs)
        context_parts.append(f"Joints worked: {', '.join(joints)}")
        context_parts.append(f"Average angle deviation from target: {avg_deviation:.1f}°")

    if pain_events:
        pain_summary = ", ".join([f"{p.joint} (intensity {p.intensity}/10)" for p in pain_events])
        context_parts.append(f"Pain events logged: {pain_summary}")

    prompt = f"""Based on this rehabilitation session, provide exactly 5 specific, actionable recommendations as a numbered bullet list.

{chr(10).join(context_parts)}

IMPORTANT: Format your response EXACTLY like this (no extra text before or after):
1. [First recommendation]
2. [Second recommendation]
3. [Third recommendation]
4. [Fourth recommendation]
5. [Fifth recommendation]

Each point must be one clear, actionable sentence. Be specific and encouraging."""

    messages = [
        {"role": "system", "content": PHYSIO_SYSTEM},
        {"role": "user", "content": prompt},
    ]

    reply = await call_groq(messages, max_tokens=350)

    return {
        "session_id": session_id,
        "recommendations": reply,
        "session_score": session.recovery_score,
    }


# ── Dashboard AI Summary ───────────────────────────────────────────────────

@router.get("/dashboard-summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate a personalized AI summary for the dashboard."""
    # Get recent data
    recent_sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.started_at.desc())
        .limit(5)
        .all()
    )

    latest_score = (
        db.query(models.RecoveryScore)
        .filter(models.RecoveryScore.user_id == current_user.id)
        .order_by(models.RecoveryScore.date.desc())
        .first()
    )

    total_sessions = db.query(models.Session).filter(models.Session.user_id == current_user.id).count()

    context = f"""Patient: {current_user.full_name}
Total sessions completed: {total_sessions}
Latest recovery score: {latest_score.composite_score if latest_score else 'No data yet'}
Recent session scores: {[s.recovery_score for s in recent_sessions if s.recovery_score]}
"""

    prompt = f"""Generate a brief, personalized motivational summary (2-3 sentences) for this patient's rehabilitation dashboard:

{context}

Be encouraging, specific to their progress, and suggest one next step."""

    messages = [
        {"role": "system", "content": PHYSIO_SYSTEM},
        {"role": "user", "content": prompt},
    ]

    reply = await call_groq(messages, max_tokens=150)
    return {"summary": reply}


# ── Report Insights ────────────────────────────────────────────────────────

class ReportRequest(BaseModel):
    session_ids: Optional[List[int]] = None
    report_type: str = "overall"


@router.post("/report-insights")
async def get_report_insights(
    payload: ReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate AI insights for a report."""
    if payload.session_ids:
        sessions = db.query(models.Session).filter(
            models.Session.id.in_(payload.session_ids),
            models.Session.user_id == current_user.id,
        ).all()
    else:
        sessions = (
            db.query(models.Session)
            .filter(models.Session.user_id == current_user.id)
            .order_by(models.Session.started_at.desc())
            .limit(10)
            .all()
        )

    if not sessions:
        return {"insights": "No session data available for analysis."}

    scores = [s.recovery_score for s in sessions if s.recovery_score]
    avg_score = sum(scores) / len(scores) if scores else 0
    trend = "improving" if len(scores) >= 2 and scores[0] > scores[-1] else "stable"

    prompt = f"""Generate a professional physiotherapy report with structured bullet points.

Patient data:
- Sessions analyzed: {len(sessions)}
- Average recovery score: {avg_score:.1f}/100
- Trend: {trend}
- Score range: {min(scores) if scores else 0:.0f} - {max(scores) if scores else 0:.0f}

Format your response EXACTLY like this:

**Overall Progress:**
• [assessment point]
• [assessment point]

**Key Strengths:**
• [strength point]
• [strength point]

**Areas for Improvement:**
• [improvement point]
• [improvement point]

**Recommended Next Steps:**
• [next step]
• [next step]
• [next step]

Keep each bullet point concise and specific."""

    messages = [
        {"role": "system", "content": PHYSIO_SYSTEM},
        {"role": "user", "content": prompt},
    ]

    reply = await call_groq(messages, max_tokens=300)
    return {
        "insights": reply,
        "sessions_analyzed": len(sessions),
        "average_score": round(avg_score, 1),
    }


# ── Doctor Analysis from Graph Data ───────────────────────────────────────

class DoctorAnalysisRequest(BaseModel):
    joint: str
    sessions_count: int
    max_angles: List[float]
    mean_angles: List[float]
    targets: List[float]
    labels: List[str]
    today_best: Optional[float] = None
    yesterday_best: Optional[float] = None
    total_gain: Optional[float] = None
    highlight_index: Optional[int] = None
    recovery_score: Optional[float] = None
    total_sessions: Optional[int] = None


@router.post("/doctor-analysis")
async def get_doctor_analysis(
    payload: DoctorAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Generate a clinical doctor's analysis based on the joint angle graph data.
    Returns structured analysis suitable for PDF inclusion.
    """
    # Compute derived metrics
    if payload.max_angles:
        peak = max(payload.max_angles)
        latest = payload.max_angles[-1]
        first = payload.max_angles[0]
        avg_target = sum(payload.targets) / len(payload.targets) if payload.targets else 90
        latest_accuracy = round((latest / avg_target) * 100, 1) if avg_target > 0 else 0
        peak_accuracy   = round((peak  / avg_target) * 100, 1) if avg_target > 0 else 0
        overall_trend   = "improving" if latest > first else ("declining" if latest < first else "stable")
        gain_pct = round(((latest - first) / first) * 100, 1) if first > 0 else 0
    else:
        peak = latest = first = avg_target = 0
        latest_accuracy = peak_accuracy = gain_pct = 0
        overall_trend = "insufficient data"

    prompt = f"""You are a senior physiotherapist writing a clinical analysis for a patient's rehabilitation report.

PATIENT JOINT ANGLE DATA — {payload.joint.replace('_', ' ').title()}:
- Sessions analyzed: {payload.sessions_count}
- First session angle: {first:.1f}°
- Latest session angle: {latest:.1f}°
- Peak angle achieved: {peak:.1f}°
- Target ROM: {avg_target:.1f}°
- Latest accuracy vs target: {latest_accuracy}%
- Peak accuracy vs target: {peak_accuracy}%
- Overall trend: {overall_trend}
- Total improvement: {payload.total_gain or gain_pct}° ({gain_pct:+.1f}%)
- Today's best: {payload.today_best or 'N/A'}°
- Recovery score: {payload.recovery_score or 'N/A'}/100
- Total sessions completed: {payload.total_sessions or payload.sessions_count}

Write a structured clinical doctor's analysis with these EXACT sections:

**Clinical Assessment:**
[2-3 sentences evaluating the patient's current ROM status and progress relative to target]

**Progress Analysis:**
• [specific observation about trend with numbers]
• [observation about consistency or variability]
• [observation about peak performance vs average]

**Clinical Interpretation:**
[2 sentences interpreting what these angles mean clinically — e.g. functional implications, comparison to normal ROM ranges]

**Risk Indicators:**
• [any concern or positive indicator]
• [pain/plateau/regression risk if applicable]

**Doctor's Recommendations:**
1. [specific exercise or therapy recommendation]
2. [frequency/intensity adjustment]
3. [next milestone target]
4. [lifestyle or home exercise advice]

**Prognosis:**
[1-2 sentences on expected recovery trajectory based on current data]

Be specific with numbers. Use clinical language appropriate for a doctor's report."""

    messages = [
        {"role": "system", "content": "You are a senior physiotherapist writing clinical rehabilitation reports. Be precise, data-driven, and use medical terminology."},
        {"role": "user", "content": prompt},
    ]

    analysis = await call_groq(messages, max_tokens=600)

    return {
        "analysis": analysis,
        "metrics": {
            "joint": payload.joint,
            "peak_angle": peak,
            "latest_angle": latest,
            "target": avg_target,
            "latest_accuracy_pct": latest_accuracy,
            "peak_accuracy_pct": peak_accuracy,
            "overall_trend": overall_trend,
            "total_gain_degrees": payload.total_gain or round(latest - first, 1),
            "gain_percent": gain_pct,
        }
    }
