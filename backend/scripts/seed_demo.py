"""
Seed 3 demo patients + 21 sessions (3 weeks of data) for hackathon demo.
Run: python scripts/seed_demo.py
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database import SessionLocal, engine, Base
from app import models
from app.auth import hash_password
from app.scoring import compute_physical_score, compute_composite_score
from datetime import datetime, timedelta
import random

Base.metadata.create_all(bind=engine)
db = SessionLocal()

JOINTS = ["knee_left", "knee_right", "shoulder_left", "hip_left"]
TARGET_ROMS = {"knee_left": 120.0, "knee_right": 120.0, "shoulder_left": 150.0, "hip_left": 90.0}


def seed():
    # Clear existing demo data
    for email in ["demo@neurorestore.ai", "demo2@neurorestore.ai", "demo3@neurorestore.ai", "doctor@neurorestore.ai"]:
        u = db.query(models.User).filter(models.User.email == email).first()
        if u:
            db.query(models.JointLog).filter(
                models.JointLog.session_id.in_(
                    db.query(models.Session.id).filter(models.Session.user_id == u.id)
                )
            ).delete(synchronize_session=False)
            db.query(models.PainEvent).filter(models.PainEvent.user_id == u.id).delete()
            db.query(models.Session).filter(models.Session.user_id == u.id).delete()
            db.query(models.RecoveryScore).filter(models.RecoveryScore.user_id == u.id).delete()
            db.query(models.ExerciseConfig).filter(models.ExerciseConfig.user_id == u.id).delete()
            db.delete(u)
    db.commit()

    # Create clinician
    doctor = models.User(
        email="doctor@neurorestore.ai",
        full_name="Dr. Sarah Chen",
        hashed_password=hash_password("Doctor@1234"),
        role="clinician",
    )
    db.add(doctor)
    db.commit()

    patients = [
        ("demo@neurorestore.ai", "Demo@1234", "Alex Johnson", 42),
        ("demo2@neurorestore.ai", "Demo@1234", "Maria Garcia", 28),
        ("demo3@neurorestore.ai", "Demo@1234", "James Wilson", 65),
    ]

    for email, pwd, name, start_score in patients:
        patient = models.User(
            email=email,
            full_name=name,
            hashed_password=hash_password(pwd),
            role="patient",
            assigned_clinician_id=doctor.id,
        )
        db.add(patient)
        db.commit()

        # Exercise configs
        for joint, target in TARGET_ROMS.items():
            cfg = models.ExerciseConfig(user_id=patient.id, joint=joint, target_rom=target, baseline_rom=target - 20)
            db.add(cfg)

        # 21 sessions over 3 weeks
        for day in range(21):
            session_date = datetime.utcnow() - timedelta(days=20 - day)
            progress = day / 20  # 0 → 1 over 3 weeks
            physical_score = min(95, start_score + progress * (85 - start_score) + random.uniform(-3, 3))

            session = models.Session(
                user_id=patient.id,
                session_type="physical",
                started_at=session_date,
                ended_at=session_date + timedelta(minutes=30),
                duration_s=1800,
                physical_score=round(physical_score, 1),
                cognitive_score=round(random.uniform(55, 85), 1),
            )
            session.recovery_score = compute_composite_score(session.physical_score, session.cognitive_score)
            db.add(session)
            db.commit()

            # Joint logs for this session
            for joint in JOINTS:
                target = TARGET_ROMS[joint]
                achieved = target * (physical_score / 100) + random.uniform(-2, 2)
                for rep in range(1, random.randint(8, 12)):
                    log = models.JointLog(
                        session_id=session.id,
                        joint=joint,
                        angle=round(achieved + random.uniform(-3, 3), 1),
                        target=target,
                        deviation=round(achieved - target, 1),
                        rep_number=rep,
                        side="left" if "left" in joint else "right",
                        visibility_score=round(random.uniform(0.75, 0.99), 2),
                    )
                    db.add(log)

            # Recovery score record
            rs = models.RecoveryScore(
                user_id=patient.id,
                date=session_date.date().isoformat(),
                physical_score=session.physical_score,
                cognitive_score=session.cognitive_score,
                composite_score=session.recovery_score,
            )
            db.add(rs)

        db.commit()
        print(f"✓ Seeded patient: {name} ({email})")

    print("\n✓ Demo credentials:")
    print("  Patient:   demo@neurorestore.ai / Demo@1234")
    print("  Clinician: doctor@neurorestore.ai / Doctor@1234")
    print("\n✓ Seed complete — 3 patients × 21 sessions each.")


if __name__ == "__main__":
    seed()
    db.close()
