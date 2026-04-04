from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "patient"


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Sessions ──────────────────────────────────────────────────────────────────
class SessionCreate(BaseModel):
    session_type: str = "physical"


class SessionOut(BaseModel):
    id: int
    user_id: int
    session_type: str
    started_at: datetime
    ended_at: Optional[datetime]
    duration_s: int
    recovery_score: Optional[float]
    physical_score: Optional[float]
    cognitive_score: Optional[float]

    class Config:
        from_attributes = True


class SessionEnd(BaseModel):
    duration_s: int
    physical_score: Optional[float] = None
    cognitive_score: Optional[float] = None


# ── Joint Logs ────────────────────────────────────────────────────────────────
class JointLogCreate(BaseModel):
    joint: str
    angle: float
    target: float
    deviation: float
    rep_number: int = 0
    side: Optional[str] = None
    visibility_score: Optional[float] = None


class JointLogOut(BaseModel):
    id: int
    session_id: int
    joint: str
    angle: float
    target: float
    deviation: float
    rep_number: int
    ts: datetime

    class Config:
        from_attributes = True


# ── WebSocket Events ──────────────────────────────────────────────────────────
class RepCompleteEvent(BaseModel):
    event: str = "rep_complete"
    joint: str
    angle: float
    target: float
    timestamp: int
    session_id: str
    side: Optional[str] = None
    visibility_score: Optional[float] = None


class PainEventCreate(BaseModel):
    session_id: int
    joint: str
    intensity: int   # 1-10
    note: Optional[str] = None


class PainEventOut(BaseModel):
    id: int
    session_id: int
    joint: str
    intensity: int
    ts: datetime
    note: Optional[str]

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────
class RecoveryScoreOut(BaseModel):
    id: int
    user_id: int
    date: str
    physical_score: Optional[float]
    cognitive_score: Optional[float]
    composite_score: Optional[float]

    class Config:
        from_attributes = True


class ExerciseConfigOut(BaseModel):
    id: int
    user_id: int
    joint: str
    target_rom: float
    baseline_rom: Optional[float]
    consecutive_successes: int

    class Config:
        from_attributes = True
