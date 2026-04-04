export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "patient" | "clinician";
  created_at: string;
}

export interface Session {
  id: number;
  user_id: number;
  session_type: string;
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  recovery_score: number | null;
  physical_score: number | null;
  cognitive_score: number | null;
}

export interface JointLog {
  id: number;
  session_id: number;
  joint: string;
  angle: number;
  target: number;
  deviation: number;
  rep_number: number;
  ts: string;
}

export interface RecoveryScore {
  id: number;
  user_id: number;
  date: string;
  physical_score: number | null;
  cognitive_score: number | null;
  composite_score: number | null;
}

export interface JointFeedback {
  status: "good" | "warning" | "out_of_range" | "low_visibility";
  message: string;
  rep_count: number;
  angle: number;
  target: number;
  deviation: number;
  joint: string;
}

// MediaPipe landmark indices for joints we track
export const LANDMARK_INDICES = {
  // Pose landmarks
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

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

export interface JointAngleResult {
  joint: JointName;
  angle: number;
  target: number;
  side: "left" | "right";
  visibility: number; // min visibility of the 3 landmarks
  status: "good" | "warning" | "out_of_range" | "invisible";
}

export interface RepState {
  joint: JointName;
  count: number;
  phase: "extending" | "flexing" | "idle";
  lastAngle: number;
  peakAngle: number;
}
