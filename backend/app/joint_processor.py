"""
Joint Recovery Processor
========================
Server-side pose estimation and angle calculation using MediaPipe 0.10+.

MediaPipe 0.10 removed mp.solutions — this module uses the Tasks API
(mediapipe.tasks.python.vision.PoseLandmarker) for frame-level inference.

Architecture note:
  The primary path is browser-side BlazePose (PoseCamera.tsx) sending
  rep_complete events over WebSocket. This module handles the server-side
  path: raw JPEG frames POSTed to POST /pose/analyze.

Usage (standalone script):
    python -m app.joint_processor --joint knee_left --target 130
"""

import math
import os
import numpy as np
import cv2
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Literal

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python.vision import PoseLandmarker, PoseLandmarkerOptions, RunningMode

# ── Landmark index constants (BlazePose 33-point model) ──────────────────────
class LM:
    NOSE           = 0
    LEFT_SHOULDER  = 11; RIGHT_SHOULDER = 12
    LEFT_ELBOW     = 13; RIGHT_ELBOW    = 14
    LEFT_WRIST     = 15; RIGHT_WRIST    = 16
    LEFT_HIP       = 23; RIGHT_HIP      = 24
    LEFT_KNEE      = 25; RIGHT_KNEE     = 26
    LEFT_ANKLE     = 27; RIGHT_ANKLE    = 28

# ── Supported input shapes ────────────────────────────────────────────────────
InputShape = Literal["224x224", "256x256", "480x640", "720x1280"]

INPUT_SHAPES: dict[str, tuple[int, int]] = {
    "224x224":  (224, 224),
    "256x256":  (256, 256),
    "480x640":  (480, 640),
    "720x1280": (720, 1280),
}

VISIBILITY_THRESHOLD = 0.65

# ── Joint triplets (A, vertex B, C) — angle computed at B ────────────────────
JOINT_TRIPLETS: dict[str, tuple[int, int, int]] = {
    "knee_left":      (LM.LEFT_HIP,       LM.LEFT_KNEE,      LM.LEFT_ANKLE),
    "knee_right":     (LM.RIGHT_HIP,      LM.RIGHT_KNEE,     LM.RIGHT_ANKLE),
    "elbow_left":     (LM.LEFT_SHOULDER,  LM.LEFT_ELBOW,     LM.LEFT_WRIST),
    "elbow_right":    (LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW,    LM.RIGHT_WRIST),
    "shoulder_left":  (LM.LEFT_HIP,       LM.LEFT_SHOULDER,  LM.LEFT_ELBOW),
    "shoulder_right": (LM.RIGHT_HIP,      LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW),
    "hip_left":       (LM.RIGHT_HIP,      LM.LEFT_HIP,       LM.LEFT_KNEE),
    "hip_right":      (LM.LEFT_HIP,       LM.RIGHT_HIP,      LM.RIGHT_KNEE),
}

# ── Model file path (downloaded on first use) ─────────────────────────────────
_MODEL_PATH = Path(__file__).parent.parent / "data" / "pose_landmarker_full.task"


def _get_landmarker() -> PoseLandmarker:
    """
    Build a PoseLandmarker for single-image inference.
    Downloads the .task model file if not present.
    """
    if not _MODEL_PATH.exists():
        _download_model()

    options = PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(_MODEL_PATH)),
        running_mode=RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    return PoseLandmarker.create_from_options(options)


def _download_model():
    """Download the MediaPipe pose landmarker .task file."""
    import urllib.request
    _MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
    print(f"Downloading MediaPipe model to {_MODEL_PATH} …")
    urllib.request.urlretrieve(url, _MODEL_PATH)
    print("Download complete.")


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class JointResult:
    joint: str
    angle: float
    target: float
    deviation: float
    visibility: float
    feedback: str
    status: str   # "good" | "warning" | "out_of_range" | "low_visibility"


# ── Pre-processing ────────────────────────────────────────────────────────────

def preprocess_frame(
    raw_bytes: bytes,
    target_shape: str = "480x640",
    normalize: bool = True,
) -> np.ndarray:
    """
    Decode, resize, and normalize an incoming JPEG/PNG frame to match
    the exact input shape your model was trained on.

    Steps:
      1. Decode JPEG/PNG bytes → BGR numpy array (OpenCV)
      2. Resize to (H, W) using INTER_AREA (best for downscaling)
      3. Convert BGR → RGB
      4. Normalize to [0, 1] float32 if normalize=True

    Args:
        raw_bytes:    Raw image bytes from multipart upload
        target_shape: One of "224x224" | "256x256" | "480x640" | "720x1280"
        normalize:    True → float32 [0,1]  |  False → uint8 [0,255]
    """
    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image bytes — ensure JPEG or PNG format")

    h, w = INPUT_SHAPES.get(target_shape, (480, 640))
    interp = cv2.INTER_AREA if (frame.shape[0] > h or frame.shape[1] > w) else cv2.INTER_LINEAR
    resized = cv2.resize(frame, (w, h), interpolation=interp)
    rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

    return (rgb / 255.0).astype(np.float32) if normalize else rgb.astype(np.uint8)


