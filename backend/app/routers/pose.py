"""
Pose Analysis Router
====================
POST /pose/analyze  — analyze a single JPEG frame, return joint angle + feedback
POST /pose/debug-frame — frame diagnostics without full pose (for debugging)

engine param (form field):
    "mediapipe"  — existing MediaPipe Tasks path (default)
    "rtmpose"    — RTMPose-m / ViTPose-b via ONNX (higher accuracy)
"""
import logging
import numpy as np
from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from app.joint_processor import (
    preprocess_frame,
    decode_frame_for_mediapipe,
    process_frame,
    _get_landmarker,
    JOINT_TRIPLETS,
    VISIBILITY_THRESHOLD,
)
import mediapipe as mp

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/pose", tags=["pose"])


@router.post("/analyze")
async def analyze_frame(
    frame: UploadFile = File(..., description="JPEG or PNG frame from webcam"),
    joint: str = Form(..., description="Joint to track, e.g. knee_left"),
    target: float = Form(default=130.0, description="Target ROM in degrees"),
    input_shape: str = Form(default="480x640", description="Model input shape"),
    engine: str = Form(default="mediapipe", description="'mediapipe' or 'rtmpose'"),
):
    """
    Analyze a single webcam frame for joint angle.

    Returns:
        200 — JointResult with angle, status, feedback
        400 — Bad request (unknown joint, invalid image)
        422 — No subject detected (person not in frame / low visibility)
        500 — Unexpected model error
    """
    # ── Validate joint name ───────────────────────────────────────────────────
    if joint not in JOINT_TRIPLETS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "unknown_joint",
                "message": f"Joint '{joint}' is not supported.",
                "supported": list(JOINT_TRIPLETS.keys()),
            },
        )

    # ── RTMPose / ViTPose path ────────────────────────────────────────────────
    if engine == "rtmpose":
        try:
            from app.rtmpose_engine import get_rtmpose_engine
            rtm = get_rtmpose_engine()
            raw_bytes = await frame.read()
            joint_result = rtm.process_joint(raw_bytes, joint, target)

            if joint_result is None:
                return JSONResponse(status_code=422, content={
                    "error": "joint_extraction_failed",
                    "message": f"Could not extract angle for joint '{joint}'.",
                })
            if joint_result.status == "low_visibility":
                return JSONResponse(status_code=422, content={
                    "error": "low_visibility",
                    "message": joint_result.feedback,
                    "visibility": joint_result.visibility,
                })
            return {
                "joint": joint_result.joint, "angle": joint_result.angle,
                "target": joint_result.target, "deviation": joint_result.deviation,
                "visibility": joint_result.visibility, "status": joint_result.status,
                "feedback": joint_result.feedback, "engine": "rtmpose",
            }
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail={
                "error": "model_not_found",
                "message": str(e),
            })
        except Exception as e:
            logger.exception("RTMPose inference error: %s", e)
            raise HTTPException(status_code=500, detail={
                "error": "rtmpose_error", "message": str(e),
            })

    # ── Wholebody path (DWPose 133 kp) ───────────────────────────────────────
    if engine == "wholebody":
        try:
            from app.wholebody_engine import get_wholebody_engine, WHOLEBODY_JOINT_TRIPLETS
            wb = get_wholebody_engine()
            raw_bytes = await frame.read()

            if joint == "all":
                result = wb.infer_bytes(raw_bytes)
                return {
                    "engine": "wholebody",
                    "keypoints_detected": sum(1 for k in result.keypoints if k.score > 0.15),
                    "angles": result.angles,
                    "body":       [{"name":k.name,"x":k.x,"y":k.y,"score":k.score} for k in result.body],
                    "left_hand":  [{"name":k.name,"x":k.x,"y":k.y,"score":k.score} for k in result.left_hand],
                    "right_hand": [{"name":k.name,"x":k.x,"y":k.y,"score":k.score} for k in result.right_hand],
                    "feet":       [{"name":k.name,"x":k.x,"y":k.y,"score":k.score} for k in result.feet],
                }

            if joint not in WHOLEBODY_JOINT_TRIPLETS:
                raise HTTPException(status_code=400, detail={
                    "error": "unknown_joint",
                    "message": f"Joint '{joint}' not in wholebody model.",
                    "supported": list(WHOLEBODY_JOINT_TRIPLETS.keys()),
                })

            joint_result = wb.process_joint(raw_bytes, joint, target)
            if joint_result is None:
                return JSONResponse(status_code=422, content={"error": "joint_extraction_failed"})
            if joint_result.status == "low_visibility":
                return JSONResponse(status_code=422, content={
                    "error": "low_visibility", "message": joint_result.feedback,
                    "visibility": joint_result.visibility,
                })
            return {
                "joint": joint_result.joint, "angle": joint_result.angle,
                "target": joint_result.target, "deviation": joint_result.deviation,
                "visibility": joint_result.visibility, "status": joint_result.status,
                "feedback": joint_result.feedback, "engine": "wholebody",
            }
        except HTTPException:
            raise
        except FileNotFoundError as e:
            raise HTTPException(status_code=503, detail={"error": "model_not_found", "message": str(e)})
        except Exception as e:
            logger.exception("Wholebody inference error: %s", e)
            raise HTTPException(status_code=500, detail={"error": "wholebody_error", "message": str(e)})

    try:
        raw_bytes = await frame.read()
        if len(raw_bytes) < 500:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "frame_too_small",
                    "message": f"Frame is only {len(raw_bytes)} bytes — likely a blank or corrupt image.",
                    "bytes_received": len(raw_bytes),
                },
            )

        # Decode for MediaPipe (RGB uint8, native resolution)
        rgb_frame = decode_frame_for_mediapipe(raw_bytes)

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Frame decode error: %s", e)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "decode_failed",
                "message": "Could not decode image. Ensure the frame is a valid JPEG or PNG.",
                "detail": str(e),
            },
        )

    # ── Run MediaPipe pose estimation ─────────────────────────────────────────
    try:
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        with _get_landmarker() as landmarker:
            result = landmarker.detect(mp_image)

        if not result.pose_landmarks:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "no_subject_detected",
                    "message": "No person detected in frame. Ensure full body is visible, well-lit, and centred.",
                    "suggestions": [
                        "Stand 1–2 metres from the camera",
                        "Ensure the full body (head to feet) is in frame",
                        "Improve lighting — avoid strong backlighting",
                        "Check camera permissions in browser settings",
                    ],
                },
            )

        # ── Extract joint angle ───────────────────────────────────────────────
        joint_result = process_frame(result.pose_landmarks[0], joint, target)

        if joint_result is None:
            return JSONResponse(
                status_code=422,
                content={
                    "error": "joint_extraction_failed",
                    "message": f"Could not extract angle for joint '{joint}'.",
                },
            )

        if joint_result.status == "low_visibility":
            return JSONResponse(
                status_code=422,
                content={
                    "error": "low_visibility",
                    "message": joint_result.feedback,
                    "visibility": joint_result.visibility,
                    "threshold": VISIBILITY_THRESHOLD,
                },
            )

        return {
            "joint": joint_result.joint,
            "angle": joint_result.angle,
            "target": joint_result.target,
            "deviation": joint_result.deviation,
            "visibility": joint_result.visibility,
            "status": joint_result.status,
            "feedback": joint_result.feedback,
        }

    except HTTPException:
        raise
    except Exception as e:
        # Catch-all — model crash, numpy error, etc.
        logger.exception("Unexpected error in pose analysis: %s", e)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "model_error",
                "message": "Pose model encountered an unexpected error.",
                "detail": str(e),
            },
        )


