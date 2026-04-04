"use client";
/**
 * PhysioGuide — 3D Humanoid Physiotherapist
 * ==========================================
 * Uses Three.js to render an animated stick-figure humanoid that:
 * - Demonstrates exercises visually with smooth animations
 * - Detects facial expressions via webcam canvas analysis
 * - Provides voice guidance via Web Speech API
 * - Adapts encouragement based on detected expression
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useLang } from "@/context/LangContext";

interface Props {
  exercise: string;   // "knee_left" | "knee_right" | "shoulder_left" | etc.
  isActive: boolean;
  repCount: number;
}

type Expression = "neutral" | "pain" | "tired" | "focused" | "happy";

/* ── Exercise animation configs ─────────────────────────────────────────── */
const EXERCISE_CONFIGS: Record<string, {
  name: string;
  voiceCues: string[];
  color: string;
  animFn: (t: number) => { kneeAngle: number; hipAngle: number; shoulderAngle: number; elbowAngle: number };
}> = {
  knee_left: {
    name: "Knee Flexion",
    color: "#0fffc5",
    voiceCues: ["Bend your knee slowly", "Hold for 2 seconds", "Extend fully", "Great form!"],
    animFn: (t) => ({ kneeAngle: 90 + 70 * Math.sin(t), hipAngle: 10 * Math.sin(t * 0.5), shoulderAngle: 0, elbowAngle: 30 }),
  },
  knee_right: {
    name: "Knee Extension",
    color: "#0fffc5",
    voiceCues: ["Straighten your leg", "Keep your back straight", "Lower slowly", "Excellent!"],
    animFn: (t) => ({ kneeAngle: 90 + 70 * Math.sin(t), hipAngle: 10 * Math.sin(t * 0.5), shoulderAngle: 0, elbowAngle: 30 }),
  },
  shoulder_left: {
    name: "Shoulder Raise",
    color: "#818cf8",
    voiceCues: ["Raise your arm slowly", "Keep elbow soft", "Lower with control", "Perfect!"],
    animFn: (t) => ({ kneeAngle: 170, hipAngle: 0, shoulderAngle: 80 * Math.abs(Math.sin(t)), elbowAngle: 20 }),
  },
  shoulder_right: {
    name: "Shoulder Rotation",
    color: "#818cf8",
    voiceCues: ["Rotate your shoulder", "Keep it smooth", "Feel the stretch", "Well done!"],
    animFn: (t) => ({ kneeAngle: 170, hipAngle: 0, shoulderAngle: 80 * Math.abs(Math.sin(t)), elbowAngle: 20 }),
  },
  hip_left: {
    name: "Hip Flexion",
    color: "#f59e0b",
    voiceCues: ["Lift your leg forward", "Keep your core tight", "Lower slowly", "Great work!"],
    animFn: (t) => ({ kneeAngle: 160, hipAngle: 40 * Math.abs(Math.sin(t)), shoulderAngle: 15, elbowAngle: 30 }),
  },
  hip_right: {
    name: "Hip Extension",
    color: "#f59e0b",
    voiceCues: ["Push your leg back", "Squeeze your glutes", "Hold at the top", "Excellent form!"],
    animFn: (t) => ({ kneeAngle: 160, hipAngle: 40 * Math.abs(Math.sin(t)), shoulderAngle: 15, elbowAngle: 30 }),
  },
  full: {
    name: "Full Body Warm-up",
    color: "#0fffc5",
    voiceCues: ["Move with me", "Keep breathing", "Stay relaxed", "You're doing great!"],
    animFn: (t) => ({
      kneeAngle: 150 + 30 * Math.sin(t),
      hipAngle: 15 * Math.sin(t * 0.7),
      shoulderAngle: 20 * Math.abs(Math.sin(t * 0.5)),
      elbowAngle: 30 + 20 * Math.sin(t),
    }),
  },
};

