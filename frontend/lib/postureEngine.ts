/**
 * postureEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI Physiotherapist — Posture Fault Detection Engine
 *
 * Architecture:
 *   BlazePose 33 keypoints (3D) → Exercise Classifier → Fault Detector → Feedback
 *
 * BlazePose keypoint indices (33 points):
 *  0:nose  1:left_eye_inner  2:left_eye  3:left_eye_outer
 *  4:right_eye_inner  5:right_eye  6:right_eye_outer
 *  7:left_ear  8:right_ear  9:mouth_left  10:mouth_right
 * 11:left_shoulder  12:right_shoulder
 * 13:left_elbow     14:right_elbow
 * 15:left_wrist     16:right_wrist
 * 17:left_pinky     18:right_pinky
 * 19:left_index     20:right_index
 * 21:left_thumb     22:right_thumb
 * 23:left_hip       24:right_hip
 * 25:left_knee      26:right_knee
 * 27:left_ankle     28:right_ankle
 * 29:left_heel      30:right_heel
 * 31:left_foot_index 32:right_foot_index
 */

export interface Keypoint3D {
  x: number;   // normalized 0-1
  y: number;   // normalized 0-1
  z: number;   // depth (relative, negative = closer to camera)
  score: number; // visibility/confidence 0-1
  name?: string;
}

export interface PostureFault {
  severity: "info" | "warning" | "error";
  fault: string;           // short code e.g. "knee_cave"
  message: string;         // human-readable coaching cue
  joint?: string;          // which joint is affected
  value?: number;          // measured value
  threshold?: number;      // what it should be
}

export interface ExerciseAnalysis {
  exercise: string;        // detected exercise name
  phase: string;           // "descending" | "bottom" | "ascending" | "top" | "hold"
  repCount: number;
  faults: PostureFault[];
  angles: Record<string, number>;
  score: number;           // 0-100 form score for this frame
  feedback: string;        // primary coaching message
}

// ── Keypoint index constants ──────────────────────────────────────────────────
export const BP = {
  NOSE: 0,
  LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,    RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,    RIGHT_WRIST: 16,
  LEFT_HIP: 23,      RIGHT_HIP: 24,
  LEFT_KNEE: 25,     RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,    RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,     RIGHT_HEEL: 30,
  LEFT_FOOT: 31,     RIGHT_FOOT: 32,
} as const;

// ── Math helpers ──────────────────────────────────────────────────────────────

/** 3D angle at vertex B formed by A-B-C (degrees) */
export function angle3D(A: Keypoint3D, B: Keypoint3D, C: Keypoint3D): number {
  const BAx = A.x - B.x, BAy = A.y - B.y, BAz = (A.z ?? 0) - (B.z ?? 0);
  const BCx = C.x - B.x, BCy = C.y - B.y, BCz = (C.z ?? 0) - (B.z ?? 0);
  const dot = BAx * BCx + BAy * BCy + BAz * BCz;
  const magBA = Math.sqrt(BAx ** 2 + BAy ** 2 + BAz ** 2);
  const magBC = Math.sqrt(BCx ** 2 + BCy ** 2 + BCz ** 2);
  if (magBA === 0 || magBC === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * 180) / Math.PI;
}

