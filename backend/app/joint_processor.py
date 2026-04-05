"""
Joint Recovery Processor
========================
Server-side pose estimation and angle calculation using MediaPipe.

Architecture note:
  The primary path for this app is browser-side BlazePose (PoseCamera.tsx)
  sending rep_complete events over WebSocket. This module handles the
  alternative server-side path: raw video frames POSTed to the backend,
  or a local webcam feed processed in a script/worker.

Usage (standalone script):
    python -m app.joint_processor --joint knee_left --target 130

Usage (import):
    from app.joint_processor import process_frame, get_feedback
"""

import math
import numpy as np
import mediapipe as mp
from dataclasses import dataclass
from typing import Optional

# ── MediaPipe setup ───────────────────────────────────────────────────────────
_mp_pose = mp.solutions.pose

# Landmark index constants (MediaPipe BlazePose 33-point model)
LM = _mp_pose.PoseLandmark


@dataclass
class JointResult:
    joint: str
    angle: float          # degrees
    target: float         # target ROM in degrees
    deviation: float      # angle - target (positive = exceeded, negative = short)
    visibility: float     # min visibility of the 3 landmarks (0–1)
    feedback: str         # human-readable cue
    status: str           # "good" | "warning" | "out_of_range" | "low_visibility"


# ── Joint landmark triplets (A, vertex B, C) ─────────────────────────────────
# Angle is computed at B: the interior angle formed by A-B-C
JOINT_TRIPLETS: dict[str, tuple] = {
    "knee_left":      (LM.LEFT_HIP,       LM.LEFT_KNEE,      LM.LEFT_ANKLE),
    "knee_right":     (LM.RIGHT_HIP,      LM.RIGHT_KNEE,     LM.RIGHT_ANKLE),
    "elbow_left":     (LM.LEFT_SHOULDER,  LM.LEFT_ELBOW,     LM.LEFT_WRIST),
    "elbow_right":    (LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW,    LM.RIGHT_WRIST),
    "shoulder_left":  (LM.LEFT_HIP,       LM.LEFT_SHOULDER,  LM.LEFT_ELBOW),
    "shoulder_right": (LM.RIGHT_HIP,      LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW),
    "hip_left":       (LM.RIGHT_HIP,      LM.LEFT_HIP,       LM.LEFT_KNEE),
    "hip_right":      (LM.LEFT_HIP,       LM.RIGHT_HIP,      LM.RIGHT_KNEE),
}

VISIBILITY_THRESHOLD = 0.65


def compute_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """
    Compute the interior angle at vertex B formed by points A-B-C.

    Uses the dot-product formula:
        θ = arccos( (BA · BC) / (|BA| × |BC|) )

    Args:
        a, b, c: 2D or 3D coordinate arrays [x, y] or [x, y, z]

    Returns:
        Angle in degrees (0–180).
    """
    ba = a - b
    bc = c - b

    dot = np.dot(ba, bc)
    mag_ba = np.linalg.norm(ba)
    mag_bc = np.linalg.norm(bc)

    if mag_ba == 0 or mag_bc == 0:
        return 0.0

    # Clamp to [-1, 1] to guard against floating-point drift
    cos_angle = np.clip(dot / (mag_ba * mag_bc), -1.0, 1.0)
    return float(math.degrees(math.acos(cos_angle)))


def _get_feedback(angle: float, target: float) -> tuple[str, str]:
    """
    Returns (status, message) based on how close angle is to target ROM.

    Thresholds (clinically aligned with ws_handler.py):
        ≤ 5° short  → good
        ≤ 15° short → warning
        > 15° short → out_of_range
        exceeded    → good (capped at target for scoring, but not penalised)
    """
    diff = target - angle  # positive = hasn't reached target yet

    if diff <= 5:
        return "good", f"Perfect — {angle:.1f}° achieved (target {target:.0f}°)."
    elif diff <= 15:
        return "warning", f"Almost there — extend {diff:.0f}° more to reach {target:.0f}°."
    else:
        return "out_of_range", f"Keep going — {diff:.0f}° below target. Move slowly and steadily."


