"""
WebSocket Session Handler
=========================
Receives rep_complete events from the browser client.
Stores joint logs and pushes real-time feedback back within <50ms.

Event schema (client → server):
{
  "event": "rep_complete",
  "joint": "knee_left",
  "angle": 124.3,
  "target": 130.0,
  "timestamp": 1712345678,
  "session_id": 1,
  "side": "left",
  "visibility_score": 0.92
}

Feedback schema (server → client):
{
  "event": "feedback",
  "status": "good" | "warning" | "out_of_range",
  "message": "...",
  "rep_count": 5,
  "angle": 124.3,
  "target": 130.0,
  "deviation": -5.7
}
"""
import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app import models
from app.database import SessionLocal


def _get_feedback_status(angle: float, target: float) -> tuple[str, str]:
    """
    Returns (status, message) based on angle vs target.
    green  → within 5° of target or exceeded
    yellow → within 15° of target
    red    → more than 15° away
    """
    diff = target - angle  # positive = not yet reached target
    if diff <= 5:
        return "good", f"Great rep! Angle {angle:.1f}° — target reached."
    elif diff <= 15:
        return "warning", f"Almost there! Extend {diff:.0f}° more."
    else:
        return "out_of_range", f"Keep going — {diff:.0f}° to target. Move slowly."


async def handle_session_ws(websocket: WebSocket, session_id: int, user_id: int):
    await websocket.accept()
    db: Session = SessionLocal()
    rep_counts: dict[str, int] = {}

    try:
        while True:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=90.0)
            data = json.loads(raw)
            event_type = data.get("event")

            if event_type == "rep_complete":
                joint = data.get("joint", "unknown")
                angle = float(data.get("angle", 0))
                target = float(data.get("target", 90))
                side = data.get("side")
                visibility = data.get("visibility_score", 1.0)

                # Only log if visibility is sufficient (>= 0.65 per spec)
                if visibility < 0.65:
                    await websocket.send_text(json.dumps({
                        "event": "feedback",
                        "status": "low_visibility",
                        "message": "Move into better lighting — landmark visibility too low.",
                    }))
                    continue

                deviation = angle - target
                rep_counts[joint] = rep_counts.get(joint, 0) + 1

                # Persist to DB
                log = models.JointLog(
                    session_id=session_id,
                    joint=joint,
                    angle=angle,
                    target=target,
                    deviation=deviation,
                    rep_number=rep_counts[joint],
                    side=side,
                    visibility_score=visibility,
                )
                db.add(log)
                db.commit()

                status, message = _get_feedback_status(angle, target)

                await websocket.send_text(json.dumps({
                    "event": "feedback",
                    "status": status,
                    "message": message,
                    "rep_count": rep_counts[joint],
                    "angle": round(angle, 1),
                    "target": target,
                    "deviation": round(deviation, 1),
                    "joint": joint,
                }))

            elif event_type == "pain_event":
                pain = models.PainEvent(
                    session_id=session_id,
                    user_id=user_id,
                    joint=data.get("joint", "unknown"),
                    intensity=int(data.get("intensity", 5)),
                    note=data.get("note"),
                )
                db.add(pain)
                db.commit()
                await websocket.send_text(json.dumps({"event": "pain_logged", "status": "ok"}))

            elif event_type == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))

    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    finally:
        db.close()
