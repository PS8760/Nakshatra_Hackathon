"""
Exercise Library — Progressive Chains & Variations
====================================================
Pure data module. No DB access, no changes to existing code.

Each joint has a PROGRESSION CHAIN: ordered list of exercises from easiest
to hardest. The system picks the current exercise based on the user's
achieved ROM vs target ROM thresholds.

Each exercise has VARIATIONS: alternatives for users who cannot perform
the primary exercise (e.g. can't do pull-ups → dead hang → assisted pull-up).

Structure:
    EXERCISE_CHAINS[joint] = [
        ExerciseLevel(
            level=1,
            name="...",
            description="...",
            rom_threshold=...,   # user must reach this ROM to unlock next level
            sets=..., reps=..., hold_s=...,
            cues=[...],          # coaching cues shown during exercise
            variations=[
                Variation(name, description, easier=True/False)
            ]
        ),
        ...
    ]
"""
from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class Variation:
    name: str
    description: str
    easier: bool = True          # True = regression, False = progression
    equipment: str = "none"      # "none" | "band" | "chair" | "wall" | "weights"


@dataclass
class ExerciseLevel:
    level: int
    name: str
    description: str
    rom_threshold: float         # degrees — must achieve this to progress to next level
    sets: int
    reps: int
    hold_s: int = 0              # hold duration in seconds (0 = dynamic)
    cues: list[str] = field(default_factory=list)
    variations: list[Variation] = field(default_factory=list)
    emoji: str = "💪"


# ── Knee ─────────────────────────────────────────────────────────────────────

KNEE_CHAIN: list[ExerciseLevel] = [
    ExerciseLevel(
        level=1, name="Heel Slides", emoji="🦵",
        description="Lie on your back. Slowly slide your heel toward your buttocks, bending the knee as far as comfortable.",
        rom_threshold=60.0, sets=2, reps=10, hold_s=2,
        cues=["Keep your heel on the surface", "Breathe out as you bend", "Stop if you feel sharp pain"],
        variations=[
            Variation("Gravity-Assisted Heel Slide", "Sit on a chair and let gravity help bend the knee.", easier=True),
            Variation("Towel-Assisted Heel Slide", "Loop a towel under your foot to assist the movement.", easier=True),
        ]
    ),
    ExerciseLevel(
        level=2, name="Seated Knee Flexion", emoji="🪑",
        description="Sit on a chair. Slowly bend your knee back as far as possible, then straighten.",
        rom_threshold=90.0, sets=3, reps=12, hold_s=3,
        cues=["Keep your thigh still", "Control the return movement", "Aim for full range"],
        variations=[
            Variation("Heel Slides", "Return to heel slides if seated flexion is too painful.", easier=True),
            Variation("Standing Knee Flexion", "Stand and bend knee behind you, holding a wall for balance.", easier=False),
        ]
    ),
    ExerciseLevel(
        level=3, name="Mini Squats", emoji="🏋️",
        description="Stand with feet shoulder-width apart. Bend knees to 45° and hold, then return.",
        rom_threshold=100.0, sets=3, reps=10, hold_s=3,
        cues=["Keep knees over toes", "Don't let knees cave inward", "Keep chest up"],
        variations=[
            Variation("Wall Sit (Partial)", "Lean against a wall and slide down to 30° only.", easier=True, equipment="wall"),
            Variation("Full Squat", "Increase depth to 90° knee flexion.", easier=False),
        ]
    ),
    ExerciseLevel(
        level=4, name="Full Squats", emoji="🏋️",
        description="Squat to 90° knee flexion with controlled descent and ascent.",
        rom_threshold=115.0, sets=3, reps=12,
        cues=["Thighs parallel to floor at bottom", "Drive through heels to stand", "Keep core engaged"],
        variations=[
            Variation("Goblet Squat", "Hold a weight at chest height for counterbalance.", easier=True, equipment="weights"),
            Variation("Bulgarian Split Squat", "Rear foot elevated — increases single-leg demand.", easier=False),
        ]
    ),
    ExerciseLevel(
        level=5, name="Step-Ups", emoji="🪜",
        description="Step up onto a raised surface (15–30cm), driving through the front heel.",
        rom_threshold=125.0, sets=3, reps=10,
        cues=["Full foot on the step", "Don't push off the back foot", "Control the lowering phase"],
        variations=[
            Variation("Low Step-Up (10cm)", "Use a lower step to reduce knee flexion demand.", easier=True),
            Variation("Weighted Step-Up", "Hold dumbbells to increase load.", easier=False, equipment="weights"),
        ]
    ),
]

# ── Elbow ─────────────────────────────────────────────────────────────────────

