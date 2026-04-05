"""
Training Plan API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, JSON, Text
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db, Base
from ..dependencies import get_current_user
from ..training_plan import TrainingPlanGenerator, UserProfile, TrainingPlan as TPModel


router = APIRouter(prefix="/training", tags=["training"])


# Database Models
class TrainingPlanDB(Base):
    __tablename__ = "training_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String, unique=True, index=True)
    user_id = Column(Integer, index=True)
    goal = Column(String)
    start_date = Column(DateTime)
    target_end_date = Column(DateTime)
    actual_end_date = Column(DateTime, nullable=True)
    current_day = Column(Integer, default=1)
    total_days = Column(Integer)
    current_level = Column(Integer, default=1)
    overall_progress = Column(Float, default=0.0)
    streak_days = Column(Integer, default=0)
    missed_days = Column(Integer, default=0)
    status = Column(String, default="active")  # active, completed, paused
    plan_data = Column(JSON)  # Store full plan as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyProgressDB(Base):
    __tablename__ = "daily_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String, index=True)
    user_id = Column(Integer, index=True)
    day_number = Column(Integer)
    date = Column(DateTime)
    completed = Column(Boolean, default=False)
    completion_percentage = Column(Float, default=0.0)
    exercises_completed = Column(JSON)  # List of completed exercise names
    notes = Column(Text, nullable=True)
    pain_level = Column(Integer, nullable=True)  # 1-10
    energy_level = Column(Integer, nullable=True)  # 1-10
    completed_at = Column(DateTime, nullable=True)


# Request/Response Models
class CreatePlanRequest(BaseModel):
    age: int
    sex: str
    name: str
    goal: str
    injury_type: Optional[str] = None
    fitness_level: str = "beginner"
    available_days_per_week: int = 5
    session_duration_minutes: int = 30


class DailyProgressUpdate(BaseModel):
    day_number: int
    completed: bool
    completion_percentage: float
    exercises_completed: List[str]
    notes: Optional[str] = None
    pain_level: Optional[int] = None
    energy_level: Optional[int] = None


class PlanAdjustmentRequest(BaseModel):
    reason: str  # "too_easy", "too_hard", "injury", "time_constraint"
    notes: Optional[str] = None


# API Endpoints
@router.post("/create-plan")
async def create_training_plan(
    request: CreatePlanRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new personalized training plan"""
    
    # Check if user already has an active plan
    existing_plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if existing_plan:
        raise HTTPException(status_code=400, detail="You already have an active training plan")
    
    # Generate plan
    profile = UserProfile(
        age=request.age,
        sex=request.sex,
        name=request.name,
        goal=request.goal,
        injury_type=request.injury_type,
        fitness_level=request.fitness_level,
        available_days_per_week=request.available_days_per_week,
        session_duration_minutes=request.session_duration_minutes,
    )
    
    plan = TrainingPlanGenerator.generate_plan(profile, current_user["id"])
    
    # Save to database
    db_plan = TrainingPlanDB(
        plan_id=plan.plan_id,
        user_id=current_user["id"],
        goal=plan.goal,
        start_date=plan.start_date,
        target_end_date=plan.target_end_date,
        current_day=plan.current_day,
        total_days=plan.total_days,
        current_level=plan.current_level,
        overall_progress=plan.overall_progress,
        streak_days=plan.streak_days,
        missed_days=plan.missed_days,
        plan_data=plan.dict(),
    )
    
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    
    return {
        "success": True,
        "plan_id": plan.plan_id,
        "total_days": plan.total_days,
        "target_end_date": plan.target_end_date,
        "message": f"Your {plan.total_days}-day {plan.goal} plan is ready!"
    }