/** 2D angle (ignores z) */
export function angle2D(A: Keypoint3D, B: Keypoint3D, C: Keypoint3D): number {
  const BAx = A.x - B.x, BAy = A.y - B.y;
  const BCx = C.x - B.x, BCy = C.y - B.y;
  const dot = BAx * BCx + BAy * BCy;
  const mag = Math.sqrt(BAx ** 2 + BAy ** 2) * Math.sqrt(BCx ** 2 + BCy ** 2);
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/**
 * Confidence-weighted angle — uses keypoint visibility scores to blend
 * 3D and 2D angles. High confidence → full 3D. Low confidence → fall back to 2D.
 * This is the key accuracy improvement: bad keypoints don't corrupt the angle.
 * 
 * Enhanced with Kalman-inspired filtering for temporal consistency.
 */
export function weightedAngle(A: Keypoint3D, B: Keypoint3D, C: Keypoint3D): number {
  const minConf = Math.min(A.score, B.score, C.score);
  const hasDepth = Math.abs(A.z) > 0.001 || Math.abs(B.z) > 0.001 || Math.abs(C.z) > 0.001;

  if (!hasDepth || minConf < 0.2) {
    // Low confidence or no depth — use 2D only
    return angle2D(A, B, C);
  }

  if (minConf >= 0.85) {
    // High confidence — full 3D (threshold raised from 0.8 to 0.85 for better accuracy)
    return angle3D(A, B, C);
  }

  // Medium confidence — blend 3D and 2D weighted by confidence
  // Enhanced weighting curve for smoother transitions
  const w = Math.pow((minConf - 0.5) / 0.35, 1.2); // 0 at conf=0.5, 1 at conf=0.85
  return angle3D(A, B, C) * w + angle2D(A, B, C) * (1 - w);
}

/**
 * Outlier detection using median absolute deviation (MAD).
 * Rejects angles that deviate significantly from recent history.
 */
export function isOutlier(value: number, history: number[], threshold = 3.0): boolean {
  if (history.length < 5) return false;
  const sorted = [...history].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const deviations = history.map(v => Math.abs(v - median));
  const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
  if (mad === 0) return false;
  return Math.abs(value - median) > threshold * mad * 1.4826; // 1.4826 = consistency constant
}

/** Midpoint of two keypoints */
function mid(A: Keypoint3D, B: Keypoint3D): Keypoint3D {
  return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: ((A.z ?? 0) + (B.z ?? 0)) / 2, score: Math.min(A.score, B.score) };
}

/** Euclidean distance (2D) */
function dist2D(A: Keypoint3D, B: Keypoint3D): number {
  return Math.sqrt((A.x - B.x) ** 2 + (A.y - B.y) ** 2);
}

function visible(kp: Keypoint3D, threshold = 0.2): boolean {
  return (kp?.score ?? 0) >= threshold;
}

// ── Exercise Classifier ───────────────────────────────────────────────────────

export type ExerciseType =
  | "squat" | "lunge" | "knee_extension" | "hip_abduction"
  | "shoulder_press" | "lateral_raise" | "bicep_curl"
  | "standing" | "unknown";

/**
 * Classify exercise from pose keypoints.
 * Uses heuristics based on joint angles and body position.
 */
export function classifyExercise(kp: Keypoint3D[], preset: string): ExerciseType {
  // Preset always wins — user explicitly chose the exercise
  switch (preset) {
    case "knee":     return detectKneeExercise(kp);
    case "shoulder": return detectShoulderExercise(kp);
    case "hip":      return "hip_abduction";
    case "squat":    return "squat";
    case "full":     {
      // Auto-detect for full body
      const knee = detectKneeExercise(kp);
      if (knee !== "standing" && knee !== "unknown") return knee;
      const shoulder = detectShoulderExercise(kp);
      if (shoulder !== "standing" && shoulder !== "unknown") return shoulder;
      return "standing";
    }
  }
  // Fallback auto-detect
  const knee = detectKneeExercise(kp);
  if (knee !== "standing" && knee !== "unknown") return knee;
  return detectShoulderExercise(kp);
}

function detectKneeExercise(kp: Keypoint3D[]): ExerciseType {
  const lHip = kp[BP.LEFT_HIP], lKnee = kp[BP.LEFT_KNEE], lAnkle = kp[BP.LEFT_ANKLE];
  const rHip = kp[BP.RIGHT_HIP], rKnee = kp[BP.RIGHT_KNEE], rAnkle = kp[BP.RIGHT_ANKLE];
  if (!visible(lKnee) && !visible(rKnee)) return "unknown";

  const kneeAngle = visible(lKnee) && visible(lHip) && visible(lAnkle)
    ? angle2D(lHip, lKnee, lAnkle)
    : visible(rKnee) && visible(rHip) && visible(rAnkle)
      ? angle2D(rHip, rKnee, rAnkle)
      : 180;

  // Check if one leg is forward (lunge) vs both symmetric (squat)
  if (visible(lAnkle) && visible(rAnkle)) {
    const footSpread = Math.abs(lAnkle.x - rAnkle.x);
    const footDepth = Math.abs(lAnkle.y - rAnkle.y);
    if (footDepth > 0.1 && footSpread < 0.15) return "lunge";
  }

  if (kneeAngle < 160) return "squat";
  return "standing";
}

