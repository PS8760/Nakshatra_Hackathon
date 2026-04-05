"use client";
/**
 * HolisticCamera — MediaPipe Holistic Full Body + Hand Tracking
 * 
 * Expert Computer Vision Implementation for Physical Therapy
 * - Full body pose (33 landmarks)
 * - Left hand (21 landmarks - every finger, knuckle, palm joint)
 * - Right hand (21 landmarks - every finger, knuckle, palm joint)
 * - High-definition tracking with strict confidence thresholds
 * - Real-time FPS monitoring
 * - Threshold-gated rep counting with state machine
 */

import { useEffect, useRef, useState, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface HolisticResults {
  poseLandmarks?: Landmark[];
  leftHandLandmarks?: Landmark[];
  rightHandLandmarks?: Landmark[];
  image?: HTMLCanvasElement | HTMLVideoElement;
}

type RepStage = "idle" | "down" | "up";

interface RepCounterState {
  stage: RepStage;
  count: number;
  lastAngle: number;
  lastConfidence: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// MEDIAPIPE POSE LANDMARK INDICES (33 points)
// ══════════════════════════════════════════════════════════════════════════════

const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

// CRITICAL: Hardcoded thresholds for filtering bad data
const HOLISTIC_CONFIG = {
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
  modelComplexity: 1, // 0=lite, 1=full, 2=heavy
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: false,
  refineFaceLandmarks: false, // We don't need face details for PT
};

// Rep counting thresholds
const REP_THRESHOLDS = {
  CONTRACTION_ANGLE: 45, // Angle must be < 45° for contraction
  EXTENSION_ANGLE: 160, // Angle must be > 160° for extension
  MIN_CONFIDENCE: 0.65, // Minimum pose confidence to count rep
  HYSTERESIS: 10, // Prevent jitter
};

// Drawing colors
const COLORS = {
  BODY: "#0000FF", // Blue for body skeleton
  RIGHT_HAND: "#00FF00", // Green for right hand
  LEFT_HAND: "#FF0000", // Red for left hand
};

// ══════════════════════════════════════════════════════════════════════════════
// MATH UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate 3D angle between three points using dot product
 * @param a First point (e.g., shoulder)
 * @param b Vertex point (e.g., elbow)
 * @param c Third point (e.g., wrist)
 * @returns Angle in degrees (0-180)
 */
function calculate3DAngle(a: Landmark, b: Landmark, c: Landmark): number {
  // Vector BA
  const BAx = a.x - b.x;
  const BAy = a.y - b.y;
  const BAz = a.z - b.z;

  // Vector BC
  const BCx = c.x - b.x;
  const BCy = c.y - b.y;
  const BCz = c.z - b.z;

  // Dot product
  const dotProduct = BAx * BCx + BAy * BCy + BAz * BCz;

  // Magnitudes
  const magBA = Math.sqrt(BAx * BAx + BAy * BAy + BAz * BAz);
  const magBC = Math.sqrt(BCx * BCx + BCy * BCy + BCz * BCz);

  if (magBA === 0 || magBC === 0) return 0;

  // Angle in radians, then convert to degrees
  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (magBA * magBC)));
  const angleRadians = Math.acos(cosAngle);
  return (angleRadians * 180) / Math.PI;
}

/**
 * Calculate average confidence from landmarks
 */
function calculateAverageConfidence(landmarks: Landmark[]): number {
  if (!landmarks || landmarks.length === 0) return 0;
  const sum = landmarks.reduce(
    (acc, lm) => acc + (lm.visibility || 0),
    0
  );
  return sum / landmarks.length;
}

/**
 * Check if landmark is valid
 */
