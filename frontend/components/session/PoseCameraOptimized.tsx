"use client";
/**
 * PoseCameraOptimized — Professional Real-Time Pose Detection
 * 
 * Expert Computer Vision Implementation for Physical Rehabilitation
 * - BlazePose Heavy (33 keypoints, 3D coordinates)
 * - Optimized canvas rendering with zero latency
 * - Smart rep counting with state machine
 * - Professional skeleton overlay with depth-based rendering
 * - Real-time FPS monitoring
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Keypoint } from "@tensorflow-models/pose-detection";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface Keypoint3D {
  x: number;
  y: number;
  z: number;
  score: number;
}

type ExerciseStage = "up" | "down" | "idle";

interface RepCounterState {
  stage: ExerciseStage;
  count: number;
  lastAngle: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// BLAZEPOSE KEYPOINT INDICES (33 points)
// ══════════════════════════════════════════════════════════════════════════════

const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
};

// Skeleton connections for drawing bones
const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [POSE_LANDMARKS.LEFT_EAR, POSE_LANDMARKS.LEFT_EYE],
  [POSE_LANDMARKS.RIGHT_EAR, POSE_LANDMARKS.RIGHT_EYE],
  [POSE_LANDMARKS.LEFT_EYE, POSE_LANDMARKS.NOSE],
  [POSE_LANDMARKS.RIGHT_EYE, POSE_LANDMARKS.NOSE],
  // Torso
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER],
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP],
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_HIP],
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP],
  // Left arm
  [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_ELBOW],
  [POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.LEFT_WRIST],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_PINKY],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_INDEX],
  [POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.LEFT_THUMB],
  // Right arm
  [POSE_LANDMARKS.RIGHT_SHOULDER, POSE_LANDMARKS.RIGHT_ELBOW],
  [POSE_LANDMARKS.RIGHT_ELBOW, POSE_LANDMARKS.RIGHT_WRIST],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_PINKY],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_INDEX],
  [POSE_LANDMARKS.RIGHT_WRIST, POSE_LANDMARKS.RIGHT_THUMB],
  // Left leg
  [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE],
  [POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE],
  [POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.LEFT_HEEL],
  [POSE_LANDMARKS.LEFT_HEEL, POSE_LANDMARKS.LEFT_FOOT_INDEX],
  // Right leg
  [POSE_LANDMARKS.RIGHT_HIP, POSE_LANDMARKS.RIGHT_KNEE],
  [POSE_LANDMARKS.RIGHT_KNEE, POSE_LANDMARKS.RIGHT_ANKLE],
  [POSE_LANDMARKS.RIGHT_ANKLE, POSE_LANDMARKS.RIGHT_HEEL],
  [POSE_LANDMARKS.RIGHT_HEEL, POSE_LANDMARKS.RIGHT_FOOT_INDEX],
];

// Major physiotherapy joints (for glow effect)
const PHYSIO_JOINTS = [
  POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.RIGHT_SHOULDER,
  POSE_LANDMARKS.LEFT_ELBOW, POSE_LANDMARKS.RIGHT_ELBOW,
  POSE_LANDMARKS.LEFT_WRIST, POSE_LANDMARKS.RIGHT_WRIST,
  POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE, POSE_LANDMARKS.RIGHT_ANKLE,
];

// ══════════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate 2D angle between three points (in degrees)
 * @param a First point (e.g., shoulder)
 * @param b Vertex point (e.g., elbow)
 * @param c Third point (e.g., wrist)
 * @returns Angle in degrees (0-180)
 */