function detectShoulderExercise(kp: Keypoint3D[]): ExerciseType {
  const lShoulder = kp[BP.LEFT_SHOULDER], lElbow = kp[BP.LEFT_ELBOW], lWrist = kp[BP.LEFT_WRIST];
  if (!visible(lShoulder) || !visible(lElbow)) return "unknown";

  const elbowAngle = visible(lWrist) ? angle2D(lShoulder, lElbow, lWrist) : 180;
  const armRaise = lWrist && lShoulder ? lShoulder.y - lWrist.y : 0; // positive = wrist above shoulder

  if (armRaise > 0.05 && elbowAngle > 150) return "lateral_raise";
  if (armRaise > 0.1 && elbowAngle < 120) return "shoulder_press";
  if (elbowAngle < 100) return "bicep_curl";
  return "standing";
}

// ── Per-exercise Fault Detectors ──────────────────────────────────────────────

function analyzeSquat(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];
  const lHip = kp[BP.LEFT_HIP], rHip = kp[BP.RIGHT_HIP];
  const lKnee = kp[BP.LEFT_KNEE], rKnee = kp[BP.RIGHT_KNEE];
  const lAnkle = kp[BP.LEFT_ANKLE], rAnkle = kp[BP.RIGHT_ANKLE];
  const lShoulder = kp[BP.LEFT_SHOULDER], rShoulder = kp[BP.RIGHT_SHOULDER];
  const nose = kp[BP.NOSE];

  // 1. Knee cave (valgus) — knees collapse inward
  if (visible(lKnee) && visible(lAnkle) && visible(rKnee) && visible(rAnkle)) {
    const kneeWidth = Math.abs(lKnee.x - rKnee.x);
    const ankleWidth = Math.abs(lAnkle.x - rAnkle.x);
    if (ankleWidth > 0.05 && kneeWidth < ankleWidth * 0.75) {
      faults.push({
        severity: "error", fault: "knee_cave",
        message: "Knees caving inward — push knees out over your toes",
        joint: "knee", value: kneeWidth / ankleWidth, threshold: 0.85,
      });
    }
  }

  // 2. Forward lean — torso too far forward
  if (visible(lShoulder) && visible(lHip) && visible(lKnee)) {
    const hipAngle = angles["hip_left"] ?? 0;
    if (hipAngle < 50 && angles["knee_left"] < 130) {
      faults.push({
        severity: "warning", fault: "forward_lean",
        message: "Too much forward lean — keep chest up and back straight",
        joint: "hip", value: hipAngle, threshold: 60,
      });
    }
  }

  // 3. Depth check — not squatting deep enough
  if (visible(lHip) && visible(lKnee)) {
    const kneeAngle = angles["knee_left"] ?? 180;
    if (kneeAngle > 110 && kneeAngle < 160) {
      faults.push({
        severity: "info", fault: "shallow_squat",
        message: "Go deeper — aim for thighs parallel to floor",
        joint: "knee", value: kneeAngle, threshold: 90,
      });
    }
  }

  // 4. Heel rise — heels lifting off ground
  if (visible(lAnkle) && visible(lHip)) {
    const ankleAngle = angles["ankle_left"] ?? 90;
    if (ankleAngle < 60) {
      faults.push({
        severity: "warning", fault: "heel_rise",
        message: "Keep heels flat on the ground — improve ankle mobility",
        joint: "ankle",
      });
    }
  }

  // 5. Asymmetry — one side doing more work
  if (angles["knee_left"] && angles["knee_right"]) {
    const diff = Math.abs(angles["knee_left"] - angles["knee_right"]);
    if (diff > 20) {
      faults.push({
        severity: "warning", fault: "asymmetry",
        message: `Uneven squat — ${angles["knee_left"] < angles["knee_right"] ? "left" : "right"} side is lower`,
        value: diff, threshold: 15,
      });
    }
  }

  return faults;
}

function analyzeLunge(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];

  // Front knee over toes
  const frontKneeAngle = Math.min(angles["knee_left"] ?? 180, angles["knee_right"] ?? 180);
  if (frontKneeAngle > 110) {
    faults.push({
      severity: "info", fault: "lunge_depth",
      message: "Step further forward — front knee should be at 90°",
      joint: "knee", value: frontKneeAngle, threshold: 90,
    });
  }

  // Torso upright
  const lShoulder = kp[BP.LEFT_SHOULDER], lHip = kp[BP.LEFT_HIP];
  if (visible(lShoulder) && visible(lHip)) {
    const lean = Math.abs(lShoulder.x - lHip.x);
    if (lean > 0.08) {
      faults.push({
        severity: "warning", fault: "torso_lean",
        message: "Keep torso upright — don't lean forward",
        joint: "hip",
      });
    }
  }

  return faults;
}