def process_frame(
    landmarks,          # mediapipe NormalizedLandmarkList
    joint: str,
    target: float,
) -> Optional[JointResult]:
    """
    Extract angle for a single joint from a MediaPipe landmark result.

    Args:
        landmarks: result.pose_landmarks.landmark (NormalizedLandmarkList)
        joint:     one of JOINT_TRIPLETS keys, e.g. "knee_left"
        target:    target ROM in degrees (from ExerciseConfig.target_rom)

    Returns:
        JointResult or None if joint name is unknown.
    """
    if joint not in JOINT_TRIPLETS:
        return None

    lm_a_idx, lm_b_idx, lm_c_idx = JOINT_TRIPLETS[joint]
    lm = landmarks

    lm_a = lm[lm_a_idx]
    lm_b = lm[lm_b_idx]
    lm_c = lm[lm_c_idx]

    visibility = min(lm_a.visibility, lm_b.visibility, lm_c.visibility)

    if visibility < VISIBILITY_THRESHOLD:
        return JointResult(
            joint=joint,
            angle=0.0,
            target=target,
            deviation=0.0,
            visibility=visibility,
            feedback="Move into better lighting — landmark visibility too low.",
            status="low_visibility",
        )

    # Use 2D (x, y) — z is available but adds noise for angle calc in most exercises
    a = np.array([lm_a.x, lm_a.y])
    b = np.array([lm_b.x, lm_b.y])
    c = np.array([lm_c.x, lm_c.y])

    angle = compute_angle(a, b, c)
    deviation = round(angle - target, 2)
    status, feedback = _get_feedback(angle, target)

    return JointResult(
        joint=joint,
        angle=round(angle, 1),
        target=target,
        deviation=deviation,
        visibility=round(visibility, 3),
        feedback=feedback,
        status=status,
    )


def run_webcam(joint: str = "knee_left", target: float = 130.0):
    """
    Standalone webcam loop — for local testing / script usage.
    Prints angle + feedback to stdout in real time.
    Not used in the FastAPI server path (browser handles pose via PoseCamera.tsx).

    Run with:
        python -m app.joint_processor --joint knee_left --target 130
    """
    import cv2

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam")

    print(f"Tracking: {joint} | Target ROM: {target}°")
    print("Press Q to quit.\n")

    with _mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,          # 0=lite, 1=full, 2=heavy
        smooth_landmarks=True,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6,
    ) as pose:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # MediaPipe expects RGB
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            rgb.flags.writeable = False
            result = pose.process(rgb)
            rgb.flags.writeable = True

            if result.pose_landmarks:
                jr = process_frame(result.pose_landmarks.landmark, joint, target)
                if jr:
                    color = (0, 200, 0) if jr.status == "good" else \
                            (0, 165, 255) if jr.status == "warning" else (0, 0, 220)

                    # Draw angle on frame
                    cv2.putText(
                        frame,
                        f"{joint}: {jr.angle:.1f}deg  [{jr.status}]",
                        (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2,
                    )
                    cv2.putText(
                        frame, jr.feedback,
                        (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1,
                    )
                    print(f"\r{joint}: {jr.angle:.1f}°  deviation: {jr.deviation:+.1f}°  [{jr.status}] {jr.feedback}   ", end="")

                # Draw skeleton
                mp.solutions.drawing_utils.draw_landmarks(
                    frame,
                    result.pose_landmarks,
                    _mp_pose.POSE_CONNECTIONS,
                )

            cv2.imshow("Joint Tracker", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Joint angle tracker")
    parser.add_argument("--joint",  default="knee_left", choices=list(JOINT_TRIPLETS.keys()))
    parser.add_argument("--target", type=float, default=130.0, help="Target ROM in degrees")
    args = parser.parse_args()

    run_webcam(joint=args.joint, target=args.target)
