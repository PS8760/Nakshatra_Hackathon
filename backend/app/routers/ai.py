"""
AI Router — Groq-powered chatbot, recommendations, and report insights.
"""
import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = "llama3-8b-8192"
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

PHYSIO_SYSTEM = """You are NeuroRestore AI, an expert AI physiotherapist assistant.
You help patients with:
- Physical rehabilitation exercises and joint recovery
- Cognitive rehabilitation and brain health
- Recovery progress interpretation
- Exercise form and technique guidance
- Pain management advice

Rules:
- Be warm, encouraging, and professional
- Give specific, actionable advice
- Always recommend consulting a real doctor for serious concerns
- Keep responses concise (2-4 sentences unless asked for more)
- Use simple language patients can understand
- Never diagnose medical conditions
"""


async def call_groq(messages: list, max_tokens: int = 512) -> str:
    """Call Groq API and return the assistant message."""
    import httpx

    if not GROQ_API_KEY:
        return "AI service is not configured. Please add your Groq API key."

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
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
    except Exception as e:
        return f"AI service temporarily unavailable. Please try again. ({str(e)[:60]})"


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

    prompt = f"""Based on this rehabilitation session, provide 3 specific, actionable recommendations:

{chr(10).join(context_parts)}

Format your response as exactly 3 numbered recommendations. Be specific and encouraging."""

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
    session_ids: Optional[List[int]] = None  # None = all sessions
    report_type: str = "overall"  # overall | session


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

    prompt = f"""Generate a professional physiotherapy report summary with:
1. Overall progress assessment
2. Key strengths observed
3. Areas for improvement
4. Recommended next steps

Patient data:
- Sessions analyzed: {len(sessions)}
- Average recovery score: {avg_score:.1f}/100
- Trend: {trend}
- Score range: {min(scores) if scores else 0:.0f} - {max(scores) if scores else 0:.0f}

Keep it professional, specific, and under 200 words."""

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