@router.get("/my-plan")
async def get_my_plan(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's active training plan"""
    
    plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if not plan:
        return {"has_plan": False, "message": "No active training plan"}
    
    return {
        "has_plan": True,
        "plan": plan.plan_data,
        "current_day": plan.current_day,
        "total_days": plan.total_days,
        "progress": plan.overall_progress,
        "streak": plan.streak_days,
        "missed_days": plan.missed_days,
    }


@router.get("/today")
async def get_today_plan(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get today's training plan"""
    
    plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active training plan found")
    
    # Get today's plan from plan_data
    full_plan = TPModel(**plan.plan_data)
    today_plan = full_plan.daily_plans[plan.current_day - 1] if plan.current_day <= len(full_plan.daily_plans) else None
    
    if not today_plan:
        raise HTTPException(status_code=404, detail="Today's plan not found")
    
    # Check if already completed today
    progress = db.query(DailyProgressDB).filter(
        DailyProgressDB.plan_id == plan.plan_id,
        DailyProgressDB.day_number == plan.current_day
    ).first()
    
    return {
        "day_number": today_plan.day_number,
        "date": today_plan.date,
        "rest_day": today_plan.rest_day,
        "exercises": today_plan.exercises,
        "warm_up": today_plan.warm_up,
        "cool_down": today_plan.cool_down,
        "nutrition_tips": today_plan.nutrition_tips,
        "completed": progress.completed if progress else False,
        "completion_percentage": progress.completion_percentage if progress else 0.0,
    }


@router.post("/complete-day")
async def complete_daily_plan(
    progress: DailyProgressUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark day as complete and update progress"""
    
    plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active training plan found")
    
    # Save daily progress
    daily_progress = DailyProgressDB(
        plan_id=plan.plan_id,
        user_id=current_user["id"],
        day_number=progress.day_number,
        date=datetime.now(),
        completed=progress.completed,
        completion_percentage=progress.completion_percentage,
        exercises_completed=progress.exercises_completed,
        notes=progress.notes,
        pain_level=progress.pain_level,
        energy_level=progress.energy_level,
        completed_at=datetime.now() if progress.completed else None,
    )
    
    db.add(daily_progress)
    
    # Update plan progress
    if progress.completed:
        plan.current_day += 1
        plan.streak_days += 1
    else:
        plan.missed_days += 1
        plan.streak_days = 0
    
    plan.overall_progress = (plan.current_day / plan.total_days) * 100
    
    # Adaptive adjustment every 7 days
    if plan.current_day % 7 == 0:
        completion_rate = 1 - (plan.missed_days / plan.current_day)
        full_plan = TPModel(**plan.plan_data)
        adjusted_plan = TrainingPlanGenerator.adjust_plan_for_performance(full_plan, completion_rate)
        plan.total_days = adjusted_plan.total_days
        plan.target_end_date = adjusted_plan.target_end_date
        plan.plan_data = adjusted_plan.dict()
    
    # Check if plan completed
    if plan.current_day > plan.total_days:
        plan.status = "completed"
        plan.actual_end_date = datetime.now()
    
    db.commit()
    
    return {
        "success": True,
        "current_day": plan.current_day,
        "total_days": plan.total_days,
        "progress": plan.overall_progress,
        "streak": plan.streak_days,
        "message": "Great job! Keep it up!" if progress.completed else "Don't worry, tomorrow is a new day!"
    }


@router.get("/progress-history")
async def get_progress_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete progress history"""
    
    plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active training plan found")
    
    history = db.query(DailyProgressDB).filter(
        DailyProgressDB.plan_id == plan.plan_id
    ).order_by(DailyProgressDB.day_number).all()
    
    return {
        "plan_id": plan.plan_id,
        "goal": plan.goal,
        "current_day": plan.current_day,
        "total_days": plan.total_days,
        "progress": plan.overall_progress,
        "streak": plan.streak_days,
        "missed_days": plan.missed_days,
        "history": [
            {
                "day": h.day_number,
                "date": h.date,
                "completed": h.completed,
                "completion_percentage": h.completion_percentage,
                "pain_level": h.pain_level,
                "energy_level": h.energy_level,
            }
            for h in history
        ]
    }


@router.post("/adjust-plan")
async def adjust_plan(
    request: PlanAdjustmentRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually adjust plan based on user feedback"""
    
    plan = db.query(TrainingPlanDB).filter(
        TrainingPlanDB.user_id == current_user["id"],
        TrainingPlanDB.status == "active"
    ).first()
    
    if not plan:
        raise HTTPException(status_code=404, detail="No active training plan found")
    
    full_plan = TPModel(**plan.plan_data)
    
    if request.reason == "too_hard":
        # Decrease intensity, extend duration
        plan.total_days += 14
        plan.target_end_date = plan.target_end_date + timedelta(days=14)
        plan.current_level = max(1, plan.current_level - 1)
    elif request.reason == "too_easy":
        # Increase intensity, shorten duration
        plan.total_days = max(plan.current_day + 7, plan.total_days - 7)
        plan.current_level = min(3, plan.current_level + 1)
    elif request.reason == "injury":
        # Pause and extend
        plan.status = "paused"
    
    plan.plan_data = full_plan.dict()
    db.commit()
    
    return {
        "success": True,
        "new_total_days": plan.total_days,
        "new_level": plan.current_level,
        "message": "Plan adjusted successfully"
    }