ELBOW_CHAIN: list[ExerciseLevel] = [
    ExerciseLevel(
        level=1, name="Passive Elbow Flexion", emoji="💪",
        description="Use your other hand to gently bend the elbow as far as comfortable. Hold and release.",
        rom_threshold=70.0, sets=2, reps=10, hold_s=5,
        cues=["Use gentle assistance only", "Never force the joint", "Breathe through the stretch"],
        variations=[
            Variation("Gravity-Assisted Flexion", "Let the arm hang and gravity assist the bend.", easier=True),
            Variation("Active Elbow Flexion", "Bend without assistance from the other hand.", easier=False),
        ]
    ),
    ExerciseLevel(
        level=2, name="Active Elbow Flexion", emoji="💪",
        description="Bend and straighten the elbow through full range without assistance.",
        rom_threshold=100.0, sets=3, reps=12,
        cues=["Keep upper arm still", "Full extension at the bottom", "Controlled speed"],
        variations=[
            Variation("Passive Flexion", "Use the other hand to assist if range is limited.", easier=True),
            Variation("Resistance Band Curl", "Add light resistance band for strengthening.", easier=False, equipment="band"),
        ]
    ),
    ExerciseLevel(
        level=3, name="Resistance Band Bicep Curl", emoji="🏋️",
        description="Stand on a resistance band. Curl both arms up to full flexion.",
        rom_threshold=120.0, sets=3, reps=12,
        cues=["Elbows pinned to sides", "Full range of motion", "Slow 3-second lowering"],
        variations=[
            Variation("Active Flexion (No Band)", "Remove the band if resistance is too high.", easier=True),
            Variation("Dumbbell Curl", "Progress to dumbbells for greater load.", easier=False, equipment="weights"),
        ]
    ),
    ExerciseLevel(
        level=4, name="Dumbbell Bicep Curl", emoji="🏋️",
        description="Curl dumbbells from full extension to full flexion with controlled movement.",
        rom_threshold=135.0, sets=3, reps=10,
        cues=["Supinate wrist at top", "Don't swing the body", "Eccentric control on the way down"],
        variations=[
            Variation("Resistance Band Curl", "Use a band instead of dumbbells.", easier=True, equipment="band"),
            Variation("Hammer Curl", "Neutral grip — targets brachialis for variety.", easier=False, equipment="weights"),
        ]
    ),
    ExerciseLevel(
        level=5, name="Dead Hang", emoji="🏋️",
        description="Hang from a bar with arms fully extended. Progress to chin-up.",
        rom_threshold=145.0, sets=3, reps=1, hold_s=20,
        cues=["Shoulders packed down", "Core engaged", "Breathe steadily"],
        variations=[
            Variation("Assisted Dead Hang", "Use a resistance band looped over the bar for support.", easier=True, equipment="band"),
            Variation("Pull-Up", "From dead hang, pull chin above the bar.", easier=False),
        ]
    ),
]

# ── Shoulder ──────────────────────────────────────────────────────────────────

SHOULDER_CHAIN: list[ExerciseLevel] = [
    ExerciseLevel(
        level=1, name="Pendulum Swings", emoji="🔄",
        description="Lean forward, let the arm hang freely. Gently swing in small circles using body momentum.",
        rom_threshold=60.0, sets=2, reps=20, hold_s=0,
        cues=["Relax the shoulder completely", "Let gravity do the work", "Small circles only"],
        variations=[
            Variation("Supine Shoulder Flexion", "Lie on your back and raise arm overhead with the other hand assisting.", easier=True),
            Variation("Pendulum with Weight", "Hold a light weight (0.5kg) to increase traction.", easier=False, equipment="weights"),
        ]
    ),
    ExerciseLevel(
        level=2, name="Wall Walks", emoji="🧱",
        description="Face a wall. Walk fingers up the wall as high as comfortable.",
        rom_threshold=90.0, sets=3, reps=10,
        cues=["Stand close to the wall", "Walk fingers, don't shrug", "Mark your highest point each session"],
        variations=[
            Variation("Pendulum Swings", "Return to pendulums if wall walks cause pain.", easier=True),
            Variation("Pulley-Assisted Flexion", "Use a door pulley to assist overhead movement.", easier=False, equipment="band"),
        ]
    ),
    ExerciseLevel(
        level=3, name="Shoulder Flexion with Band", emoji="💪",
        description="Stand on a resistance band. Raise arm forward to shoulder height, then overhead.",
        rom_threshold=120.0, sets=3, reps=12,
        cues=["Thumb pointing up", "Don't shrug the shoulder", "Control the lowering"],
        variations=[
            Variation("Wall Walks", "Use wall walks if band resistance is too high.", easier=True),
            Variation("Dumbbell Front Raise", "Use a light dumbbell instead of band.", easier=False, equipment="weights"),
        ]
    ),
    ExerciseLevel(
        level=4, name="Overhead Press", emoji="🏋️",
        description="Press dumbbells from shoulder height to full overhead extension.",
        rom_threshold=150.0, sets=3, reps=10,
        cues=["Core braced", "Don't arch the lower back", "Full lockout at top"],
        variations=[
            Variation("Seated Overhead Press", "Sit to reduce lower back demand.", easier=True, equipment="weights"),
            Variation("Arnold Press", "Rotate palms during the press for greater ROM.", easier=False, equipment="weights"),
        ]
    ),
]