def decode_frame_for_mediapipe(raw_bytes: bytes) -> np.ndarray:
    """
    Decode raw bytes → RGB uint8 array for MediaPipe Tasks API.
    MediaPipe expects RGB uint8, NOT normalized float.
    """
    arr = np.frombuffer(raw_bytes, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Could not decode image — invalid or corrupt frame bytes")
    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)


# ── Angle calculation ─────────────────────────────────────────────────────────

def compute_angle(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """
    Interior angle at vertex B formed by A-B-C.
    θ = arccos( (BA · BC) / (|BA| × |BC|) )
    Returns degrees (0–180).
    """
    ba, bc = a - b, c - b
    dot = np.dot(ba, bc)
    mag = np.linalg.norm(ba) * np.linalg.norm(bc)
    if mag == 0:
        return 0.0
    return float(math.degrees(math.acos(np.clip(dot / mag, -1.0, 1.0))))


def _get_feedback(angle: float, target: float) -> tuple[str, str]:
    diff = target - angle
    if diff <= 5:
        return "good", f"Perfect — {angle:.1f}° achieved (target {target:.0f}°)."
    elif diff <= 15:
        return "warning", f"Almost there — extend {diff:.0f}° more to reach {target:.0f}°."
    else:
        return "out_of_range", f"Keep going — {diff:.0f}° below target. Move slowly and steadily."


# ── process_frame — works with Tasks API landmark list ───────────────────────

def process_frame(landmarks: list, joint: str, target: float) -> Optional[JointResult]:
    """
    Extract angle for a single joint from a MediaPipe Tasks landmark list.

    Args:
        landmarks: result.pose_landmarks[0]  (list of NormalizedLandmark)
        joint:     one of JOINT_TRIPLETS keys
        target:    target ROM in degrees
    """
    if joint not in JOINT_TRIPLETS:
        return None

    idx_a, idx_b, idx_c = JOINT_TRIPLETS[joint]
    lm_a, lm_b, lm_c = landmarks[idx_a], landmarks[idx_b], landmarks[idx_c]

    # Tasks API uses .visibility attribute (same as legacy)
    visibility = min(
        getattr(lm_a, "visibility", 0) or 0,
        getattr(lm_b, "visibility", 0) or 0,
        getattr(lm_c, "visibility", 0) or 0,
    )

    if visibility < VISIBILITY_THRESHOLD:
        return JointResult(
            joint=joint, angle=0.0, target=target, deviation=0.0,
            visibility=round(visibility, 3),
            feedback="Move into better lighting — landmark visibility too low.",
            status="low_visibility",
        )

    a = np.array([lm_a.x, lm_a.y])
    b = np.array([lm_b.x, lm_b.y])
    c = np.array([lm_c.x, lm_c.y])

    angle = compute_angle(a, b, c)
    deviation = round(angle - target, 2)
    status, feedback = _get_feedback(angle, target)

    return JointResult(
        joint=joint, angle=round(angle, 1), target=target,
        deviation=deviation, visibility=round(visibility, 3),
        feedback=feedback, status=status,
    )


# ── Standalone webcam script ──────────────────────────────────────────────────

def run_webcam(joint: str = "knee_left", target: float = 130.0):
    """
    Standalone webcam loop using MediaPipe Tasks API (0.10+).
    Run with: python -m app.joint_processor --joint knee_left --target 130
    """
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Cannot open webcam")

    print(f"Tracking: {joint} | Target ROM: {target}°  |  Press Q to quit\n")

    with _get_landmarker() as landmarker:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = landmarker.detect(mp_image)

            if result.pose_landmarks:
                lms = result.pose_landmarks[0]
                jr = process_frame(lms, joint, target)
                if jr and jr.status != "low_visibility":
                    color = (0, 200, 0) if jr.status == "good" else \
                            (0, 165, 255) if jr.status == "warning" else (0, 0, 220)
                    cv2.putText(frame, f"{joint}: {jr.angle:.1f}deg [{jr.status}]",
                                (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                    cv2.putText(frame, jr.feedback,
                                (20, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 1)
                    print(f"\r{joint}: {jr.angle:.1f}°  dev: {jr.deviation:+.1f}°  [{jr.status}]   ", end="")

            cv2.imshow("Joint Tracker", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--joint",  default="knee_left", choices=list(JOINT_TRIPLETS.keys()))
    parser.add_argument("--target", type=float, default=130.0)
    args = parser.parse_args()
    run_webcam(joint=args.joint, target=args.target)