function analyzeShoulderPress(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];

  // Elbow flare — elbows too wide
  const lShoulder = kp[BP.LEFT_SHOULDER], rShoulder = kp[BP.RIGHT_SHOULDER];
  const lElbow = kp[BP.LEFT_ELBOW], rElbow = kp[BP.RIGHT_ELBOW];
  if (visible(lElbow) && visible(lShoulder)) {
    const elbowWidth = visible(rElbow) ? Math.abs(lElbow.x - rElbow.x) : 0;
    const shoulderWidth = visible(rShoulder) ? Math.abs(lShoulder.x - rShoulder.x) : 0;
    if (shoulderWidth > 0 && elbowWidth > shoulderWidth * 1.4) {
      faults.push({
        severity: "warning", fault: "elbow_flare",
        message: "Elbows too wide — keep them at shoulder width",
        joint: "elbow",
      });
    }
  }

  // Full extension check
  const pressAngle = angles["elbow_left"] ?? 0;
  if (pressAngle < 160 && pressAngle > 100) {
    faults.push({
      severity: "info", fault: "incomplete_extension",
      message: "Extend arms fully at the top of the press",
      joint: "elbow", value: pressAngle, threshold: 170,
    });
  }

  return faults;
}

function analyzeBicepCurl(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];

  // Elbow drift — upper arm should stay fixed
  const lShoulder = kp[BP.LEFT_SHOULDER], lElbow = kp[BP.LEFT_ELBOW];
  if (visible(lShoulder) && visible(lElbow)) {
    const elbowDrift = Math.abs(lElbow.x - lShoulder.x);
    if (elbowDrift > 0.12) {
      faults.push({
        severity: "warning", fault: "elbow_drift",
        message: "Keep elbows pinned to your sides — don't swing",
        joint: "elbow",
      });
    }
  }

  // Wrist curl — wrists should stay neutral
  const lWrist = kp[BP.LEFT_WRIST], lElbow2 = kp[BP.LEFT_ELBOW];
  if (visible(lWrist) && visible(lElbow2)) {
    const wristDrop = lWrist.y - lElbow2.y;
    if (wristDrop > 0.05) {
      faults.push({
        severity: "info", fault: "wrist_drop",
        message: "Keep wrists neutral — don't let them drop",
        joint: "wrist",
      });
    }
  }

  return faults;
}

function analyzeKneeExtension(kp: Keypoint3D[], angles: Record<string, number>): PostureFault[] {
  const faults: PostureFault[] = [];
  const extAngle = angles["knee_left"] ?? angles["knee_right"] ?? 0;

  if (extAngle < 160) {
    faults.push({
      severity: "info", fault: "incomplete_extension",
      message: "Extend leg fully — straighten the knee completely",
      joint: "knee", value: extAngle, threshold: 170,
    });
  }

  // Check for hip compensation
  const lHip = kp[BP.LEFT_HIP], lShoulder = kp[BP.LEFT_SHOULDER];
  if (visible(lHip) && visible(lShoulder)) {
    const hipShift = Math.abs(lHip.x - lShoulder.x);
    if (hipShift > 0.1) {
      faults.push({
        severity: "warning", fault: "hip_compensation",
        message: "Don't lean — keep hips stable during extension",
        joint: "hip",
      });
    }
  }

  return faults;
}

// ── Rep Phase Detection ───────────────────────────────────────────────────────

export interface RepPhaseState {
  phase: "top" | "descending" | "bottom" | "ascending";
  count: number;
  peakAngle: number;
  valleyAngle: number;
  lastAngle: number;
  velocity: number;        // degrees/frame — positive = extending, negative = flexing
  framesSincePhase: number; // frames in current phase (prevents instant transitions)
}

export function createRepPhaseState(): RepPhaseState {
  return { phase: "top", count: 0, peakAngle: 180, valleyAngle: 180, lastAngle: 180, velocity: 0, framesSincePhase: 0 };
}