# ── Hip ───────────────────────────────────────────────────────────────────────

HIP_CHAIN: list[ExerciseLevel] = [
    ExerciseLevel(
        level=1, name="Supine Hip Flexion", emoji="🦴",
        description="Lie on your back. Bring one knee toward your chest as far as comfortable.",
        rom_threshold=50.0, sets=2, reps=10, hold_s=5,
        cues=["Keep the other leg flat", "Use hands to assist gently", "Don't hold your breath"],
        variations=[
            Variation("Seated Hip Flexion", "Sit on a chair and lift the knee toward the chest.", easier=True),
            Variation("Standing Hip Flexion", "Stand and raise the knee to hip height.", easier=False),
        ]
    ),
    ExerciseLevel(
        level=2, name="Standing Hip Flexion", emoji="🦴",
        description="Stand holding a wall. Raise one knee to hip height, hold, and lower.",
        rom_threshold=70.0, sets=3, reps=12, hold_s=2,
        cues=["Keep the standing leg straight", "Don't lean back", "Controlled lowering"],
        variations=[
            Variation("Supine Hip Flexion", "Return to lying down if standing is too difficult.", easier=True),
            Variation("Hip Flexion with Band", "Add resistance band around the thigh.", easier=False, equipment="band"),
        ]
    ),
    ExerciseLevel(
        level=3, name="Hip Abduction", emoji="🦴",
        description="Stand holding a wall. Raise one leg out to the side to 30–45°.",
        rom_threshold=80.0, sets=3, reps=12,
        cues=["Keep toes pointing forward", "Don't tilt the pelvis", "Slow controlled movement"],
        variations=[
            Variation("Side-Lying Hip Abduction", "Lie on your side to remove balance demand.", easier=True),
            Variation("Banded Hip Abduction", "Add resistance band above the knees.", easier=False, equipment="band"),
        ]
    ),
    ExerciseLevel(
        level=4, name="Glute Bridge", emoji="🌉",
        description="Lie on your back, feet flat. Drive hips up to full extension and hold.",
        rom_threshold=90.0, sets=3, reps=12, hold_s=3,
        cues=["Squeeze glutes at the top", "Don't hyperextend the lower back", "Feet hip-width apart"],
        variations=[
            Variation("Partial Glute Bridge", "Only raise hips halfway if full extension is painful.", easier=True),
            Variation("Single-Leg Glute Bridge", "Extend one leg for increased difficulty.", easier=False),
        ]
    ),
]

# ── Master lookup ─────────────────────────────────────────────────────────────

EXERCISE_CHAINS: dict[str, list[ExerciseLevel]] = {
    "knee_left":      KNEE_CHAIN,
    "knee_right":     KNEE_CHAIN,
    "elbow_left":     ELBOW_CHAIN,
    "elbow_right":    ELBOW_CHAIN,
    "shoulder_left":  SHOULDER_CHAIN,
    "shoulder_right": SHOULDER_CHAIN,
    "hip_left":       HIP_CHAIN,
    "hip_right":      HIP_CHAIN,
}


def get_current_level(joint: str, achieved_rom: float) -> ExerciseLevel | None:
    """
    Return the appropriate exercise level for a user's current ROM.
    Picks the highest level whose rom_threshold the user has NOT yet exceeded
    (i.e. they're still working toward it).
    """
    chain = EXERCISE_CHAINS.get(joint)
    if not chain:
        return None

    # Find the first level whose threshold the user hasn't reached yet
    for level in chain:
        if achieved_rom < level.rom_threshold:
            return level

    # User has exceeded all thresholds — return the last (hardest) level
    return chain[-1]


def get_next_level(joint: str, current_level: int) -> ExerciseLevel | None:
    """Return the next progression level, or None if already at max."""
    chain = EXERCISE_CHAINS.get(joint)
    if not chain:
        return None
    for lvl in chain:
        if lvl.level == current_level + 1:
            return lvl
    return None


def get_easier_variation(level: ExerciseLevel) -> Variation | None:
    """Return the easiest regression variation for an exercise."""
    easier = [v for v in level.variations if v.easier]
    return easier[0] if easier else None


def get_harder_variation(level: ExerciseLevel) -> Variation | None:
    """Return the hardest progression variation."""
    harder = [v for v in level.variations if not v.easier]
    return harder[0] if harder else None
