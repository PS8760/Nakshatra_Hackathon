/**
 * wholeBodyEngine.ts
 * ==================
 * Client-side wholebody pose rendering and angle extraction.
 * Works with DWPose 133-keypoint output from POST /pose/analyze?engine=wholebody
 *
 * Keypoint layout (133 total):
 *   [0-16]   Body (COCO-17)
 *   [17-22]  Feet
 *   [23-90]  Face (68 landmarks)
 *   [91-111] Left hand (21 landmarks)
 *   [112-132] Right hand (21 landmarks)
 */

export interface WBKeypoint {
  name: string;
  x: number;     // normalised [0,1]
  y: number;
  score: number;
}

export interface WholeBodyPose {
  body:       WBKeypoint[];   // 17
  feet:       WBKeypoint[];   // 6
  face:       WBKeypoint[];   // 68
  left_hand:  WBKeypoint[];   // 21
  right_hand: WBKeypoint[];   // 21
  angles:     Record<string, number>;
  keypoints_detected: number;
}

// ── Index constants ───────────────────────────────────────────────────────────

export const WB = {
  // Body
  NOSE:0, L_EYE:1, R_EYE:2, L_EAR:3, R_EAR:4,
  L_SHOULDER:5, R_SHOULDER:6, L_ELBOW:7, R_ELBOW:8,
  L_WRIST:9, R_WRIST:10, L_HIP:11, R_HIP:12,
  L_KNEE:13, R_KNEE:14, L_ANKLE:15, R_ANKLE:16,
  // Feet
  L_BIG_TOE:17, L_SMALL_TOE:18, L_HEEL:19,
  R_BIG_TOE:20, R_SMALL_TOE:21, R_HEEL:22,
  // Left hand (offset 91)
  LH_WRIST:91,
  LH_THUMB_CMC:92, LH_THUMB_MCP:93, LH_THUMB_IP:94,  LH_THUMB_TIP:95,
  LH_INDEX_MCP:96, LH_INDEX_PIP:97, LH_INDEX_DIP:98,  LH_INDEX_TIP:99,
  LH_MID_MCP:100,  LH_MID_PIP:101,  LH_MID_DIP:102,   LH_MID_TIP:103,
  LH_RING_MCP:104, LH_RING_PIP:105, LH_RING_DIP:106,  LH_RING_TIP:107,
  LH_PINK_MCP:108, LH_PINK_PIP:109, LH_PINK_DIP:110,  LH_PINK_TIP:111,
  // Right hand (offset 112)
  RH_WRIST:112,
  RH_THUMB_CMC:113, RH_THUMB_MCP:114, RH_THUMB_IP:115, RH_THUMB_TIP:116,
  RH_INDEX_MCP:117, RH_INDEX_PIP:118, RH_INDEX_DIP:119, RH_INDEX_TIP:120,
  RH_MID_MCP:121,   RH_MID_PIP:122,   RH_MID_DIP:123,   RH_MID_TIP:124,
  RH_RING_MCP:125,  RH_RING_PIP:126,  RH_RING_DIP:127,  RH_RING_TIP:128,
  RH_PINK_MCP:129,  RH_PINK_PIP:130,  RH_PINK_DIP:131,  RH_PINK_TIP:132,
} as const;

// ── Skeleton connections ──────────────────────────────────────────────────────

export const BODY_CONNECTIONS: [number, number][] = [
  [WB.L_SHOULDER, WB.R_SHOULDER],
  [WB.L_SHOULDER, WB.L_ELBOW], [WB.L_ELBOW, WB.L_WRIST],
  [WB.R_SHOULDER, WB.R_ELBOW], [WB.R_ELBOW, WB.R_WRIST],
  [WB.L_SHOULDER, WB.L_HIP],   [WB.R_SHOULDER, WB.R_HIP],
  [WB.L_HIP, WB.R_HIP],
  [WB.L_HIP, WB.L_KNEE],       [WB.L_KNEE, WB.L_ANKLE],
  [WB.R_HIP, WB.R_KNEE],       [WB.R_KNEE, WB.R_ANKLE],
  [WB.L_ANKLE, WB.L_BIG_TOE],  [WB.R_ANKLE, WB.R_BIG_TOE],
];