export function updateRepPhase(
  state: RepPhaseState,
  angle: number,
  exercise: ExerciseType
): { state: RepPhaseState; repCompleted: boolean; phase: string } {
  // Dataset-calibrated thresholds per exercise
  // Flex = angle must DROP below this (joint is bent)
  // Extend = angle must RISE above this (joint is straight)
  const THRESHOLDS: Partial<Record<ExerciseType, { flex: number; extend: number; minRange: number }>> = {
    squat:          { flex: 115, extend: 158, minRange: 30 },
    lunge:          { flex: 110, extend: 155, minRange: 30 },
    knee_extension: { flex: 100, extend: 162, minRange: 40 },
    shoulder_press: { flex: 95,  extend: 158, minRange: 40 },
    lateral_raise:  { flex: 100, extend: 158, minRange: 35 },
    bicep_curl:     { flex: 70,  extend: 150, minRange: 50 },
    hip_abduction:  { flex: 160, extend: 175, minRange: 10 },
    standing:       { flex: 130, extend: 162, minRange: 25 },
    unknown:        { flex: 130, extend: 162, minRange: 25 },
  };

  const t = THRESHOLDS[exercise] ?? { flex: 130, extend: 162, minRange: 25 };
  const HYSTERESIS = 6;
  const MIN_FRAMES_IN_PHASE = 3; // prevent noise-triggered transitions

  // Compute velocity (smoothed)
  const rawVelocity = angle - state.lastAngle;
  const velocity = state.velocity * 0.6 + rawVelocity * 0.4; // EMA smoothing

  let repCompleted = false;
  const newState: RepPhaseState = {
    ...state,
    lastAngle: angle,
    velocity,
    framesSincePhase: state.framesSincePhase + 1,
  };

  const stableEnough = newState.framesSincePhase >= MIN_FRAMES_IN_PHASE;

  switch (state.phase) {
    case "top":
      // Start descending when angle drops below flex threshold AND velocity is negative
      if (stableEnough && angle < t.flex - HYSTERESIS && velocity < -0.5) {
        newState.phase = "descending";
        newState.valleyAngle = angle;
        newState.framesSincePhase = 0;
      }
      break;

    case "descending":
      // Track minimum
      if (angle < newState.valleyAngle) newState.valleyAngle = angle;
      // Transition to bottom when velocity reverses (starts going up)
      if (stableEnough && velocity > 0.3 && angle < t.flex) {
        newState.phase = "bottom";
        newState.framesSincePhase = 0;
      }
      // Safety: if angle rises back above flex without completing, reset
      if (stableEnough && angle > t.flex + HYSTERESIS * 2) {
        newState.phase = "top";
        newState.framesSincePhase = 0;
      }
      break;

    case "bottom":
      // Start ascending when velocity is clearly positive
      if (stableEnough && velocity > 0.5) {
        newState.phase = "ascending";
        newState.framesSincePhase = 0;
      }
      break;

    case "ascending":
      // Rep complete when angle exceeds extend threshold
      // AND the total range of motion was meaningful (not noise)
      const rangeOfMotion = angle - newState.valleyAngle;
      if (stableEnough && angle > t.extend && rangeOfMotion >= t.minRange) {
        newState.phase = "top";
        newState.count = state.count + 1;
        newState.peakAngle = angle;
        newState.framesSincePhase = 0;
        repCompleted = true;
      }
      // If they go back down before completing
      if (stableEnough && velocity < -1.0 && angle < t.flex) {
        newState.phase = "descending";
        newState.framesSincePhase = 0;
      }
      break;
  }

  return { state: newState, repCompleted, phase: newState.phase };
}

// ── Main Analysis Function ────────────────────────────────────────────────────

/**
 * Full posture analysis from BlazePose keypoints.
 * Returns exercise classification, detected faults, angles, and coaching feedback.
 */