function calculateAngle2D(
  a: Keypoint3D,
  b: Keypoint3D,
  c: Keypoint3D
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

/**
 * Calculate 3D angle between three points (in degrees)
 * Uses dot product formula for higher accuracy
 */
function calculateAngle3D(
  a: Keypoint3D,
  b: Keypoint3D,
  c: Keypoint3D
): number {
  // Vectors BA and BC
  const BAx = a.x - b.x;
  const BAy = a.y - b.y;
  const BAz = a.z - b.z;
  const BCx = c.x - b.x;
  const BCy = c.y - b.y;
  const BCz = c.z - b.z;

  // Dot product
  const dot = BAx * BCx + BAy * BCy + BAz * BCz;

  // Magnitudes
  const magBA = Math.sqrt(BAx * BAx + BAy * BAy + BAz * BAz);
  const magBC = Math.sqrt(BCx * BCx + BCy * BCy + BCz * BCz);

  if (magBA === 0 || magBC === 0) return 0;

  // Angle in radians, then convert to degrees
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Check if keypoint is valid (exists and has good confidence)
 */
function isValidKeypoint(kp: Keypoint3D | undefined, threshold = 0.3): boolean {
  return (
    kp !== undefined &&
    kp.score >= threshold &&
    isFinite(kp.x) &&
    isFinite(kp.y)
  );
}

/**
 * Determine if keypoint is on left or right side
 */
function isLeftSide(index: number): boolean {
  const leftIndices = [
    1, 2, 3, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31,
  ];
  return leftIndices.includes(index);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function PoseCameraOptimized() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const isActiveRef = useRef(true);

  // FPS tracking
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });
  const [fps, setFps] = useState(0);

  // Rep counter state
  const repStateRef = useRef<RepCounterState>({
    stage: "idle",
    count: 0,
    lastAngle: 180,
  });
  const [repCount, setRepCount] = useState(0);
  const [currentStage, setCurrentStage] = useState<ExerciseStage>("idle");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current angles for display
  const [angles, setAngles] = useState<{
    leftElbow: number;
    rightElbow: number;
    leftKnee: number;
    rightKnee: number;
  }>({ leftElbow: 0, rightElbow: 0, leftKnee: 0, rightKnee: 0 });

  // ════════════════════════════════════════════════════════════════════════════
  // SMART REP COUNTING LOGIC (State Machine)
  // ════════════════════════════════════════════════════════════════════════════

  const updateRepCount = useCallback((angle: number) => {
    const state = repStateRef.current;

    // Bicep curl thresholds (adjust for different exercises)
    const DOWN_THRESHOLD = 160; // Arm extended
    const UP_THRESHOLD = 45; // Arm flexed
    const HYSTERESIS = 10; // Prevent jitter

    // State transitions
    if (state.stage === "idle" || state.stage === "up") {
      // Waiting for arm to extend (go down)
      if (angle > DOWN_THRESHOLD) {
        state.stage = "down";
        setCurrentStage("down");
      }
    } else if (state.stage === "down") {
      // Waiting for arm to flex (go up) - this completes a rep
      if (angle < UP_THRESHOLD) {
        state.stage = "up";
        state.count += 1;
        setCurrentStage("up");
        setRepCount(state.count);
        console.log(`✓ Rep completed! Total: ${state.count}`);
      }
    }

    state.lastAngle = angle;
  }, []);

  // ════════════════════════════════════════════════════════════════════════════
  // SKELETON DRAWING WITH PROFESSIONAL EFFECTS
  // ════════════════════════════════════════════════════════════════════════════

  const drawSkeleton = useCallback(
    (keypoints: Keypoint3D[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Draw bones with depth-based thickness
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        if (!isValidKeypoint(start) || !isValidKeypoint(end)) continue;

        // Calculate depth-based thickness (closer = thicker)
        const avgZ = (start.z + end.z) / 2;
        const thickness = Math.max(2, 6 - avgZ * 10); // Adjust multiplier as needed

        // Color based on side (left = yellow, right = green)
        const isLeft = isLeftSide(startIdx) && isLeftSide(endIdx);
        const color = isLeft
          ? "rgba(255, 215, 0, 0.8)" // Yellow for left
          : "rgba(0, 255, 127, 0.8)"; // Green for right

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = thickness;
        ctx.moveTo(start.x * w, start.y * h);
        ctx.lineTo(end.x * w, end.x * h);
        ctx.stroke();
      }

      // Draw keypoints with glow effect on physio joints
      for (let i = 0; i < keypoints.length; i++) {
        const kp = keypoints[i];
        if (!isValidKeypoint(kp)) continue;

        const x = kp.x * w;
        const y = kp.y * h;
        const isPhysioJoint = PHYSIO_JOINTS.includes(i);
        const isLeft = isLeftSide(i);

        // Base color
        const baseColor = isLeft ? "#FFD700" : "#00FF7F";
        const radius = isPhysioJoint ? 6 : 4;

        // Glow effect for major joints
        if (isPhysioJoint) {
          ctx.beginPath();
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
          gradient.addColorStop(0, baseColor + "AA");
          gradient.addColorStop(0.5, baseColor + "44");
          gradient.addColorStop(1, baseColor + "00");
          ctx.fillStyle = gradient;
          ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main dot
        ctx.beginPath();
        ctx.fillStyle = baseColor;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    []
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ANGLE DISPLAY ON CANVAS
  // ════════════════════════════════════════════════════════════════════════════

  const drawAngles = useCallback(
    (keypoints: Keypoint3D[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Left elbow angle
      if (
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_SHOULDER]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_ELBOW]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_WRIST])
      ) {
        const angle = calculateAngle3D(
          keypoints[POSE_LANDMARKS.LEFT_SHOULDER],
          keypoints[POSE_LANDMARKS.LEFT_ELBOW],
          keypoints[POSE_LANDMARKS.LEFT_WRIST]
        );
        const elbow = keypoints[POSE_LANDMARKS.LEFT_ELBOW];
        const x = elbow.x * w;
        const y = elbow.y * h - 25;

        // Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x - 30, y - 12, 60, 24);

        // Text
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`${Math.round(angle)}°`, x, y);

        setAngles((prev) => ({ ...prev, leftElbow: angle }));
      }

      // Right elbow angle
      if (
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_SHOULDER]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_ELBOW]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_WRIST])
      ) {
        const angle = calculateAngle3D(
          keypoints[POSE_LANDMARKS.RIGHT_SHOULDER],
          keypoints[POSE_LANDMARKS.RIGHT_ELBOW],
          keypoints[POSE_LANDMARKS.RIGHT_WRIST]
        );
        const elbow = keypoints[POSE_LANDMARKS.RIGHT_ELBOW];
        const x = elbow.x * w;
        const y = elbow.y * h - 25;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x - 30, y - 12, 60, 24);

        ctx.fillStyle = "#00FF7F";
        ctx.fillText(`${Math.round(angle)}°`, x, y);

        setAngles((prev) => ({ ...prev, rightElbow: angle }));

        // Update rep counter based on right elbow
        updateRepCount(angle);
      }

      // Left knee angle
      if (
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_HIP]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_KNEE]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.LEFT_ANKLE])
      ) {
        const angle = calculateAngle3D(
          keypoints[POSE_LANDMARKS.LEFT_HIP],
          keypoints[POSE_LANDMARKS.LEFT_KNEE],
          keypoints[POSE_LANDMARKS.LEFT_ANKLE]
        );
        const knee = keypoints[POSE_LANDMARKS.LEFT_KNEE];
        const x = knee.x * w;
        const y = knee.y * h - 25;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x - 30, y - 12, 60, 24);

        ctx.fillStyle = "#FFD700";
        ctx.fillText(`${Math.round(angle)}°`, x, y);

        setAngles((prev) => ({ ...prev, leftKnee: angle }));
      }

      // Right knee angle
      if (
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_HIP]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_KNEE]) &&
        isValidKeypoint(keypoints[POSE_LANDMARKS.RIGHT_ANKLE])
      ) {
        const angle = calculateAngle3D(
          keypoints[POSE_LANDMARKS.RIGHT_HIP],
          keypoints[POSE_LANDMARKS.RIGHT_KNEE],
          keypoints[POSE_LANDMARKS.RIGHT_ANKLE]
        );
        const knee = keypoints[POSE_LANDMARKS.RIGHT_KNEE];
        const x = knee.x * w;
        const y = knee.y * h - 25;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x - 30, y - 12, 60, 24);

        ctx.fillStyle = "#00FF7F";
        ctx.fillText(`${Math.round(angle)}°`, x, y);

        setAngles((prev) => ({ ...prev, rightKnee: angle }));
      }
    },
    [updateRepCount]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER LOOP
  // ════════════════════════════════════════════════════════════════════════════

  const renderLoop = useCallback(async () => {
    if (
      !isActiveRef.current ||
      !detectorRef.current ||
      !videoRef.current ||
      !canvasRef.current
    )
      return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });

    if (!ctx || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;

    // Set canvas size to match video
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    // Enable high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    try {
      // Draw video frame
      ctx.drawImage(video, 0, 0, w, h);

      // Detect pose
      const poses = await detectorRef.current.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
      });

      if (poses.length > 0) {
        const keypoints3D = poses[0].keypoints3D || poses[0].keypoints;

        // Convert to our format
        const kp: Keypoint3D[] = keypoints3D.map((k: any) => ({
          x: k.x,
          y: k.y,
          z: k.z || 0,
          score: k.score || 0,
        }));

        // Draw skeleton and angles
        drawSkeleton(kp, ctx, w, h);
        drawAngles(kp, ctx, w, h);
      }

      // Calculate FPS
      fpsRef.current.frames++;
      const now = performance.now();
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frames);
        fpsRef.current = { frames: 0, lastTime: now };
      }
    } catch (err) {
      console.error("Render error:", err);
    }

    animationRef.current = requestAnimationFrame(renderLoop);
  }, [drawSkeleton, drawAngles]);

  // ════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function init() {
      try {
        // Load TensorFlow.js
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();

        // Load BlazePose Heavy model
        const poseDetection = await import("@tensorflow-models/pose-detection");
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: "tfjs",
            modelType: "heavy", // Maximum accuracy
            enableSmoothing: true,
            enableSegmentation: false,
          }
        );

        detectorRef.current = detector;

        // Request webcam (640x480 for performance)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsLoading(false);
        animationRef.current = requestAnimationFrame(renderLoop);
      } catch (err: any) {
        setError(err.message || "Failed to initialize");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      isActiveRef.current = false;
      cancelAnimationFrame(animationRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      detectorRef.current?.dispose?.();
    };
  }, [renderLoop]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 640 }}>
      {/* Video element (hidden) */}
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      />

      {/* FPS Counter (Top-Left) */}
      {!isLoading && !error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(0, 0, 0, 0.8)",
            color: fps >= 20 ? "#00FF7F" : "#FFD700",
            padding: "8px 12px",
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 16,
            fontWeight: "bold",
            border: "2px solid currentColor",
          }}
        >
          {fps} FPS
        </div>
      )}

      {/* Rep Counter (Top-Right) */}
      {!isLoading && !error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(0, 0, 0, 0.8)",
            color: "#00FF7F",
            padding: "12px 20px",
            borderRadius: 8,
            fontFamily: "Arial, sans-serif",
            fontSize: 20,
            fontWeight: "bold",
            border: "2px solid #00FF7F",
          }}
        >
          Rep Count: {repCount}
          <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
            Stage: {currentStage.toUpperCase()}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🦴</div>
            <div style={{ fontSize: 18, fontWeight: "bold" }}>
              Loading BlazePose Heavy...
            </div>
            <div style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
              Initializing 33-point pose detection
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(139, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            padding: 32,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
              Error
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