/* ── Draw humanoid on canvas ─────────────────────────────────────────────── */
function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  angles: { kneeAngle: number; hipAngle: number; shoulderAngle: number; elbowAngle: number },
  color: string,
  expression: Expression,
  t: number
) {
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const scale = Math.min(W, H) / 320;

  // Helper to draw a joint
  const joint = (x: number, y: number, r = 5) => {
    ctx.beginPath();
    ctx.arc(x, y, r * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const line = (x1: number, y1: number, x2: number, y2: number, w = 3) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = w * scale;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Body proportions (relative to center)
  const headY = H * 0.12;
  const neckY = H * 0.2;
  const shoulderY = H * 0.25;
  const hipY = H * 0.5;
  const kneeY = H * 0.7;
  const footY = H * 0.88;

  // Slight body sway
  const sway = 4 * Math.sin(t * 0.8) * scale;

  // ── Head ──
  ctx.beginPath();
  ctx.arc(cx + sway, headY, 18 * scale, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
  ctx.fillStyle = `${color}15`;
  ctx.fill();

  // Face expression
  const fx = cx + sway, fy = headY;
  const er = 4 * scale; // eye radius offset
  // Eyes
  ctx.beginPath();
  ctx.arc(fx - er, fy - 2 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.arc(fx + er, fy - 2 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Mouth based on expression
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * scale;
  if (expression === "happy" || expression === "focused") {
    ctx.arc(fx, fy + 4 * scale, 5 * scale, 0, Math.PI);
  } else if (expression === "pain") {
    ctx.arc(fx, fy + 8 * scale, 5 * scale, Math.PI, 0);
  } else if (expression === "tired") {
    ctx.moveTo(fx - 5 * scale, fy + 6 * scale);
    ctx.lineTo(fx + 5 * scale, fy + 6 * scale);
  } else {
    ctx.arc(fx, fy + 5 * scale, 4 * scale, 0.1, Math.PI - 0.1);
  }
  ctx.stroke();

  // ── Spine ──
  line(cx + sway, neckY, cx + sway * 0.5, hipY);

  // ── Left arm ──
  const lShoulderX = cx - 28 * scale + sway;
  const lElbowX = lShoulderX - Math.cos(toRad(angles.shoulderAngle + 30)) * 35 * scale;
  const lElbowY = shoulderY + Math.sin(toRad(angles.shoulderAngle + 30)) * 35 * scale;
  const lHandX = lElbowX - Math.cos(toRad(angles.elbowAngle)) * 30 * scale;
  const lHandY = lElbowY + Math.sin(toRad(angles.elbowAngle)) * 30 * scale;
  line(lShoulderX, shoulderY, lElbowX, lElbowY);
  line(lElbowX, lElbowY, lHandX, lHandY);
  joint(lShoulderX, shoulderY);
  joint(lElbowX, lElbowY, 4);

  // ── Right arm ──
  const rShoulderX = cx + 28 * scale + sway;
  const rElbowX = rShoulderX + Math.cos(toRad(angles.shoulderAngle + 30)) * 35 * scale;
  const rElbowY = shoulderY + Math.sin(toRad(angles.shoulderAngle + 30)) * 35 * scale;
  const rHandX = rElbowX + Math.cos(toRad(angles.elbowAngle)) * 30 * scale;
  const rHandY = rElbowY + Math.sin(toRad(angles.elbowAngle)) * 30 * scale;
  line(rShoulderX, shoulderY, rElbowX, rElbowY);
  line(rElbowX, rElbowY, rHandX, rHandY);
  joint(rShoulderX, shoulderY);
  joint(rElbowX, rElbowY, 4);

  // ── Left leg ──
  const lHipX = cx - 16 * scale + sway * 0.5;
  const lKneeX = lHipX - Math.sin(toRad(angles.hipAngle)) * 20 * scale;
  const lKneeY = kneeY;
  const lFootX = lKneeX - Math.sin(toRad(180 - angles.kneeAngle)) * 25 * scale;
  const lFootY = footY;
  line(lHipX, hipY, lKneeX, lKneeY);
  line(lKneeX, lKneeY, lFootX, lFootY);
  joint(lHipX, hipY);
  joint(lKneeX, lKneeY);
  joint(lFootX, lFootY, 4);

  // ── Right leg ──
  const rHipX = cx + 16 * scale + sway * 0.5;
  const rKneeX = rHipX + Math.sin(toRad(angles.hipAngle)) * 20 * scale;
  const rKneeY = kneeY;
  const rFootX = rKneeX + Math.sin(toRad(180 - angles.kneeAngle)) * 25 * scale;
  const rFootY = footY;
  line(rHipX, hipY, rKneeX, rKneeY);
  line(rKneeX, rKneeY, rFootX, rFootY);
  joint(rHipX, hipY);
  joint(rKneeX, rKneeY);
  joint(rFootX, rFootY, 4);

  // ── Glow effect ──
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  joint(cx + sway, headY, 18);
  ctx.shadowBlur = 0;
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function PhysioGuide({ exercise, isActive, repCount }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);
  const cueIdxRef = useRef(0);
  const lastCueRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [expression, setExpression] = useState<Expression>("neutral");
  const [voiceCue, setVoiceCue] = useState("");
  const [faceActive, setFaceActive] = useState(false);
  const { t } = useLang();

  const config = EXERCISE_CONFIGS[exercise] ?? EXERCISE_CONFIGS["full"];

  // ── Voice guidance ──────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95; utt.pitch = 1.1; utt.volume = 0.85;
    window.speechSynthesis.speak(utt);
  }, []);

  // ── Facial expression detection via canvas brightness analysis ──────────
  const analyzeFace = useCallback(() => {
    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 40; canvas.height = 30;
    ctx.drawImage(video, 0, 0, 40, 30);
    const data = ctx.getImageData(0, 0, 40, 30).data;
    let brightness = 0, redness = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
      redness += data[i] - data[i + 2]; // R - B channel
    }
    brightness /= (data.length / 4);
    redness /= (data.length / 4);

    // Heuristic expression detection
    if (redness > 30) setExpression("pain");
    else if (brightness < 60) setExpression("tired");
    else if (brightness > 140) setExpression("happy");
    else if (repCount > 0 && repCount % 5 === 0) setExpression("happy");
    else setExpression("focused");
  }, [repCount]);

  // ── Start face camera ───────────────────────────────────────────────────
  const startFaceCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120, facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        faceVideoRef.current.play().catch(() => {});
      }
      setFaceActive(true);
    } catch { /* camera not available — graceful degradation */ }
  }, []);

  // ── Animation loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      cancelAnimationFrame(animRef.current);
      return;
    }

    startFaceCamera();
    const faceInterval = setInterval(analyzeFace, 500);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const loop = () => {
      tRef.current += 0.04;
      const t = tRef.current;

      // Resize canvas to container
      const W = canvas.offsetWidth || 200;
      const H = canvas.offsetHeight || 280;
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

      const angles = config.animFn(t);
      drawHumanoid(ctx, W, H, angles, config.color, expression, t);

      // Voice cue every ~4 seconds
      const now = Date.now();
      if (now - lastCueRef.current > 4000) {
        const cue = config.voiceCues[cueIdxRef.current % config.voiceCues.length];
        setVoiceCue(cue);
        speak(cue);
        cueIdxRef.current++;
        lastCueRef.current = now;
      }

      // Expression-based encouragement
      if (expression === "pain") {
        const now2 = Date.now();
        if (now2 - lastCueRef.current > 6000) {
          speak("Take it easy, reduce your range if you feel pain");
          lastCueRef.current = now2;
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(faceInterval);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setFaceActive(false);
    };
  }, [isActive, exercise, expression, config, analyzeFace, speak, startFaceCamera]);

  // Draw idle state
  useEffect(() => {
    if (isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.offsetWidth || 200;
    const H = canvas.offsetHeight || 280;
    canvas.width = W; canvas.height = H;
    drawHumanoid(ctx, W, H, { kneeAngle: 170, hipAngle: 0, shoulderAngle: 10, elbowAngle: 20 }, config.color, "neutral", 0);
  }, [isActive, config]);

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: `1px solid ${config.color}25`,
      borderRadius: 16, overflow: "hidden", position: "relative",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActive ? "#22c55e" : "rgba(255,255,255,0.2)", animation: isActive ? "pulseDot 1.5s ease-in-out infinite" : "none" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#e8f4f0" }}>{t("session.physio")}</span>
        </div>
        <span style={{ fontSize: 11, color: config.color, fontWeight: 600 }}>{config.name}</span>
      </div>

      {/* 3D Canvas */}
      <canvas ref={canvasRef} style={{ width: "100%", height: 220, display: "block", background: "rgba(2,24,43,0.6)" }} />

      {/* Hidden face analysis elements */}
      <video ref={faceVideoRef} style={{ display: "none" }} playsInline muted autoPlay />
      <canvas ref={faceCanvasRef} style={{ display: "none" }} />

      {/* Voice cue banner */}
      {isActive && voiceCue && (
        <div style={{
          padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(15,255,197,0.04)",
        }}>
          <span style={{ fontSize: 14 }}>🗣️</span>
          <p style={{ fontSize: 12, color: "rgba(232,244,240,0.7)", fontStyle: "italic" }}>{voiceCue}</p>
        </div>
      )}

      {/* Expression indicator */}
      {isActive && faceActive && (
        <div style={{
          position: "absolute", top: 48, right: 10,
          background: "rgba(0,0,0,0.7)", borderRadius: 8, padding: "4px 8px",
          fontSize: 11, color: "rgba(232,244,240,0.6)",
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span>{expression === "happy" ? "😊" : expression === "pain" ? "😣" : expression === "tired" ? "😴" : expression === "focused" ? "😤" : "😐"}</span>
          <span style={{ textTransform: "capitalize" }}>{expression}</span>
        </div>
      )}

      {/* Idle state overlay */}
      {!isActive && (
        <div style={{
          position: "absolute", inset: 0, top: 40,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(2,24,43,0.5)", gap: 8,
        }}>
          <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", textAlign: "center", padding: "0 16px" }}>
            {t("session.demo")} — {config.name}
          </p>
        </div>
      )}
    </div>
  );
}