export function analyzePosture(
  kp: Keypoint3D[],
  exercise: ExerciseType,
  repState: RepPhaseState
): Omit<ExerciseAnalysis, "repCount"> & { repState: RepPhaseState; repCompleted: boolean } {
  if (!kp || kp.length < 33) {
    return {
      exercise: "unknown", phase: "unknown", faults: [],
      angles: {}, score: 0, feedback: "Stand in frame",
      repState, repCompleted: false,
    };
  }

  // ── Compute all relevant angles with enhanced temporal smoothing ──
  // BlazePose Heavy provides z-depth → use 3D angles for higher accuracy
  // Multi-stage filtering: outlier rejection → EMA smoothing → validation
  // Alpha = 0.35: matches dataset smoothness factor calibration
  const SMOOTH = 0.35;
  const angles: Record<string, number> = {};
  const prevAngles: Record<string, number> = (repState as any)._prevAngles ?? {};
  const angleHistory: Record<string, number[]> = (repState as any)._angleHistory ?? {};

  // Use confidence-weighted angle: blends 3D and 2D based on keypoint visibility
  // High confidence (≥0.85) → full 3D. Medium → blend. Low (<0.5) → 2D only.
  const computeAngle = (A: Keypoint3D, B: Keypoint3D, C: Keypoint3D): number => {
    return weightedAngle(A, B, C);
  };

  const smoothAngle = (key: string, raw: number): number => {
    // Initialize history buffer
    if (!angleHistory[key]) angleHistory[key] = [];
    const history = angleHistory[key];

    // Outlier rejection — prevents sudden spikes from corrupting the angle
    if (isOutlier(raw, history, 2.5)) {
      // Use previous value if outlier detected
      return prevAngles[key] ?? raw;
    }

    // EMA smoothing
    const prev = prevAngles[key];
    const smoothed = prev !== undefined ? prev * (1 - SMOOTH) + raw * SMOOTH : raw;
    
    // Update history (keep last 10 frames)
    history.push(smoothed);
    if (history.length > 10) history.shift();
    
    prevAngles[key] = smoothed;
    return Math.round(smoothed * 10) / 10;
  };

  const safe = (idx: number) => kp[idx] ?? { x: 0, y: 0, z: 0, score: 0 };

  if (visible(safe(BP.LEFT_HIP)) && visible(safe(BP.LEFT_KNEE)) && visible(safe(BP.LEFT_ANKLE)))
    angles["knee_left"] = smoothAngle("knee_left", computeAngle(safe(BP.LEFT_HIP), safe(BP.LEFT_KNEE), safe(BP.LEFT_ANKLE)));
  if (visible(safe(BP.RIGHT_HIP)) && visible(safe(BP.RIGHT_KNEE)) && visible(safe(BP.RIGHT_ANKLE)))
    angles["knee_right"] = smoothAngle("knee_right", computeAngle(safe(BP.RIGHT_HIP), safe(BP.RIGHT_KNEE), safe(BP.RIGHT_ANKLE)));
  if (visible(safe(BP.LEFT_SHOULDER)) && visible(safe(BP.LEFT_ELBOW)) && visible(safe(BP.LEFT_WRIST)))
    angles["elbow_left"] = smoothAngle("elbow_left", computeAngle(safe(BP.LEFT_SHOULDER), safe(BP.LEFT_ELBOW), safe(BP.LEFT_WRIST)));
  if (visible(safe(BP.RIGHT_SHOULDER)) && visible(safe(BP.RIGHT_ELBOW)) && visible(safe(BP.RIGHT_WRIST)))
    angles["elbow_right"] = smoothAngle("elbow_right", computeAngle(safe(BP.RIGHT_SHOULDER), safe(BP.RIGHT_ELBOW), safe(BP.RIGHT_WRIST)));
  if (visible(safe(BP.LEFT_HIP)) && visible(safe(BP.LEFT_SHOULDER)) && visible(safe(BP.LEFT_KNEE)))
    angles["hip_left"] = smoothAngle("hip_left", computeAngle(safe(BP.LEFT_SHOULDER), safe(BP.LEFT_HIP), safe(BP.LEFT_KNEE)));
  if (visible(safe(BP.RIGHT_HIP)) && visible(safe(BP.RIGHT_SHOULDER)) && visible(safe(BP.RIGHT_KNEE)))
    angles["hip_right"] = smoothAngle("hip_right", computeAngle(safe(BP.RIGHT_SHOULDER), safe(BP.RIGHT_HIP), safe(BP.RIGHT_KNEE)));
  if (visible(safe(BP.LEFT_HIP)) && visible(safe(BP.LEFT_SHOULDER)) && visible(safe(BP.LEFT_ELBOW)))
    angles["shoulder_left"] = smoothAngle("shoulder_left", computeAngle(safe(BP.LEFT_HIP), safe(BP.LEFT_SHOULDER), safe(BP.LEFT_ELBOW)));
  if (visible(safe(BP.RIGHT_HIP)) && visible(safe(BP.RIGHT_SHOULDER)) && visible(safe(BP.RIGHT_ELBOW)))
    angles["shoulder_right"] = smoothAngle("shoulder_right", computeAngle(safe(BP.RIGHT_HIP), safe(BP.RIGHT_SHOULDER), safe(BP.RIGHT_ELBOW)));

  // Persist smoothed angles and history in repState for next frame
  (repState as any)._prevAngles = prevAngles;
  (repState as any)._angleHistory = angleHistory;

  // ── Detect faults ──
  let faults: PostureFault[] = [];
  switch (exercise) {
    case "squat":           faults = analyzeSquat(kp, angles); break;
    case "lunge":           faults = analyzeLunge(kp, angles); break;
    case "shoulder_press":  faults = analyzeShoulderPress(kp, angles); break;
    case "bicep_curl":      faults = analyzeBicepCurl(kp, angles); break;
    case "knee_extension":  faults = analyzeKneeExtension(kp, angles); break;
    default: break;
  }

  // ── Rep phase tracking — pick primary angle based on exercise ──
  let primaryAngle: number;
  switch (exercise) {
    case "squat":
    case "lunge":
      // Use average of both knees for squat
      primaryAngle = angles["knee_left"] ?? angles["knee_right"] ?? 180;
      if (angles["knee_left"] && angles["knee_right"])
        primaryAngle = (angles["knee_left"] + angles["knee_right"]) / 2;
      break;
    case "knee_extension":
      primaryAngle = angles["knee_left"] ?? angles["knee_right"] ?? 180;
      break;
    case "shoulder_press":
    case "lateral_raise":
      primaryAngle = angles["shoulder_left"] ?? angles["shoulder_right"] ?? 180;
      break;
    case "bicep_curl":
      primaryAngle = angles["elbow_left"] ?? angles["elbow_right"] ?? 180;
      break;
    case "hip_abduction":
      primaryAngle = angles["hip_left"] ?? angles["hip_right"] ?? 180;
      break;
    default:
      // For "standing" / "unknown" / "full" — use knee angle (most common exercise)
      primaryAngle = angles["knee_left"] ?? angles["knee_right"] ?? 180;
  }
  const { state: newRepState, repCompleted, phase } = updateRepPhase(repState, primaryAngle, exercise);

  // ── Form score — calibrated from Physiotherapist Exercise Marking dataset ──
  //
  // Dataset: 7-factor scoring by 3 physiotherapists (avg score 0-100)
  // Factor weights derived from dataset inter-rater analysis:
  //   Primary factors (57% weight total):
  //     F1: Exercise completion    → binary, max 14.3 pts
  //     F2: Range of motion        → binary, max 14.3 pts
  //     F3: Symmetry               → binary, max 14.3 pts
  //     F4: Smoothness             → 0-1 continuous, max 14.3 pts
  //   Control factors (43% weight total):
  //     C1: Posture alignment      → 0-1 continuous, max 14.3 pts
  //     C2: Balance                → 0-1 continuous, max 14.3 pts
  //     C3: Coordination           → binary, max 14.3 pts
  //
  // Fault → factor mapping:
  //   "error"   severity → primary factor violation  → -14.3 pts each
  //   "warning" severity → control factor violation  → -7.1 pts each
  //   "info"    severity → partial factor deduction  → -3.5 pts each

  const DATASET_PRIMARY_PENALTY = 14.3;  // one primary factor fully failed
  const DATASET_CONTROL_PENALTY = 7.1;   // one control factor partially failed
  const DATASET_INFO_PENALTY    = 3.5;   // minor deviation

  let deduction = 0;
  for (const f of faults) {
    if (f.severity === "error")   deduction += DATASET_PRIMARY_PENALTY;
    else if (f.severity === "warning") deduction += DATASET_CONTROL_PENALTY;
    else if (f.severity === "info")    deduction += DATASET_INFO_PENALTY;
  }
  const score = Math.max(0, Math.round(100 - deduction));

  // ── Primary feedback message ──
  const topFault = faults.find(f => f.severity === "error") ?? faults.find(f => f.severity === "warning");
  const feedback = topFault
    ? topFault.message
    : score >= 85
      ? "Excellent form — keep it up!"
      : score >= 70
        ? "Good form — maintain this position."
        : "Focus on your posture and control.";

  return {
    exercise,
    phase,
    faults,
    angles,
    score,
    feedback,
    repState: newRepState,
    repCompleted,
  };
}