// Hand connections — relative to hand array start (0=wrist)
const HAND_CONN_REL: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],       // thumb
  [0,5],[5,6],[6,7],[7,8],       // index
  [0,9],[9,10],[10,11],[11,12],  // middle
  [0,13],[13,14],[14,15],[15,16],// ring
  [0,17],[17,18],[18,19],[19,20],// pinky
  [5,9],[9,13],[13,17],          // palm
];

// ── Colour scheme ─────────────────────────────────────────────────────────────

const COLORS = {
  body:       "#0fffc5",
  leftHand:   "#60a5fa",
  rightHand:  "#f472b6",
  face:       "#fbbf24",
  feet:       "#a78bfa",
  joint:      "#ffffff",
  lowConf:    "rgba(255,255,255,0.2)",
};

// ── Angle calculation (2D dot-product) ───────────────────────────────────────

function computeAngle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number {
  const BAx = ax - bx, BAy = ay - by;
  const BCx = cx - bx, BCy = cy - by;
  const dot = BAx * BCx + BAy * BCy;
  const mag = Math.sqrt(BAx**2 + BAy**2) * Math.sqrt(BCx**2 + BCy**2);
  if (mag === 0) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

// ── Drawing ───────────────────────────────────────────────────────────────────

function drawConnections(
  ctx: CanvasRenderingContext2D,
  kps: WBKeypoint[],
  connections: [number, number][],
  color: string,
  offset = 0,
  w: number, h: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  for (const [ai, bi] of connections) {
    const a = kps[ai - offset], b = kps[bi - offset];
    if (!a || !b || a.score < 0.15 || b.score < 0.15) continue;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  kps: WBKeypoint[],
  color: string,
  radius: number,
  w: number, h: number,
  minScore = 0.15,
) {
  for (const k of kps) {
    if (k.score < minScore) continue;
    ctx.beginPath();
    ctx.arc(k.x * w, k.y * h, radius, 0, Math.PI * 2);
    ctx.fillStyle = k.score > 0.5 ? color : COLORS.lowConf;
    ctx.fill();
  }
}

function drawAngleLabel(
  ctx: CanvasRenderingContext2D,
  kp: WBKeypoint,
  label: string,
  color: string,
  w: number, h: number,
) {
  if (kp.score < 0.15) return;
  const x = kp.x * w, y = kp.y * h - 14;
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  const mw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.roundRect(x - mw/2 - 4, y - 11, mw + 8, 14, 3);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
}

/**
 * Draw the full 133-keypoint wholebody skeleton on a canvas.
 * Call this inside your requestAnimationFrame loop.
 */
export function drawWholeBody(
  ctx: CanvasRenderingContext2D,
  pose: WholeBodyPose,
  w: number,
  h: number,
  options: {
    showFace?: boolean;
    showAngles?: boolean;
    showFingerLabels?: boolean;
  } = {},
) {
  const { showFace = false, showAngles = true, showFingerLabels = false } = options;

  // ── Body skeleton ──────────────────────────────────────────────────────────
  ctx.save();
  for (const [ai, bi] of BODY_CONNECTIONS) {
    const a = pose.body[ai], b = pose.body[bi];
    if (!a || !b || a.score < 0.15 || b.score < 0.15) continue;
    ctx.strokeStyle = COLORS.body;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }
  drawDots(ctx, pose.body, COLORS.body, 5, w, h);
  drawDots(ctx, pose.feet, COLORS.feet, 4, w, h);

  // ── Hands ──────────────────────────────────────────────────────────────────
  for (const [hand, color] of [[pose.left_hand, COLORS.leftHand], [pose.right_hand, COLORS.rightHand]] as const) {
    // Draw connections (relative indices within the 21-kp hand array)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (const [ai, bi] of HAND_CONN_REL) {
      const a = hand[ai], b = hand[bi];
      if (!a || !b || a.score < 0.15 || b.score < 0.15) continue;
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }
    // Dots — fingertips larger
    for (let i = 0; i < hand.length; i++) {
      const k = hand[i];
      if (k.score < 0.15) continue;
      const isTip = [4,8,12,16,20].includes(i);
      ctx.beginPath();
      ctx.arc(k.x * w, k.y * h, isTip ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? color : `${color}99`;
      ctx.fill();
    }
  }

  // ── Face (optional — dots only, no connections to avoid clutter) ───────────
  if (showFace) {
    drawDots(ctx, pose.face, COLORS.face, 1.5, w, h, 0.3);
  }

  // ── Angle labels ───────────────────────────────────────────────────────────
  if (showAngles) {
    const bodyAngleJoints: Record<string, number> = {
      knee_left: WB.L_KNEE, knee_right: WB.R_KNEE,
      elbow_left: WB.L_ELBOW, elbow_right: WB.R_ELBOW,
      shoulder_left: WB.L_SHOULDER, shoulder_right: WB.R_SHOULDER,
    };
    for (const [name, bodyIdx] of Object.entries(bodyAngleJoints)) {
      const angle = pose.angles[name];
      if (angle === undefined) continue;
      const kp = pose.body[bodyIdx];
      if (!kp || kp.score < 0.15) continue;
      drawAngleLabel(ctx, kp, `${angle.toFixed(0)}°`, COLORS.body, w, h);
    }

    // Finger joint angles on hands
    if (showFingerLabels) {
      const fingerJoints: Record<string, [WBKeypoint[], number]> = {
        lh_index_pip: [pose.left_hand, 6],
        lh_middle_pip: [pose.left_hand, 10],
        rh_index_pip: [pose.right_hand, 6],
        rh_middle_pip: [pose.right_hand, 10],
      };
      for (const [name, [hand, idx]] of Object.entries(fingerJoints)) {
        const angle = pose.angles[name];
        if (angle === undefined) continue;
        const kp = hand[idx];
        if (!kp || kp.score < 0.15) continue;
        drawAngleLabel(ctx, kp, `${angle.toFixed(0)}°`,
          hand === pose.left_hand ? COLORS.leftHand : COLORS.rightHand, w, h);
      }
    }
  }

  ctx.restore();
}

// ── Fetch wholebody pose from backend ─────────────────────────────────────────

export async function fetchWholeBodyPose(
  video: HTMLVideoElement,
  apiBase = "/api",
): Promise<WholeBodyPose | null> {
  if (video.readyState < 2 || video.videoWidth === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d")!.drawImage(video, 0, 0);

  const blob = await new Promise<Blob | null>(res =>
    canvas.toBlob(res, "image/jpeg", 0.85)
  );
  if (!blob) return null;

  const form = new FormData();
  form.append("frame", blob, "frame.jpg");
  form.append("joint", "all");
  form.append("target", "90");
  form.append("engine", "wholebody");

  try {
    const res = await fetch(`${apiBase}/pose/analyze`, { method: "POST", body: form });
    if (!res.ok) return null;
    return await res.json() as WholeBodyPose;
  } catch {
    return null;
  }
}

// ── Utility: get all finger angles from a WholeBodyPose ──────────────────────

export function getFingerAngles(pose: WholeBodyPose): Record<string, number> {
  const fingerKeys = Object.keys(pose.angles).filter(
    k => k.startsWith("lh_") || k.startsWith("rh_")
  );
  return Object.fromEntries(fingerKeys.map(k => [k, pose.angles[k]]));
}

export function getBodyAngles(pose: WholeBodyPose): Record<string, number> {
  const bodyKeys = ["knee_left","knee_right","elbow_left","elbow_right",
                    "shoulder_left","shoulder_right","hip_left","hip_right",
                    "ankle_left","ankle_right"];
  return Object.fromEntries(
    bodyKeys.filter(k => pose.angles[k] !== undefined).map(k => [k, pose.angles[k]])
  );
}
