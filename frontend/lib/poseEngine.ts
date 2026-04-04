/**
 * NeuroRestore AI — Pose Engine
 * ==============================
 * Wraps MediaPipe Pose for accurate joint angle calculation.
 *
 * Angle formula: arccos( (BA · BC) / (|BA| × |BC|) )
 * where B = joint vertex, A and C = adjacent landmarks.
 *
 * Visibility gate: all 3 landmarks must exceed 0.65 visibility.
 * Rep detection: angle crosses threshold and returns (flex → extend cycle).
 */

import type { JointAngleResult, JointName, RepState } from "@/types";
import { LANDMARK_INDICES } from "@/types";

// Default target ROMs per joint (degrees) — overridden by user's exercise config
export const DEFAULT_TARGET_ROM: Record<JointName, number> = {
  knee_left: 120,
  knee_right: 120,
  elbow_left: 145,
  elbow_right: 145,
  shoulder_left: 150,
  shoulder_right: 150,
  hip_left: 90,
  hip_right: 90,
};

const VISIBILITY_THRESHOLD = 0.65;
const REP_FLEX_THRESHOLD = 30;   // angle must drop below this to count as "flexed"
const REP_EXTEND_THRESHOLD = 160; // angle must rise above this to count as "extended" (for knee)

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * Compute the interior angle at point B formed by A-B-C.
 * Returns degrees (0–180).
 */
