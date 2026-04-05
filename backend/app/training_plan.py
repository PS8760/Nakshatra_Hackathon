"""
Training Plan Engine - Adaptive Progressive Rehabilitation System
Generates personalized training plans based on user goals and tracks progress
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pydantic import BaseModel


class UserProfile(BaseModel):
    """User profile for training plan generation"""
    age: int
    sex: str  # "male", "female", "other"
    name: str
    goal: str  # "strength", "flexibility", "recovery", "endurance", "pain_relief"
    injury_type: Optional[str] = None
    fitness_level: str = "beginner"  # "beginner", "intermediate", "advanced"
    available_days_per_week: int = 5
    session_duration_minutes: int = 30


class ExerciseTask(BaseModel):
    """Individual exercise task"""
    name: str
    description: str
    sets: int
    reps: int
    duration_seconds: Optional[int] = None
    intensity: str  # "low", "medium", "high"
    joint_focus: List[str]
    video_url: Optional[str] = None
    instructions: List[str]


class DailyPlan(BaseModel):
    """Daily training plan"""
    day_number: int
    date: datetime
    exercises: List[ExerciseTask]
    warm_up: List[str]
    cool_down: List[str]
    nutrition_tips: List[str]
    rest_day: bool = False
    completed: bool = False
    completion_percentage: float = 0.0


class TrainingPlan(BaseModel):
    """Complete training plan"""
    plan_id: str
    user_id: int
    goal: str
    start_date: datetime
    target_end_date: datetime
    current_day: int
    total_days: int
    current_level: int  # 1-5
    daily_plans: List[DailyPlan]
    overall_progress: float
    streak_days: int
    missed_days: int


class TrainingPlanGenerator:
    """Generates adaptive training plans based on user profile"""
    
    # Exercise database by goal and level
    EXERCISE_DATABASE = {
        "strength": {
            1: [  # Beginner
                {"name": "Wall Push-ups", "sets": 2, "reps": 10, "intensity": "low", "joints": ["shoulder", "elbow"]},
                {"name": "Chair Squats", "sets": 2, "reps": 12, "intensity": "low", "joints": ["knee", "hip"]},
                {"name": "Arm Raises", "sets": 2, "reps": 15, "intensity": "low", "joints": ["shoulder"]},
            ],
            2: [  # Intermediate
                {"name": "Standard Push-ups", "sets": 3, "reps": 12, "intensity": "medium", "joints": ["shoulder", "elbow"]},
                {"name": "Bodyweight Squats", "sets": 3, "reps": 15, "intensity": "medium", "joints": ["knee", "hip"]},
                {"name": "Lunges", "sets": 3, "reps": 10, "intensity": "medium", "joints": ["knee", "hip"]},
            ],
            3: [  # Advanced
                {"name": "Diamond Push-ups", "sets": 4, "reps": 15, "intensity": "high", "joints": ["shoulder", "elbow"]},
                {"name": "Jump Squats", "sets": 4, "reps": 12, "intensity": "high", "joints": ["knee", "hip"]},
                {"name": "Bulgarian Split Squats", "sets": 4, "reps": 12, "intensity": "high", "joints": ["knee", "hip"]},
            ],
        },
        "flexibility": {
            1: [
                {"name": "Neck Rolls", "sets": 2, "reps": 10, "intensity": "low", "joints": ["neck"]},
                {"name": "Shoulder Circles", "sets": 2, "reps": 15, "intensity": "low", "joints": ["shoulder"]},
                {"name": "Seated Hamstring Stretch", "duration": 30, "sets": 2, "intensity": "low", "joints": ["hip", "knee"]},
            ],
            2: [
                {"name": "Cat-Cow Stretch", "sets": 3, "reps": 12, "intensity": "medium", "joints": ["spine"]},
                {"name": "Hip Flexor Stretch", "duration": 45, "sets": 3, "intensity": "medium", "joints": ["hip"]},
                {"name": "Thoracic Rotation", "sets": 3, "reps": 10, "intensity": "medium", "joints": ["spine", "shoulder"]},
            ],
            3: [
                {"name": "Deep Squat Hold", "duration": 60, "sets": 3, "intensity": "high", "joints": ["hip", "knee", "ankle"]},
                {"name": "Pigeon Pose", "duration": 60, "sets": 3, "intensity": "high", "joints": ["hip"]},
                {"name": "Full Splits Progression", "duration": 90, "sets": 2, "intensity": "high", "joints": ["hip"]},
            ],
        },
        "recovery": {
            1: [
                {"name": "Gentle Range of Motion", "sets": 2, "reps": 10, "intensity": "low", "joints": ["all"]},
                {"name": "Isometric Holds", "duration": 10, "sets": 3, "intensity": "low", "joints": ["target"]},
                {"name": "Light Walking", "duration": 300, "sets": 1, "intensity": "low", "joints": ["hip", "knee", "ankle"]},
            ],
            2: [
                {"name": "Resistance Band Exercises", "sets": 3, "reps": 12, "intensity": "medium", "joints": ["target"]},
                {"name": "Balance Training", "duration": 30, "sets": 3, "intensity": "medium", "joints": ["ankle", "knee"]},
                {"name": "Controlled Movements", "sets": 3, "reps": 15, "intensity": "medium", "joints": ["target"]},
            ],
            3: [
                {"name": "Sport-Specific Drills", "sets": 4, "reps": 10, "intensity": "high", "joints": ["all"]},
                {"name": "Plyometric Exercises", "sets": 3, "reps": 8, "intensity": "high", "joints": ["knee", "ankle"]},
                {"name": "Advanced Balance", "duration": 45, "sets": 4, "intensity": "high", "joints": ["ankle"]},
            ],
        },
    }
    
    NUTRITION_TIPS = {
        "strength": [
            "Consume 1.6-2.2g protein per kg body weight",
            "Eat within 30 minutes post-workout",
            "Stay hydrated - 3-4 liters water daily",
            "Include complex carbs for energy",
        ],
        "flexibility": [
            "Stay well hydrated for joint health",
            "Include omega-3 fatty acids",
            "Vitamin D for muscle function",
            "Magnesium for muscle relaxation",
        ],
        "recovery": [
            "Anti-inflammatory foods (turmeric, ginger)",
            "Adequate protein for tissue repair",
            "Vitamin C for collagen synthesis",
            "Avoid processed foods and sugar",
        ],
    }
    
    @staticmethod
    def calculate_plan_duration(goal: str, fitness_level: str, age: int) -> int:
        """Calculate optimal plan duration based on user profile"""
        base_days = {
            "strength": 60,
            "flexibility": 45,
            "recovery": 90,
            "endurance": 60,
            "pain_relief": 75,
        }
        
        days = base_days.get(goal, 60)
        
        # Adjust for age
        if age > 60:
            days += 15
        elif age > 45:
            days += 10
        
        # Adjust for fitness level
        if fitness_level == "beginner":
            days += 15
        elif fitness_level == "advanced":
            days -= 10
        
        return days
    
    @staticmethod
    def generate_plan(profile: UserProfile, user_id: int) -> TrainingPlan:
        """Generate a complete training plan"""
        import uuid
        
        total_days = TrainingPlanGenerator.calculate_plan_duration(
            profile.goal, profile.fitness_level, profile.age
        )
        
        start_date = datetime.now()
        target_end_date = start_date + timedelta(days=total_days)
        
        # Generate daily plans
        daily_plans = []
        current_level = 1 if profile.fitness_level == "beginner" else 2 if profile.fitness_level == "intermediate" else 3
        
        for day in range(1, total_days + 1):
            # Rest days every 7th day
            is_rest_day = day % 7 == 0
            
            if is_rest_day:
                daily_plan = DailyPlan(
                    day_number=day,
                    date=start_date + timedelta(days=day - 1),
                    exercises=[],
                    warm_up=["Light stretching", "Deep breathing"],
                    cool_down=["Meditation", "Foam rolling"],
                    nutrition_tips=TrainingPlanGenerator.NUTRITION_TIPS.get(profile.goal, [])[:2],
                    rest_day=True,
                )
            else:
                # Progressive difficulty - increase level every 20 days
                if day > 20 and day <= 40:
                    current_level = min(2, current_level + 1)
                elif day > 40:
                    current_level = min(3, current_level + 1)
                
                # Get exercises for current level
                exercises_data = TrainingPlanGenerator.EXERCISE_DATABASE.get(profile.goal, {}).get(current_level, [])
                
                exercises = [
                    ExerciseTask(
                        name=ex["name"],
                        description=f"Perform {ex['sets']} sets of {ex.get('reps', 'hold')}",
                        sets=ex["sets"],
                        reps=ex.get("reps", 0),
                        duration_seconds=ex.get("duration"),
                        intensity=ex["intensity"],
                        joint_focus=ex["joints"],
                        instructions=[
                            "Warm up properly before starting",
                            "Focus on form over speed",
                            "Breathe steadily throughout",
                            "Stop if you feel pain",
                        ],
                    )
                    for ex in exercises_data[:3]  # 3 exercises per day
                ]
                
                daily_plan = DailyPlan(
                    day_number=day,
                    date=start_date + timedelta(days=day - 1),
                    exercises=exercises,
                    warm_up=["5 min light cardio", "Dynamic stretching", "Joint rotations"],
                    cool_down=["Static stretching", "Deep breathing", "Hydration"],
                    nutrition_tips=TrainingPlanGenerator.NUTRITION_TIPS.get(profile.goal, [])[:2],
                    rest_day=False,
                )
            
            daily_plans.append(daily_plan)
        
        return TrainingPlan(
            plan_id=str(uuid.uuid4()),
            user_id=user_id,
            goal=profile.goal,
            start_date=start_date,
            target_end_date=target_end_date,
            current_day=1,
            total_days=total_days,
            current_level=current_level,
            daily_plans=daily_plans,
            overall_progress=0.0,
            streak_days=0,
            missed_days=0,
        )
    
    @staticmethod
    def adjust_plan_for_performance(plan: TrainingPlan, completion_rate: float) -> TrainingPlan:
        """Adjust plan duration based on user performance"""
        if completion_rate >= 0.9:  # 90%+ completion
            # User is doing great - can potentially shorten plan
            days_to_remove = min(5, plan.total_days - plan.current_day)
            plan.total_days -= days_to_remove
            plan.target_end_date -= timedelta(days=days_to_remove)
        elif completion_rate < 0.6:  # Less than 60% completion
            # User struggling - extend plan
            days_to_add = 7
            plan.total_days += days_to_add
            plan.target_end_date += timedelta(days=days_to_add)
        
        return plan