@router.post("/debug-frame")
async def debug_frame(
    frame: UploadFile = File(...),
):
    """
    Debug endpoint — returns frame diagnostics without running full pose.
    Use this to verify the frame is arriving correctly before debugging detections.

    Returns: resolution, brightness, landmark count, per-landmark visibility.
    """
    try:
        raw_bytes = await frame.read()
        rgb = decode_frame_for_mediapipe(raw_bytes)
        h, w = rgb.shape[:2]
        brightness = float(np.mean(rgb))

        landmarks_info = []
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        with _get_landmarker() as landmarker:
            result = landmarker.detect(mp_image)
            if result.pose_landmarks:
                for i, lm in enumerate(result.pose_landmarks[0]):
                    landmarks_info.append({
                        "index": i,
                        "visibility": round(getattr(lm, "visibility", 0) or 0, 3),
                        "x": round(lm.x, 4),
                        "y": round(lm.y, 4),
                    })

        low_vis = [l for l in landmarks_info if l["visibility"] < VISIBILITY_THRESHOLD]

        return {
            "frame_ok": True,
            "bytes_received": len(raw_bytes),
            "resolution": {"width": w, "height": h},
            "mean_brightness": round(brightness, 1),
            "is_dark_frame": brightness < 20,
            "landmarks_detected": len(landmarks_info),
            "low_visibility_landmarks": len(low_vis),
            "low_visibility_details": low_vis[:5],  # first 5 for brevity
            "diagnosis": (
                "OK — landmarks detected with good visibility"
                if landmarks_info and len(low_vis) < 5
                else "WARNING — no landmarks detected" if not landmarks_info
                else f"WARNING — {len(low_vis)} landmarks below visibility threshold {VISIBILITY_THRESHOLD}"
            ),
        }

    except Exception as e:
        logger.error("Debug frame error: %s", e)
        return JSONResponse(
            status_code=400,
            content={
                "frame_ok": False,
                "error": str(e),
                "message": "Frame could not be decoded. Check encoding format.",
            },
        )