export function computeAngle(A: Landmark, B: Landmark, C: Landmark): number {
  const BAx = A.x - B.x;
  const BAy = A.y - B.y;
  const BCx = C.x - B.x;
  const BCy = C.y - B.y;

  const dot = BAx * BCx + BAy * BCy;
  const magBA = Math.sqrt(BAx * BAx + BAy * BAy);
  const magBC = Math.sqrt(BCx * BCx + BCy * BCy);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

function minVisibility(a: Landmark, b: Landmark, c: Landmark): number {
  return Math.min(a.visibility ?? 0, b.visibility ?? 0, c.visibility ?? 0);
}

function getStatus(angle: number, target: number): JointAngleResult["status"] {
  const diff = target - angle;
  if (diff <= 5) return "good";
  if (diff <= 15) return "warning";
  return "out_of_range";
}

/**
 * Extract all tracked joint angles from a MediaPipe pose result.
 * Returns only joints with sufficient landmark visibility.
 */
export function extractJointAngles(
  landmarks: Landmark[],
  targetRoms: Partial<Record<JointName, number>> = {}
): JointAngleResult[] {
  const results: JointAngleResult[] = [];
  const L = LANDMARK_INDICES;

  const joints: Array<{
    name: JointName;
    a: number;
    b: number;
    c: number;
    side: "left" | "right";
  }> = [
    // Knee angles: hip → knee → ankle
    { name: "knee_left",     a: L.LEFT_HIP,      b: L.LEFT_KNEE,     c: L.LEFT_ANKLE,    side: "left" },
    { name: "knee_right",    a: L.RIGHT_HIP,     b: L.RIGHT_KNEE,    c: L.RIGHT_ANKLE,   side: "right" },
    // Elbow angles: shoulder → elbow → wrist
    { name: "elbow_left",    a: L.LEFT_SHOULDER, b: L.LEFT_ELBOW,    c: L.LEFT_WRIST,    side: "left" },
    { name: "elbow_right",   a: L.RIGHT_SHOULDER,b: L.RIGHT_ELBOW,   c: L.RIGHT_WRIST,   side: "right" },
    // Shoulder flexion: hip → shoulder → elbow
    { name: "shoulder_left", a: L.LEFT_HIP,      b: L.LEFT_SHOULDER, c: L.LEFT_ELBOW,    side: "left" },
    { name: "shoulder_right",a: L.RIGHT_HIP,     b: L.RIGHT_SHOULDER,c: L.RIGHT_ELBOW,   side: "right" },
    // Hip flexion: opposite_hip → hip → knee
    { name: "hip_left",      a: L.RIGHT_HIP,     b: L.LEFT_HIP,      c: L.LEFT_KNEE,     side: "left" },
    { name: "hip_right",     a: L.LEFT_HIP,      b: L.RIGHT_HIP,     c: L.RIGHT_KNEE,    side: "right" },
  ];

  for (const joint of joints) {
    const lmA = landmarks[joint.a];
    const lmB = landmarks[joint.b];
    const lmC = landmarks[joint.c];

    if (!lmA || !lmB || !lmC) continue;

    const visibility = minVisibility(lmA, lmB, lmC);

    if (visibility < VISIBILITY_THRESHOLD) {
      results.push({
        joint: joint.name,
        angle: 0,
        target: targetRoms[joint.name] ?? DEFAULT_TARGET_ROM[joint.name],
        side: joint.side,
        visibility,
        status: "invisible",
      });
      continue;
    }

    const angle = computeAngle(lmA, lmB, lmC);
    const target = targetRoms[joint.name] ?? DEFAULT_TARGET_ROM[joint.name];

    results.push({
      joint: joint.name,
      angle: Math.round(angle * 10) / 10,
      target,
      side: joint.side,
      visibility,
      status: getStatus(angle, target),
    });
  }

  return results;
}

/**
 * Rep counter using angle threshold crossing.
 * A rep is counted when the joint goes from flexed → extended.
 *
 * For knee: flexed = angle < 90°, extended = angle > 150°
 * Configurable thresholds per joint.
 */
const FLEX_THRESHOLDS: Partial<Record<JointName, number>> = {
  knee_left: 90,
  knee_right: 90,
  elbow_left: 70,
  elbow_right: 70,
  shoulder_left: 60,
  shoulder_right: 60,
  hip_left: 60,
  hip_right: 60,
};

const EXTEND_THRESHOLDS: Partial<Record<JointName, number>> = {
  knee_left: 150,
  knee_right: 150,
  elbow_left: 140,
  elbow_right: 140,
  shoulder_left: 130,
  shoulder_right: 130,
  hip_left: 80,
  hip_right: 80,
};

export function updateRepState(state: RepState, currentAngle: number): { state: RepState; repCompleted: boolean } {
  const flexThreshold = FLEX_THRESHOLDS[state.joint] ?? 90;
  const extendThreshold = EXTEND_THRESHOLDS[state.joint] ?? 150;

  let repCompleted = false;
  const newState = { ...state, lastAngle: currentAngle };

  if (state.phase === "idle" || state.phase === "extending") {
    if (currentAngle < flexThreshold) {
      newState.phase = "flexing";
      newState.peakAngle = currentAngle;
    }
  } else if (state.phase === "flexing") {
    newState.peakAngle = Math.min(state.peakAngle, currentAngle);
    if (currentAngle > extendThreshold) {
      newState.phase = "extending";
      newState.count = state.count + 1;
      repCompleted = true;
    }
  }

  return { state: newState, repCompleted };
}

export function createRepState(joint: JointName): RepState {
  return { joint, count: 0, phase: "idle", lastAngle: 0, peakAngle: 180 };
}

/**
 * Bilateral symmetry score: compares left vs right limb angle.
 * Returns 0-100 (100 = perfect symmetry).
 */
export function computeSymmetryScore(leftAngle: number, rightAngle: number): number {
  if (leftAngle === 0 || rightAngle === 0) return 0;
  const diff = Math.abs(leftAngle - rightAngle);
  return Math.max(0, Math.round((1 - diff / 180) * 100));
}

/**
 * Get colour for canvas overlay based on joint status.
 */
export function getJointColor(status: JointAngleResult["status"]): string {
  switch (status) {
    case "good":         return "#22c55e"; // green-500
    case "warning":      return "#eab308"; // yellow-500
    case "out_of_range": return "#ef4444"; // red-500
    case "invisible":    return "#6b7280"; // gray-500
    default:             return "#6b7280";
  }
}
