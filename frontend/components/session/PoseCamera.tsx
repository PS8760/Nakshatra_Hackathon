"use client";

import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════
interface PoseCameraProps {
  sessionId?: number;
  token?: string;
  preset?: string;
  activeJoints?: string[];
  onRepComplete?: (joint: string, angle: number, repCount: number) => void;
  onFeedback?: (message: string, status: string) => void;
  onFormScore?: (score: number) => void;
  onDetailedFeedback?: (feedback: {
    joint: string;
    currentAngle: number;
    targetAngle: number;
    deviation: number;
    correction: string;
  }) => void;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface RepState {
  stage: "up" | "down" | "neutral";
  count: number;
  lastAngle: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// VOICE AUDIO ENGINE — Throttled speech synthesis for real-time coaching
// ═══════════════════════════════════════════════════════════════════════════
let _voiceTimer: ReturnType<typeof setTimeout> | null = null;
let _lastVoiceTime = 0;
const VOICE_COOLDOWN = 4000; // 4 seconds between voice cues

function speakCue(text: string, force = false) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const now = Date.now();
  if (!force && now - _lastVoiceTime < VOICE_COOLDOWN) return;
  _lastVoiceTime = now;

  if (_voiceTimer) clearTimeout(_voiceTimer);
  window.speechSynthesis.cancel();

  _voiceTimer = setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1.1;
    u.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(v => v.name.includes("Samantha") && v.lang.startsWith("en")) ||
      voices.find(v => v.name.includes("Google") && v.lang.startsWith("en-US")) ||
      voices.find(v => v.lang.startsWith("en-US")) ||
      voices[0];
    if (preferred) u.voice = preferred;

    u.onerror = (error: SpeechSynthesisErrorEvent) => {
      // Suppress "interrupted" and "canceled" errors (normal behavior)
      if (error.error === "interrupted" || error.error === "canceled") {
        console.log(`ℹ️ Voice cue ${error.error}`);
      } else {
        console.warn("Voice synthesis error:", error.error);
      }
    };
    window.speechSynthesis.speak(u);
  }, 60);
}

// ═══════════════════════════════════════════════════════════════════════════
// FINGER JOINT NAMES for hand landmark labeling
// ═══════════════════════════════════════════════════════════════════════════
const FINGER_NAMES = [
  "Wrist",
  "Thumb CMC", "Thumb MCP", "Thumb IP", "Thumb Tip",
  "Index MCP", "Index PIP", "Index DIP", "Index Tip",
  "Middle MCP", "Middle PIP", "Middle DIP", "Middle Tip",
  "Ring MCP", "Ring PIP", "Ring DIP", "Ring Tip",
  "Pinky MCP", "Pinky PIP", "Pinky DIP", "Pinky Tip",
];

