export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

// Joint names for pose tracking
export type JointName =
  | "knee_left"
  | "knee_right"
  | "elbow_left"
  | "elbow_right"
  | "shoulder_left"
  | "shoulder_right"
  | "hip_left"
  | "hip_right"
  | "wrist_left"
  | "wrist_right"
  | "ankle_left"
  | "ankle_right"
  | "finger_left"
  | "finger_right";

// Joint angle result from pose detection
export interface JointAngleResult {
  joint: JointName;
  angle: number;
  target: number;
  side: "left" | "right";
  visibility: number;
  status: "good" | "warning" | "out_of_range" | "invisible";
}

// Rep state for tracking exercise repetitions
export interface RepState {
  joint: JointName;
  count: number;
  phase: "extending" | "flexing" | "idle";
  lastAngle: number;
  peakAngle: number;
}

// Landmark indices for MediaPipe Pose (33 keypoints)
export const LANDMARK_INDICES = {
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
} as const;
