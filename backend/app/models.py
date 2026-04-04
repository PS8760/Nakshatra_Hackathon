from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    patient = "patient"
    clinician = "clinician"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.patient)
    assigned_clinician_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

    sessions = relationship("Session", back_populates="user", foreign_keys="Session.user_id")
    recovery_scores = relationship("RecoveryScore", back_populates="user")
    pain_events = relationship("PainEvent", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_type = Column(String, default="physical")  # physical | cognitive | combined
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_s = Column(Integer, default=0)
    recovery_score = Column(Float, nullable=True)
    physical_score = Column(Float, nullable=True)
    cognitive_score = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions", foreign_keys=[user_id])
    joint_logs = relationship("JointLog", back_populates="session")
    cognitive_logs = relationship("CognitiveLog", back_populates="session")
    pain_events = relationship("PainEvent", back_populates="session")


class JointLog(Base):
    __tablename__ = "joint_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    joint = Column(String, nullable=False)          # knee_left, knee_right, elbow_left, etc.
    angle = Column(Float, nullable=False)           # achieved angle in degrees
    target = Column(Float, nullable=False)          # target ROM in degrees
    deviation = Column(Float, nullable=False)       # angle - target
    rep_number = Column(Integer, default=0)
    side = Column(String, nullable=True)            # left | right (for bilateral)
    visibility_score = Column(Float, nullable=True) # MediaPipe landmark visibility
    ts = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="joint_logs")


class CognitiveLog(Base):
    __tablename__ = "cognitive_logs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    game = Column(String, nullable=False)
    score = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    reaction_ms = Column(Float, nullable=True)
    difficulty_level = Column(Integer, default=1)
    ts = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="cognitive_logs")


class RecoveryScore(Base):
    __tablename__ = "recovery_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(String, nullable=False)           # YYYY-MM-DD
    physical_score = Column(Float, nullable=True)
    cognitive_score = Column(Float, nullable=True)
    composite_score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="recovery_scores")


class PainEvent(Base):
    __tablename__ = "pain_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joint = Column(String, nullable=False)
    intensity = Column(Integer, nullable=False)     # 1-10
    ts = Column(DateTime(timezone=True), server_default=func.now())
    note = Column(Text, nullable=True)

    session = relationship("Session", back_populates="pain_events")
    user = relationship("User", back_populates="pain_events")


class ExerciseConfig(Base):
    __tablename__ = "exercise_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joint = Column(String, nullable=False)
    target_rom = Column(Float, nullable=False)      # current target in degrees
    baseline_rom = Column(Float, nullable=True)     # initial ROM at start of rehab
    consecutive_successes = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