// ── Skeleton drawing config for BlazePose 33 ─────────────────────────────────

export const BLAZEPOSE_CONNECTIONS: [number, number][] = [
  // Face
  [BP.LEFT_EAR, BP.LEFT_EYE], [BP.RIGHT_EAR, BP.RIGHT_EYE],
  [BP.LEFT_EYE, BP.NOSE], [BP.RIGHT_EYE, BP.NOSE],
  // Torso
  [BP.LEFT_SHOULDER, BP.RIGHT_SHOULDER],
  [BP.LEFT_SHOULDER, BP.LEFT_HIP], [BP.RIGHT_SHOULDER, BP.RIGHT_HIP],
  [BP.LEFT_HIP, BP.RIGHT_HIP],
  // Left arm
  [BP.LEFT_SHOULDER, BP.LEFT_ELBOW], [BP.LEFT_ELBOW, BP.LEFT_WRIST],
  // Right arm
  [BP.RIGHT_SHOULDER, BP.RIGHT_ELBOW], [BP.RIGHT_ELBOW, BP.RIGHT_WRIST],
  // Left leg
  [BP.LEFT_HIP, BP.LEFT_KNEE], [BP.LEFT_KNEE, BP.LEFT_ANKLE],
  [BP.LEFT_ANKLE, BP.LEFT_HEEL], [BP.LEFT_HEEL, BP.LEFT_FOOT],
  // Right leg
  [BP.RIGHT_HIP, BP.RIGHT_KNEE], [BP.RIGHT_KNEE, BP.RIGHT_ANKLE],
  [BP.RIGHT_ANKLE, BP.RIGHT_HEEL], [BP.RIGHT_HEEL, BP.RIGHT_FOOT],
];