// Finger curl measurement: MCP → PIP → DIP for each finger
const FINGER_CURL_TRIPLETS = [
  { name: "Index",  joints: [5, 6, 7] },
  { name: "Middle", joints: [9, 10, 11] },
  { name: "Ring",   joints: [13, 14, 15] },
  { name: "Pinky",  joints: [17, 18, 19] },
  { name: "Thumb",  joints: [1, 2, 3] },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function PoseCamera({
  sessionId,
  token,
  preset = "full",
  activeJoints,
  onRepComplete,
  onFeedback,
  onFormScore,
  onDetailedFeedback,
}: PoseCameraProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // FPS tracking
  const fpsRef = useRef<{
    lastTime: number;
    frameCount: number;
    currentFPS: number;
  }>({
    lastTime: performance.now(),
    frameCount: 0,
    currentFPS: 0,
  });

  // Rep counting state machines
  const repStatesRef = useRef<{
    rightElbow: RepState;
    leftElbow: RepState;
    rightKnee: RepState;
    leftKnee: RepState;
    rightWrist: RepState;
    leftWrist: RepState;
    rightAnkle: RepState;
    leftAnkle: RepState;
  }>({
    rightElbow: { stage: "neutral", count: 0, lastAngle: 180 },
    leftElbow: { stage: "neutral", count: 0, lastAngle: 180 },
    rightKnee: { stage: "neutral", count: 0, lastAngle: 180 },
    leftKnee: { stage: "neutral", count: 0, lastAngle: 180 },
    rightWrist: { stage: "neutral", count: 0, lastAngle: 180 },
    leftWrist: { stage: "neutral", count: 0, lastAngle: 180 },
    rightAnkle: { stage: "neutral", count: 0, lastAngle: 180 },
    leftAnkle: { stage: "neutral", count: 0, lastAngle: 180 },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const [isLoading, setIsLoading] = useState(true);
  const [totalReps, setTotalReps] = useState(0);
  const [currentFPS, setCurrentFPS] = useState(0);

  // Session metrics tracking
  const sessionMetricsRef = useRef<{
    formScores: number[];
    jointAngles: Record<string, number[]>;
    startTime: number;
  }>({
    formScores: [],
    jointAngles: {},
    startTime: Date.now(),
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTANTS - HARDCODED THRESHOLDS
  // ═══════════════════════════════════════════════════════════════════════════
  const MIN_DETECTION_CONFIDENCE = 0.1; // LOWERED: was 0.65 — draw skeleton no matter what
  const MIN_TRACKING_CONFIDENCE = 0.1; // LOWERED: was 0.65 — keep tracking even at low confidence

  // Rep counting thresholds
  const CURL_CONTRACTED_ANGLE = 45; // Arm fully curled
  const CURL_EXTENDED_ANGLE = 160; // Arm fully extended
  const SQUAT_DOWN_ANGLE = 90; // Knee bent (squatting)
  const SQUAT_UP_ANGLE = 160; // Knee extended (standing)
  const WRIST_FLEX_ANGLE = 120; // Wrist flexed
  const WRIST_EXT_ANGLE = 165; // Wrist extended
  const ANKLE_FLEX_ANGLE = 80;  // Ankle dorsiflexed
  const ANKLE_EXT_ANGLE = 140;  // Ankle plantarflexed

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calculate 3D angle between three landmarks
   * @param a - First landmark (e.g., shoulder)
   * @param b - Middle landmark/vertex (e.g., elbow)
   * @param c - Third landmark (e.g., wrist)
   * @returns Angle in degrees (0-180)
   */
  const calculate3DAngle = (a: Landmark, b: Landmark, c: Landmark): number => {
    // Vector BA (from B to A)
    const ba = {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z,
    };

    // Vector BC (from B to C)
    const bc = {
      x: c.x - b.x,
      y: c.y - b.y,
      z: c.z - b.z,
    };

    // Dot product
    const dotProduct = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;

    // Magnitudes
    const magnitudeBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
    const magnitudeBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

    // Avoid division by zero
    if (magnitudeBA === 0 || magnitudeBC === 0) {
      return 0;
    }

    // Calculate angle
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    
    // Clamp to [-1, 1] to avoid NaN from acos
    const clampedCos = Math.max(-1, Math.min(1, cosAngle));
    
    const angleRadians = Math.acos(clampedCos);
    const angleDegrees = (angleRadians * 180) / Math.PI;

    return Math.round(angleDegrees);
  };

  /**
   * Update FPS counter
   */
  const updateFPS = () => {
    const now = performance.now();
    const deltaTime = now - fpsRef.current.lastTime;

    fpsRef.current.frameCount++;

    // Update FPS every second
    if (deltaTime >= 1000) {
      const fps = Math.round((fpsRef.current.frameCount * 1000) / deltaTime);
      fpsRef.current.currentFPS = fps;
      fpsRef.current.frameCount = 0;
      fpsRef.current.lastTime = now;
      setCurrentFPS(fps);
    }
  };

  /**
   * Track angle for session metrics
   */
  const trackAngle = (jointName: string, angle: number) => {
    if (!sessionMetricsRef.current.jointAngles[jointName]) {
      sessionMetricsRef.current.jointAngles[jointName] = [];
    }
    sessionMetricsRef.current.jointAngles[jointName].push(angle);
  };

  /**
   * Track form score for session metrics
   */
  const trackFormScore = (score: number) => {
    sessionMetricsRef.current.formScores.push(score);
  };

  /**
   * Get session metrics for report generation
   */
  const getSessionMetrics = () => {
    const formScores = sessionMetricsRef.current.formScores;
    const duration = Math.floor((Date.now() - sessionMetricsRef.current.startTime) / 1000);

    return {
      sessionId: sessionId || 0,
      duration,
      totalReps,
      avgFormScore: formScores.length > 0 
        ? formScores.reduce((a, b) => a + b, 0) / formScores.length 
        : 0,
      peakFormScore: formScores.length > 0 ? Math.max(...formScores) : 0,
      lowestFormScore: formScores.length > 0 ? Math.min(...formScores) : 0,
      painEvents: [],
      jointAngles: sessionMetricsRef.current.jointAngles,
      exerciseType: preset || "full",
      completionRate: 100,
    };
  };

  /**
   * Provide detailed form correction feedback
   */
  const provideFormCorrection = (
    jointName: string,
    currentAngle: number,
    targetAngle: number,
    exerciseType: "curl" | "squat",
    stage: "up" | "down" | "neutral"
  ) => {
    const deviation = Math.abs(currentAngle - targetAngle);
    let correction = "";
    let feedbackStatus = "good";

    if (exerciseType === "curl") {
      if (stage === "up" && currentAngle > targetAngle + 15) {
        correction = `Bend your ${jointName.includes("left") ? "left" : "right"} elbow more! Aim for ${targetAngle}°`;
        feedbackStatus = "warning";
      } else if (stage === "down" && currentAngle < targetAngle - 15) {
        correction = `Straighten your ${jointName.includes("left") ? "left" : "right"} arm fully! Extend to ${targetAngle}°`;
        feedbackStatus = "warning";
      } else if (deviation < 10) {
        correction = `Perfect form on your ${jointName.includes("left") ? "left" : "right"} arm!`;
        feedbackStatus = "good";
      }
    } else if (exerciseType === "squat") {
      if (stage === "up" && currentAngle > targetAngle + 20) {
        correction = `Squat deeper! Bend your ${jointName.includes("left") ? "left" : "right"} knee to ${targetAngle}°`;
        feedbackStatus = "warning";
      } else if (stage === "down" && currentAngle < targetAngle - 20) {
        correction = `Stand up fully! Extend your ${jointName.includes("left") ? "left" : "right"} leg to ${targetAngle}°`;
        feedbackStatus = "warning";
      } else if (currentAngle < 70) {
        correction = `Don't go too deep! Risk of knee strain. Keep angle above 70°`;
        feedbackStatus = "out_of_range";
      } else if (deviation < 15) {
        correction = `Excellent squat depth on ${jointName.includes("left") ? "left" : "right"} leg!`;
        feedbackStatus = "good";
      }
    }

    if (correction && onDetailedFeedback) {
      onDetailedFeedback({
        joint: jointName,
        currentAngle,
        targetAngle,
        deviation,
        correction,
      });
    }

    if (correction && onFeedback) {
      onFeedback(correction, feedbackStatus);
    }
  };

  /**
   * Threshold-gated rep counter with state machine and form correction
   */
  const countRep = (
    jointName: keyof typeof repStatesRef.current,
    angle: number,
    exerciseType: "curl" | "squat",
    poseConfidence: number
  ) => {
    // Gate: Only count if confidence meets a very low threshold (effectively always count)
    if (poseConfidence < 0.05) {
      console.warn(`⚠️ countRep SKIPPED for ${jointName} — confidence too low: ${poseConfidence.toFixed(3)}`);
      return;
    }

    const state = repStatesRef.current[jointName];

    let contractedThreshold: number;
    let extendedThreshold: number;
    let targetContracted: number;
    let targetExtended: number;

    if (exerciseType === "curl") {
      contractedThreshold = CURL_CONTRACTED_ANGLE;
      extendedThreshold = CURL_EXTENDED_ANGLE;
      targetContracted = 45;
      targetExtended = 170;
    } else {
      contractedThreshold = SQUAT_DOWN_ANGLE;
      extendedThreshold = SQUAT_UP_ANGLE;
      targetContracted = 90;
      targetExtended = 170;
    }

    // Provide real-time form correction
    if (state.stage === "down") {
      provideFormCorrection(jointName, angle, targetContracted, exerciseType, "up");
    } else if (state.stage === "up") {
      provideFormCorrection(jointName, angle, targetExtended, exerciseType, "down");
    }

    // State machine: DOWN -> UP transition counts as 1 rep
    if (angle > extendedThreshold && state.stage !== "down") {
      // Fully extended position
      state.stage = "down";
      console.log(`${jointName}: Stage DOWN (${angle}°)`);
      
      if (onFeedback) {
        onFeedback(`Good! Now ${exerciseType === "curl" ? "curl" : "squat"} down slowly`, "good");
      }
    } else if (angle < contractedThreshold && state.stage === "down") {
      // Fully contracted position - complete rep
      state.stage = "up";
      state.count++;
      setTotalReps((prev) => prev + 1);

      console.log(`✅ ${jointName}: REP ${state.count} COMPLETED! (${angle}°)`);

      // 🔊 AUDIO: Voice announce rep completion
      speakCue(`Rep ${state.count} complete! Great form.`);

      // Callbacks
      if (onRepComplete) {
        onRepComplete(jointName, angle, state.count);
      }
      if (onFeedback) {
        onFeedback(`Excellent! Rep ${state.count} completed! Now extend back up`, "good");
      }
    }

    state.lastAngle = angle;
  };

  /**
   * Draw text on canvas with shadow
   */
  const drawText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    fontSize: number,
    color: string
  ) => {
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;

    // Draw outline
    ctx.strokeText(text, x, y);
    // Draw fill
    ctx.fillText(text, x, y);

    ctx.shadowBlur = 0;
  };

  /**
   * Draw angle text next to joint
   */
  const drawAngleText = (
    ctx: CanvasRenderingContext2D,
    landmark: Landmark,
    angle: number,
    width: number,
    height: number
  ) => {
    const x = landmark.x * width + 15;
    const y = landmark.y * height - 10;

    drawText(ctx, `${angle}°`, x, y, 16, "#ffffff");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIAPIPE HOLISTIC RESULTS CALLBACK
  // ═══════════════════════════════════════════════════════════════════════════
  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Update FPS
    updateFPS();

    // Set canvas size to match video
    canvas.width = results.image.width;
    canvas.height = results.image.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the video frame
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // ═══════════════════════════════════════════════════════════════════════
    // DRAW POSE LANDMARKS (BODY) - BLUE
    // ═══════════════════════════════════════════════════════════════════════
    if (results.poseLandmarks) {
      // 🔍 DEBUG: Log nose keypoint visibility on every frame
      const nose = results.poseLandmarks[0];
      if (nose) {
        console.log(
          `👃 Nose keypoint — visibility: ${nose.visibility?.toFixed(4) ?? 'N/A'}, ` +
          `x: ${nose.x.toFixed(3)}, y: ${nose.y.toFixed(3)}, z: ${nose.z.toFixed(3)}`
        );
      } else {
        console.warn('👃 Nose keypoint (index 0) is missing from poseLandmarks!');
      }

      // Draw connections (skeleton)
      if (window.drawConnectors) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
          color: "#0000FF",
          lineWidth: 4,
        });
      }

      // Draw landmarks (joints)
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, results.poseLandmarks, {
          color: "#00FFFF",
          lineWidth: 2,
          radius: 6,
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // CALCULATE ANGLES AND COUNT REPS
      // ═══════════════════════════════════════════════════════════════════
      const pose = results.poseLandmarks;

      // Calculate average pose confidence
      const avgConfidence =
        pose.reduce((sum: number, lm: Landmark) => sum + (lm.visibility || 0), 0) /
        pose.length;

      // Right Elbow Angle (Shoulder -> Elbow -> Wrist)
      if (pose[12] && pose[14] && pose[16]) {
        const angle = calculate3DAngle(pose[12], pose[14], pose[16]);
        drawAngleText(ctx, pose[14], angle, canvas.width, canvas.height);
        trackAngle("rightElbow", angle);
        countRep("rightElbow", angle, "curl", avgConfidence);
      }

      // Left Elbow Angle
      if (pose[11] && pose[13] && pose[15]) {
        const angle = calculate3DAngle(pose[11], pose[13], pose[15]);
        drawAngleText(ctx, pose[13], angle, canvas.width, canvas.height);
        trackAngle("leftElbow", angle);
        countRep("leftElbow", angle, "curl", avgConfidence);
      }

      // Right Knee Angle (Hip -> Knee -> Ankle)
      if (pose[24] && pose[26] && pose[28]) {
        const angle = calculate3DAngle(pose[24], pose[26], pose[28]);
        drawAngleText(ctx, pose[26], angle, canvas.width, canvas.height);
        trackAngle("rightKnee", angle);
        countRep("rightKnee", angle, "squat", avgConfidence);
      }

      // Left Knee Angle
      if (pose[23] && pose[25] && pose[27]) {
        const angle = calculate3DAngle(pose[23], pose[25], pose[27]);
        drawAngleText(ctx, pose[25], angle, canvas.width, canvas.height);
        trackAngle("leftKnee", angle);
        countRep("leftKnee", angle, "squat", avgConfidence);
      }

      // ═══════════════════════════════════════════════════════════════════
      // WRIST ANGLES (Elbow → Wrist → Index Finger MCP)
      // Right Wrist: landmarks 14 (elbow) → 16 (wrist) → 20 (index finger)
      // Left Wrist:  landmarks 13 (elbow) → 15 (wrist) → 19 (index finger)
      // ═══════════════════════════════════════════════════════════════════
      if (pose[14] && pose[16] && pose[20]) {
        const wristAngle = calculate3DAngle(pose[14], pose[16], pose[20]);
        drawAngleText(ctx, pose[16], wristAngle, canvas.width, canvas.height);
        drawText(ctx, "R.Wrist", pose[16].x * canvas.width - 40, pose[16].y * canvas.height + 20, 11, "#FF69B4");
        trackAngle("rightWrist", wristAngle);
        countRep("rightWrist", wristAngle, "curl", avgConfidence);
      }
      if (pose[13] && pose[15] && pose[19]) {
        const wristAngle = calculate3DAngle(pose[13], pose[15], pose[19]);
        drawAngleText(ctx, pose[15], wristAngle, canvas.width, canvas.height);
        drawText(ctx, "L.Wrist", pose[15].x * canvas.width - 40, pose[15].y * canvas.height + 20, 11, "#FF69B4");
        trackAngle("leftWrist", wristAngle);
        countRep("leftWrist", wristAngle, "curl", avgConfidence);
      }

      // ═══════════════════════════════════════════════════════════════════
      // ANKLE ANGLES (Knee → Ankle → Foot Index)
      // Right Ankle: landmarks 26 (knee) → 28 (ankle) → 32 (foot index)
      // Left Ankle:  landmarks 25 (knee) → 27 (ankle) → 31 (foot index)
      // ═══════════════════════════════════════════════════════════════════
      if (pose[26] && pose[28] && pose[32]) {
        const ankleAngle = calculate3DAngle(pose[26], pose[28], pose[32]);
        drawAngleText(ctx, pose[28], ankleAngle, canvas.width, canvas.height);
        drawText(ctx, "R.Ankle", pose[28].x * canvas.width - 40, pose[28].y * canvas.height + 20, 11, "#FFA500");
        trackAngle("rightAnkle", ankleAngle);
        countRep("rightAnkle", ankleAngle, "squat", avgConfidence);
      }
      if (pose[25] && pose[27] && pose[31]) {
        const ankleAngle = calculate3DAngle(pose[25], pose[27], pose[31]);
        drawAngleText(ctx, pose[27], ankleAngle, canvas.width, canvas.height);
        drawText(ctx, "L.Ankle", pose[27].x * canvas.width - 40, pose[27].y * canvas.height + 20, 11, "#FFA500");
        trackAngle("leftAnkle", ankleAngle);
        countRep("leftAnkle", ankleAngle, "squat", avgConfidence);
      }

      // Calculate form score
      const formScore = Math.round(avgConfidence * 100);
      trackFormScore(formScore);
      if (onFormScore) {
        onFormScore(formScore);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAW RIGHT HAND LANDMARKS (ALL 21 JOINTS) - GREEN + FINGER LABELS
    // ═══════════════════════════════════════════════════════════════════════
    if (results.rightHandLandmarks) {
      const rh = results.rightHandLandmarks;

      // Draw connections (finger bones)
      if (window.drawConnectors) {
        window.drawConnectors(ctx, rh, window.HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 3,
        });
      }

      // Draw landmarks (knuckles, fingertips, palm)
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, rh, {
          color: "#00FF00",
          lineWidth: 2,
          radius: 4,
        });
      }

      // Draw fingertip labels (tips: 4, 8, 12, 16, 20)
      const tipIndices = [4, 8, 12, 16, 20];
      const tipNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
      tipIndices.forEach((idx, i) => {
        if (rh[idx]) {
          drawText(ctx, tipNames[i], rh[idx].x * canvas.width + 8, rh[idx].y * canvas.height - 6, 10, "#00FF88");
        }
      });

      // Calculate and display finger curl angles
      FINGER_CURL_TRIPLETS.forEach(({ name, joints }) => {
        if (rh[joints[0]] && rh[joints[1]] && rh[joints[2]]) {
          const curlAngle = calculate3DAngle(rh[joints[0]], rh[joints[1]], rh[joints[2]]);
          const pip = rh[joints[1]];
          drawText(ctx, `${curlAngle}°`, pip.x * canvas.width - 20, pip.y * canvas.height - 12, 9, "#AAFFAA");
        }
      });

      // Palm label
      if (rh[0]) {
        drawText(ctx, "R.Palm", rh[0].x * canvas.width - 20, rh[0].y * canvas.height + 18, 11, "#00FF00");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAW LEFT HAND LANDMARKS (ALL 21 JOINTS) - RED + FINGER LABELS
    // ═══════════════════════════════════════════════════════════════════════
    if (results.leftHandLandmarks) {
      const lh = results.leftHandLandmarks;

      // Draw connections (finger bones)
      if (window.drawConnectors) {
        window.drawConnectors(ctx, lh, window.HAND_CONNECTIONS, {
          color: "#FF4444",
          lineWidth: 3,
        });
      }

      // Draw landmarks (knuckles, fingertips, palm)
      if (window.drawLandmarks) {
        window.drawLandmarks(ctx, lh, {
          color: "#FF4444",
          lineWidth: 2,
          radius: 4,
        });
      }

      // Draw fingertip labels
      const tipIndices = [4, 8, 12, 16, 20];
      const tipNames = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
      tipIndices.forEach((idx, i) => {
        if (lh[idx]) {
          drawText(ctx, tipNames[i], lh[idx].x * canvas.width + 8, lh[idx].y * canvas.height - 6, 10, "#FF8888");
        }
      });

      // Calculate and display finger curl angles
      FINGER_CURL_TRIPLETS.forEach(({ name, joints }) => {
        if (lh[joints[0]] && lh[joints[1]] && lh[joints[2]]) {
          const curlAngle = calculate3DAngle(lh[joints[0]], lh[joints[1]], lh[joints[2]]);
          const pip = lh[joints[1]];
          drawText(ctx, `${curlAngle}°`, pip.x * canvas.width - 20, pip.y * canvas.height - 12, 9, "#FFAAAA");
        }
      });

      // Palm label
      if (lh[0]) {
        drawText(ctx, "L.Palm", lh[0].x * canvas.width - 20, lh[0].y * canvas.height + 18, 11, "#FF4444");
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRAW UI OVERLAYS
    // ═══════════════════════════════════════════════════════════════════════

    // FPS Counter (top-left)
    drawText(ctx, `FPS: ${currentFPS}`, 20, 40, 28, "#00FF00");

    // Rep Counter (top-right)
    const repText = `Reps: ${totalReps}`;
    const textWidth = ctx.measureText(repText).width;
    drawText(ctx, repText, canvas.width - textWidth - 20, 45, 32, "#FFFF00");
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let isActive = true;

    const initialize = async () => {
      try {
        console.log("🚀 Initializing MediaPipe Holistic...");

        // Dynamically import MediaPipe modules
        const holisticModule = await import("@mediapipe/holistic");
        const cameraUtilsModule = await import("@mediapipe/camera_utils");
        const drawingUtilsModule = await import("@mediapipe/drawing_utils");

        // Make drawing utilities globally available
        (window as any).drawConnectors = drawingUtilsModule.drawConnectors;
        (window as any).drawLandmarks = drawingUtilsModule.drawLandmarks;
        (window as any).POSE_CONNECTIONS = holisticModule.POSE_CONNECTIONS;
        (window as any).HAND_CONNECTIONS = holisticModule.HAND_CONNECTIONS;

        // Initialize Holistic model
        const holistic = new holisticModule.Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
          },
        });

        // CRITICAL: Set hardcoded confidence thresholds
        holistic.setOptions({
          modelComplexity: 2, // 0=Lite, 1=Full, 2=Heavy (maximum accuracy)
          smoothLandmarks: true,
          enableSegmentation: false, // Disable for performance
          smoothSegmentation: false,
          refineFaceLandmarks: false, // Disable face mesh for performance
          minDetectionConfidence: MIN_DETECTION_CONFIDENCE, // 0.65
          minTrackingConfidence: MIN_TRACKING_CONFIDENCE, // 0.65
        });

        console.log(`✅ Holistic configured with confidence thresholds: ${MIN_DETECTION_CONFIDENCE}`);

        // Set results callback
        holistic.onResults(onResults);

        holisticRef.current = holistic;

        // Initialize camera
        const video = videoRef.current;
        if (!video || !isActive) return;

        const camera = new cameraUtilsModule.Camera(video, {
          onFrame: async () => {
            if (holisticRef.current && isActive) {
              await holisticRef.current.send({ image: video });
            }
          },
          width: 1280,
          height: 720,
        });

        cameraRef.current = camera;

        // Start camera
        await camera.start();

        console.log("✅ Camera started");
        // 🔊 AUDIO: Announce tracking is live
        speakCue("Tracking started. Stand in frame so I can see your full body.", true);
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Initialization error:", error);
        setIsLoading(false);
      }
    };

    initialize();

    // ═══════════════════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════════════════
    return () => {
      console.log("🛑 Cleaning up...");
      isActive = false;

      // Stop camera
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }

      // Close Holistic model
      if (holisticRef.current) {
        holisticRef.current.close();
        holisticRef.current = null;
      }

      // Stop video stream
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }

      console.log("✅ Cleanup complete");
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="relative w-full h-full">
      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-xl font-bold">Loading MediaPipe Holistic...</p>
            <p className="text-gray-300 text-sm mt-2">
              Initializing full body + hand tracking
            </p>
          </div>
        </div>
      )}

      {/* Video Element (hidden, used as source) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Canvas Overlay (visible, shows skeleton) */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain rounded-lg"
      />

      {/* Status Badge */}
      {!isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full z-10">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white text-sm font-semibold">
              Holistic Tracking Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL TYPE AUGMENTATION FOR MEDIAPIPE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
declare global {
  interface Window {
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
    HAND_CONNECTIONS: any;
  }
}