function isValidLandmark(lm: Landmark | undefined): boolean {
  return (
    lm !== undefined &&
    isFinite(lm.x) &&
    isFinite(lm.y) &&
    isFinite(lm.z) &&
    (lm.visibility === undefined || lm.visibility >= HOLISTIC_CONFIG.minTrackingConfidence)
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function HolisticCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // FPS tracking
  const fpsRef = useRef({
    lastTime: performance.now(),
    frames: 0,
    currentFps: 0,
  });
  const [fps, setFps] = useState(0);

  // Rep counter state
  const repStateRef = useRef<RepCounterState>({
    stage: "idle",
    count: 0,
    lastAngle: 180,
    lastConfidence: 0,
  });
  const [repCount, setRepCount] = useState(0);
  const [currentStage, setCurrentStage] = useState<RepStage>("idle");
  const [currentAngle, setCurrentAngle] = useState(0);
  const [poseConfidence, setPoseConfidence] = useState(0);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════════════════
  // THRESHOLD-GATED REP COUNTER (State Machine)
  // ════════════════════════════════════════════════════════════════════════════

  const updateRepCount = useCallback(
    (angle: number, confidence: number) => {
      const state = repStateRef.current;

      // CRITICAL: Only count if confidence meets threshold
      if (confidence < REP_THRESHOLDS.MIN_CONFIDENCE) {
        console.log(
          `⚠️ Confidence too low: ${confidence.toFixed(2)} < ${REP_THRESHOLDS.MIN_CONFIDENCE}`
        );
        return;
      }

      // State machine logic
      if (state.stage === "idle" || state.stage === "up") {
        // Waiting for extension (arm straightens)
        if (angle > REP_THRESHOLDS.EXTENSION_ANGLE) {
          state.stage = "down";
          setCurrentStage("down");
          console.log(`📐 Stage: DOWN (angle: ${angle.toFixed(1)}°)`);
        }
      } else if (state.stage === "down") {
        // Waiting for contraction (arm bends) - this completes a rep
        if (angle < REP_THRESHOLDS.CONTRACTION_ANGLE) {
          state.stage = "up";
          state.count += 1;
          setCurrentStage("up");
          setRepCount(state.count);
          console.log(
            `✅ REP COMPLETED! Total: ${state.count} (angle: ${angle.toFixed(1)}°, confidence: ${confidence.toFixed(2)})`
          );
        }
      }

      state.lastAngle = angle;
      state.lastConfidence = confidence;
    },
    []
  );

  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOM DRAWING FUNCTIONS (New Approach)
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Draw a single landmark with glow effect
   */
  const drawLandmark = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmark: Landmark,
      color: string,
      size: number,
      w: number,
      h: number
    ) => {
      const x = landmark.x * w;
      const y = landmark.y * h;

      // Outer glow
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
      gradient.addColorStop(0, color + "FF");
      gradient.addColorStop(0.4, color + "AA");
      gradient.addColorStop(1, color + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Main dot
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();
    },
    []
  );

  /**
   * Draw connection between two landmarks with gradient
   */
  const drawConnection = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      start: Landmark,
      end: Landmark,
      color: string,
      width: number,
      w: number,
      h: number
    ) => {
      const x1 = start.x * w;
      const y1 = start.y * h;
      const x2 = end.x * w;
      const y2 = end.y * h;

      // Gradient along the bone
      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      gradient.addColorStop(0, color + "DD");
      gradient.addColorStop(0.5, color + "FF");
      gradient.addColorStop(1, color + "DD");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Shadow/outline
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = width + 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    },
    []
  );

  /**
   * Main drawing function with custom rendering
   */
  const drawResults = useCallback(
    (results: HolisticResults) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = video.videoWidth;
      const h = video.videoHeight;

      // Set canvas size to match video
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      // Clear and draw video frame
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);

      // Load connections dynamically
      import("@mediapipe/holistic").then((holistic) => {
        const { POSE_CONNECTIONS, HAND_CONNECTIONS } = holistic;

        // ═══════════════════════════════════════════════════════════════
        // DRAW BODY SKELETON (Blue with custom rendering)
        // ═══════════════════════════════════════════════════════════════
        if (results.poseLandmarks) {
          const pose = results.poseLandmarks;

          // Draw connections first (bones)
          POSE_CONNECTIONS.forEach(([startIdx, endIdx]: [number, number]) => {
            const start = pose[startIdx];
            const end = pose[endIdx];
            if (isValidLandmark(start) && isValidLandmark(end)) {
              drawConnection(ctx, start, end, COLORS.BODY, 5, w, h);
            }
          });

          // Draw landmarks (joints)
          pose.forEach((landmark, idx) => {
            if (isValidLandmark(landmark)) {
              // Major joints are larger
              const isMajorJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].includes(idx);
              const size = isMajorJoint ? 8 : 5;
              drawLandmark(ctx, landmark, COLORS.BODY, size, w, h);
            }
          });

          // Calculate and display joint angles
          if (
            isValidLandmark(pose[POSE_LANDMARKS.RIGHT_SHOULDER]) &&
            isValidLandmark(pose[POSE_LANDMARKS.RIGHT_ELBOW]) &&
            isValidLandmark(pose[POSE_LANDMARKS.RIGHT_WRIST])
          ) {
            const angle = calculate3DAngle(
              pose[POSE_LANDMARKS.RIGHT_SHOULDER],
              pose[POSE_LANDMARKS.RIGHT_ELBOW],
              pose[POSE_LANDMARKS.RIGHT_WRIST]
            );

            setCurrentAngle(angle);

            const confidence = calculateAverageConfidence(pose);
            setPoseConfidence(confidence);

            updateRepCount(angle, confidence);

            // Draw angle label with enhanced styling
            const elbow = pose[POSE_LANDMARKS.RIGHT_ELBOW];
            const x = elbow.x * w;
            const y = elbow.y * h - 35;

            // Background with shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 10;
            ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
            ctx.beginPath();
            ctx.roundRect(x - 40, y - 15, 80, 30, 8);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Angle text
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "#00FF00";
            ctx.fillText(`${Math.round(angle)}°`, x, y + 5);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // DRAW RIGHT HAND (Green with enhanced detail)
        // ═══════════════════════════════════════════════════════════════
        if (results.rightHandLandmarks) {
          const hand = results.rightHandLandmarks;

          // Draw connections (finger bones)
          HAND_CONNECTIONS.forEach(([startIdx, endIdx]: [number, number]) => {
            const start = hand[startIdx];
            const end = hand[endIdx];
            if (isValidLandmark(start) && isValidLandmark(end)) {
              drawConnection(ctx, start, end, COLORS.RIGHT_HAND, 4, w, h);
            }
          });

          // Draw landmarks (finger joints)
          hand.forEach((landmark, idx) => {
            if (isValidLandmark(landmark)) {
              // Fingertips are larger
              const isTip = [4, 8, 12, 16, 20].includes(idx);
              const size = isTip ? 7 : 5;
              drawLandmark(ctx, landmark, COLORS.RIGHT_HAND, size, w, h);
            }
          });

          // Label: "RIGHT HAND"
          const wrist = hand[0];
          if (isValidLandmark(wrist)) {
            const x = wrist.x * w;
            const y = wrist.y * h - 25;
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(x - 45, y - 10, 90, 20);
            ctx.fillStyle = COLORS.RIGHT_HAND;
            ctx.fillText("RIGHT HAND", x, y + 4);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // DRAW LEFT HAND (Red with enhanced detail)
        // ═══════════════════════════════════════════════════════════════
        if (results.leftHandLandmarks) {
          const hand = results.leftHandLandmarks;

          // Draw connections (finger bones)
          HAND_CONNECTIONS.forEach(([startIdx, endIdx]: [number, number]) => {
            const start = hand[startIdx];
            const end = hand[endIdx];
            if (isValidLandmark(start) && isValidLandmark(end)) {
              drawConnection(ctx, start, end, COLORS.LEFT_HAND, 4, w, h);
            }
          });

          // Draw landmarks (finger joints)
          hand.forEach((landmark, idx) => {
            if (isValidLandmark(landmark)) {
              // Fingertips are larger
              const isTip = [4, 8, 12, 16, 20].includes(idx);
              const size = isTip ? 7 : 5;
              drawLandmark(ctx, landmark, COLORS.LEFT_HAND, size, w, h);
            }
          });

          // Label: "LEFT HAND"
          const wrist = hand[0];
          if (isValidLandmark(wrist)) {
            const x = wrist.x * w;
            const y = wrist.y * h - 25;
            ctx.font = "bold 12px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(x - 45, y - 10, 90, 20);
            ctx.fillStyle = COLORS.LEFT_HAND;
            ctx.fillText("LEFT HAND", x, y + 4);
          }
        }
      });

      // ═══════════════════════════════════════════════════════════════
      // DRAW UI OVERLAYS
      // ═══════════════════════════════════════════════════════════════

      // FPS Counter (Top-Left) - Enhanced
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.beginPath();
      ctx.roundRect(15, 15, 110, 45, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.font = "bold 24px monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = fps >= 20 ? "#00FF00" : "#FFD700";
      ctx.fillText(`${fps}`, 30, 45);
      ctx.font = "12px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText("FPS", 85, 45);

      // Rep Counter (Top-Right) - Enhanced
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.beginPath();
      ctx.roundRect(w - 195, 15, 180, 70, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.textAlign = "right";
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#00FF00";
      ctx.fillText(`${repCount}`, w - 30, 50);
      ctx.font = "14px Arial";
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText("REPS", w - 30, 70);

      // Stage indicator
      const stageColor =
        currentStage === "up" ? "#00FF00" : currentStage === "down" ? "#FFD700" : "#888";
      ctx.fillStyle = stageColor;
      ctx.font = "bold 12px Arial";
      ctx.fillText(currentStage.toUpperCase(), w - 110, 50);

      // Confidence Indicator (Bottom-Left) - Enhanced
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.beginPath();
      ctx.roundRect(15, h - 65, 220, 50, 10);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.textAlign = "left";
      const confColor =
        poseConfidence >= REP_THRESHOLDS.MIN_CONFIDENCE ? "#00FF00" : "#FF0000";
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = confColor;
      ctx.fillText(
        `Confidence: ${(poseConfidence * 100).toFixed(0)}%`,
        30,
        h - 40
      );
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "12px Arial";
      ctx.fillText(`Angle: ${currentAngle.toFixed(1)}°`, 30, h - 22);
    },
    [
      fps,
      repCount,
      currentStage,
      currentAngle,
      poseConfidence,
      updateRepCount,
      drawLandmark,
      drawConnection,
    ]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // RESULTS CALLBACK (Called for each frame)
  // ════════════════════════════════════════════════════════════════════════════

  const onResults = useCallback(
    (results: HolisticResults) => {
      // Calculate FPS
      const now = performance.now();
      const deltaTime = now - fpsRef.current.lastTime;

      if (deltaTime > 0) {
        const instantFps = 1000 / deltaTime;
        // Smooth FPS display
        fpsRef.current.currentFps =
          fpsRef.current.currentFps * 0.9 + instantFps * 0.1;
        fpsRef.current.frames++;

        // Update FPS display every 10 frames
        if (fpsRef.current.frames % 10 === 0) {
          setFps(Math.round(fpsRef.current.currentFps));
        }
      }

      fpsRef.current.lastTime = now;

      // Draw results
      drawResults(results);
    },
    [drawResults]
  );

  // ════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let mounted = true;

    async function initializeHolistic() {
      try {
        console.log("🚀 Initializing MediaPipe Holistic...");

        // Dynamically import MediaPipe modules
        const [holisticModule, cameraModule] = await Promise.all([
          import("@mediapipe/holistic"),
          import("@mediapipe/camera_utils"),
        ]);

        if (!mounted) return;

        const { Holistic } = holisticModule;
        const { Camera } = cameraModule;

        // Initialize Holistic model
        const holistic = new Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
          },
        });

        // CRITICAL: Set hardcoded confidence thresholds
        holistic.setOptions({
          modelComplexity: HOLISTIC_CONFIG.modelComplexity,
          smoothLandmarks: HOLISTIC_CONFIG.smoothLandmarks,
          enableSegmentation: HOLISTIC_CONFIG.enableSegmentation,
          smoothSegmentation: HOLISTIC_CONFIG.smoothSegmentation,
          refineFaceLandmarks: HOLISTIC_CONFIG.refineFaceLandmarks,
          minDetectionConfidence: HOLISTIC_CONFIG.minDetectionConfidence,
          minTrackingConfidence: HOLISTIC_CONFIG.minTrackingConfidence,
        });

        console.log("✅ Holistic configuration:", HOLISTIC_CONFIG);

        holistic.onResults(onResults);
        holisticRef.current = holistic;

        // Initialize camera
        if (videoRef.current) {
          const camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && holisticRef.current) {
                await holisticRef.current.send({ image: videoRef.current });
              }
            },
            width: 1280,
            height: 720,
          });

          await camera.start();
          cameraRef.current = camera;

          console.log("✅ Camera started successfully");
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("❌ Initialization error:", err);
        setError(err.message || "Failed to initialize MediaPipe Holistic");
        setIsLoading(false);
      }
    }

    initializeHolistic();

    return () => {
      mounted = false;
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (holisticRef.current) {
        holisticRef.current.close();
      }
    };
  }, [onResults]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "auto",
          visibility: "hidden",
        }}
      />

      {/* Canvas overlay (exactly on top of video) */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      />

      {/* Loading State */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦴</div>
            <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              Loading MediaPipe Holistic...
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Full body + hands tracking
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.6,
                marginTop: 12,
                fontFamily: "monospace",
              }}
            >
              Detection: {HOLISTIC_CONFIG.minDetectionConfidence} | Tracking:{" "}
              {HOLISTIC_CONFIG.minTrackingConfidence}
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
            background: "rgba(139, 0, 0, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            padding: 32,
          }}
        >
          <div style={{ textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              Initialization Error
            </div>
            <div style={{ fontSize: 14, opacity: 0.9 }}>{error}</div>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                background: "#fff",
                color: "#8B0000",
                border: "none",
                borderRadius: 8,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