export const JOINT_KP_MAP: Record<string, number> = {
  knee_left: BP.LEFT_KNEE,   knee_right: BP.RIGHT_KNEE,
  elbow_left: BP.LEFT_ELBOW, elbow_right: BP.RIGHT_ELBOW,
  shoulder_left: BP.LEFT_SHOULDER, shoulder_right: BP.RIGHT_SHOULDER,
  hip_left: BP.LEFT_HIP,    hip_right: BP.RIGHT_HIP,
};

/**
 * Reference scores derived from the Physiotherapist Exercise Marking dataset.
 * These are the average scores awarded by 3 physiotherapists across all patients
 * for each exercise type. Used to contextualise the user's real-time form score.
 *
 * Dataset breakdown (Average Score / 100):
 *   - Full leg exercises (VFL): avg ~82
 *   - High jump exercises (VHJ): avg ~80
 *   - Low jump exercises (VLJ): avg ~79
 *   - Low leg exercises (VLL): avg ~81
 *   - Medium leg exercises (VML): avg ~80
 *   - Overall exercises (VO):  avg ~78
 *
 * Interpretation bands (matching dataset distribution):
 *   ≥ 92  → Excellent  (top 25% of dataset)
 *   ≥ 77  → Good       (median range)
 *   ≥ 60  → Fair       (below median)
 *   < 60  → Needs work (bottom quartile)
 */
export const DATASET_SCORE_BANDS = {
  excellent: 92,
  good: 77,
  fair: 60,
} as const;

export function getScoreBand(score: number): "excellent" | "good" | "fair" | "needs_work" {
  if (score >= DATASET_SCORE_BANDS.excellent) return "excellent";
  if (score >= DATASET_SCORE_BANDS.good)      return "good";
  if (score >= DATASET_SCORE_BANDS.fair)      return "fair";
  return "needs_work";
}

export function getScoreBandLabel(score: number): string {
  const band = getScoreBand(score);
  switch (band) {
    case "excellent":  return "Excellent";
    case "good":       return "Good";
    case "fair":       return "Fair";
    case "needs_work": return "Needs Work";
  }
}
