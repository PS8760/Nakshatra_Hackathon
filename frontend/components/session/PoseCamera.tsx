"use client";
/**
 * PoseCamera — BlazePose Heavy + AI Posture Analysis
 *
 * Uses @tensorflow-models/pose-detection with BlazePose GHUM Heavy:
 * - 33 keypoints with 3D coordinates (x, y, z + visibility)
 * - Detects wrong posture, form faults, asymmetry in real time
 * - Exercise classifier identifies squat/lunge/shoulder press/curl etc.
 * - Per-exercise fault detection with specific coaching cues
 * - Sends fault data to Groq AI for natural language feedback
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  analyzePosture, classifyExercise,
  createRepPhaseState, BLAZEPOSE_CONNECTIONS, JOINT_KP_MAP,
  getScoreBand, getScoreBandLabel,
  type ExerciseType, type RepPhaseState, type PostureFault, type Keypoint3D,
} from "@/lib/postureEngine";
import type { JointName } from "@/types";
import { diagnoseVideoStream, type FrameDiagnostics } from "@/lib/frameDebug";

interface Props {
  sessionId: number;
  token: string;
  preset?: string;
  activeJoints?: JointName[];
  onRepComplete?: (joint: JointName, angle: number, repCount: number) => void;
  onFeedback?: (msg: string, status: string) => void;
  onFormScore?: (score: number) => void;
  debugMode?: boolean;   // shows bounding box, raw landmark dots, frame diagnostics
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// Fault severity → colour
const FAULT_COLOR: Record<string, string> = {
  error: "#ef4444",
  warning: "#eab308",
  info: "#60a5fa",
};

// Joint status colour
function jointColor(fault: PostureFault | undefined, hasAngle: boolean): string {
  if (!hasAngle) return "rgba(255,255,255,0.5)";
  if (!fault) return "#22c55e";
  return FAULT_COLOR[fault.severity] ?? "#22c55e";
}

export default function PoseCamera({
  sessionId, token, preset = "full", activeJoints,
  onRepComplete, onFeedback, onFormScore, debugMode = false,
}: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef      = useRef<number>(0);
  const activeRef   = useRef(true);
  const repStateRef = useRef<RepPhaseState>(createRepPhaseState());
  const exerciseRef = useRef<ExerciseType>("unknown");
  const fpsRef      = useRef({ frames: 0, lastTime: Date.now() });
  const lastFaultRef = useRef<string>("");
  const lastFaultTime = useRef<number>(0);

  const [isLoading,   setIsLoading]   = useState(true);
  const [loadingMsg,  setLoadingMsg]  = useState("Initialising…");
  const [loadingPct,  setLoadingPct]  = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps,         setFps]         = useState(0);
  const [formScore,   setFormScore]   = useState<number | null>(null);
  const [faults,      setFaults]      = useState<PostureFault[]>([]);
  const [exercise,    setExercise]    = useState<string>("Detecting…");
  const [phase,       setPhase]       = useState<string>("");
  const [repCount,    setRepCount]    = useState(0);
  const [angles,      setAngles]      = useState<Record<string, number>>({});
  const [debugInfo,   setDebugInfo]   = useState<FrameDiagnostics | null>(null);
  const [debugRunning, setDebugRunning] = useState(false);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const wsToken = token || (typeof window !== "undefined" ? localStorage.getItem("nr_token") : null);
    if (!wsToken) return;
    const ws = new WebSocket(`${WS_URL}/ws/session/${sessionId}?token=${wsToken}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.event === "feedback") onFeedback?.(d.message, d.status);
      } catch {}
    };
    ws.onerror = () => {};
    return () => { try { ws.close(); } catch {} };
  }, [sessionId, token, onFeedback]);

  const sendRepEvent = useCallback((angle: number, target: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: "rep_complete",
        joint: exerciseRef.current,
        angle, target,
        timestamp: Math.floor(Date.now() / 1000),
        session_id: sessionId,
      }));
    }
  }, [sessionId]);

  // ── Draw skeleton ──────────────────────────────────────────────────────────
  const drawSkeleton = useCallback((
    kp: Keypoint3D[],
    faultList: PostureFault[],
    ctx: CanvasRenderingContext2D,
    w: number, h: number
  ) => {
    const faultMap = new Map(faultList.map(f => [f.joint ?? "", f]));

    // Bones
    ctx.lineWidth = 2.5;
    for (const [ai, bi] of BLAZEPOSE_CONNECTIONS) {
      const a = kp[ai], b = kp[bi];
      if (!a || !b || a.score < 0.15 || b.score < 0.15) continue;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    // Joints — colour-coded by fault
    for (let i = 0; i < kp.length; i++) {
      const k = kp[i];
      if (!k || k.score < 0.15) continue;
      const jointName = Object.entries(JOINT_KP_MAP).find(([, idx]) => idx === i)?.[0];
      const fault = jointName ? faultMap.get(jointName) : undefined;
      const hasAngle = jointName ? (angles[jointName] !== undefined) : false;
      const color = jointColor(fault, hasAngle);
      const radius = jointName ? 8 : 4;

      ctx.beginPath();
      ctx.arc(k.x * w, k.y * h, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (radius > 4) {
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Angle labels on tracked joints
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    for (const [jointName, kpIdx] of Object.entries(JOINT_KP_MAP)) {
      const angle = angles[jointName];
      if (angle === undefined) continue;
      const k = kp[kpIdx];
      if (!k || k.score < 0.15) continue;
      const x = k.x * w, y = k.y * h - 18;
      const label = `${angle.toFixed(0)}°`;
      const mw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      ctx.beginPath();
      ctx.roundRect(x - mw / 2 - 5, y - 13, mw + 10, 18, 4);
      ctx.fill();
      const fault = faultMap.get(jointName);
      ctx.fillStyle = fault ? FAULT_COLOR[fault.severity] : "#22c55e";
      ctx.fillText(label, x, y);
    }

    // Fault overlays — draw warning arrows on affected joints
    for (const fault of faultList) {
      if (!fault.joint) continue;
      const kpIdx = JOINT_KP_MAP[fault.joint];
      if (kpIdx === undefined) continue;
      const k = kp[kpIdx];
      if (!k || k.score < 0.15) continue;
      const x = k.x * w, y = k.y * h;
      // Pulsing ring around faulty joint
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.strokeStyle = FAULT_COLOR[fault.severity] + "99";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [angles]);

  // ── Debug overlay — bounding box + raw landmark dots + diagnostics ──────────
  const drawDebugOverlay = useCallback((
    kp: Keypoint3D[],
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
  ) => {
    const visible = kp.filter(k => k && k.score >= 0.3);
    if (visible.length === 0) return;

    // Bounding box around all visible landmarks
    const xs = visible.map(k => k.x * w);
    const ys = visible.map(k => k.y * h);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    const y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = 12;

    ctx.save();
    ctx.strokeStyle = "#0fffc5";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x0 - pad, y0 - pad, (x1 - x0) + pad * 2, (y1 - y0) + pad * 2);
    ctx.setLineDash([]);

    // Bounding box label
    ctx.fillStyle = "rgba(15,255,197,0.85)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`Subject detected · ${visible.length}/33 kp`, x0 - pad + 4, y0 - pad - 4);

    // Raw landmark dots — all 33, colour by visibility
    for (let i = 0; i < kp.length; i++) {
      const k = kp[i];
      if (!k) continue;
      const px = k.x * w, py = k.y * h;
      const alpha = Math.max(0.15, k.score);
      // Green = high confidence, yellow = medium, red = low
      const color = k.score >= 0.7 ? `rgba(34,197,94,${alpha})`
                  : k.score >= 0.4 ? `rgba(234,179,8,${alpha})`
                  : `rgba(239,68,68,${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Index label on every 5th landmark to avoid clutter
      if (i % 5 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(i), px, py - 5);
      }
    }

    // Visibility score bar for each tracked joint
    let barY = y0 - pad - 20;
    ctx.font = "9px monospace";
    ctx.textAlign = "left";
    for (const [jointName, kpIdx] of Object.entries(JOINT_KP_MAP)) {
      const k = kp[kpIdx];
      if (!k) continue;
      const vis = k.score;
      const barW = 60;
      const filled = Math.round(vis * barW);
      const barX = x1 + pad + 6;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(barX, barY - 8, barW + 60, 11);
      ctx.fillStyle = vis >= 0.65 ? "#22c55e" : "#ef4444";
      ctx.fillRect(barX, barY - 8, filled, 11);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText(`${jointName.replace("_", " ")} ${(vis * 100).toFixed(0)}%`, barX + barW + 4, barY);
      barY -= 14;
    }

    ctx.restore();
  }, []);

  // ── Run stream diagnostics (called once on demand) ────────────────────────
  const runDiagnostics = useCallback(async () => {
    if (!videoRef.current || debugRunning) return;
    setDebugRunning(true);
    const report = await diagnoseVideoStream(videoRef.current);
    setDebugInfo(report);
    setDebugRunning(false);
    if (report.errors.length > 0) {
      console.warn("[PoseCamera] Stream diagnostics:", report);
    }
  }, [debugRunning]);

  const runLoopRef = useRef<() => void>();

  // ── Inference loop ─────────────────────────────────────────────────────────
  const runLoop = useCallback(async () => {
    if (!activeRef.current || !detectorRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    // Wait until video has real dimensions — reschedule without burning CPU
    if (video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(() => runLoopRef.current?.());
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth;
    const h = video.videoHeight;

    // Only resize canvas when dimensions actually change — resizing clears the canvas
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    try {
      const poses = await detectorRef.current.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.1,  // lowered: accept partial/occluded poses
      });

      ctx.save();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, 0, 0, w, h);

      if (poses.length > 0) {
        const rawKp = poses[0].keypoints3D ?? poses[0].keypoints;
        const kp: Keypoint3D[] = new Array(33).fill(null).map(() => ({ x: 0, y: 0, z: 0, score: 0 }));

        if (poses[0].keypoints3D) {
          for (let i = 0; i < rawKp.length && i < 33; i++) {
            const k = rawKp[i];
            kp[i] = { x: k.x, y: k.y, z: (k as any).z ?? 0, score: k.score ?? 0 };
          }
        } else {
          const cocoToBP: Record<number, number> = {
            5: 11, 6: 12, 7: 13, 8: 14, 9: 15, 10: 16,
            11: 23, 12: 24, 13: 25, 14: 26, 15: 27, 16: 28,
          };
          for (let i = 0; i < rawKp.length; i++) {
            const bpIdx = cocoToBP[i];
            if (bpIdx !== undefined) {
              kp[bpIdx] = { x: rawKp[i].x / w, y: rawKp[i].y / h, z: 0, score: rawKp[i].score ?? 0 };
            }
          }
        }

        const detectedExercise = classifyExercise(kp, preset);
        if (detectedExercise !== "unknown") exerciseRef.current = detectedExercise;

        const analysis = analyzePosture(kp, exerciseRef.current, repStateRef.current);
        repStateRef.current = analysis.repState;

        setAngles(analysis.angles);
        setFaults(analysis.faults);
        setFormScore(analysis.score);
        setExercise(exerciseRef.current.replace("_", " "));
        setPhase(analysis.phase);
        onFormScore?.(analysis.score);

        if (analysis.repCompleted) {
          const newCount = repStateRef.current.count;
          setRepCount(newCount);
          const primaryJoint = (
            exerciseRef.current === "shoulder_press" || exerciseRef.current === "lateral_raise" ? "shoulder_left" :
            exerciseRef.current === "bicep_curl" ? "elbow_left" :
            exerciseRef.current === "hip_abduction" ? "hip_left" : "knee_left"
          ) as JointName;
          const primaryAngle = analysis.angles[primaryJoint] ?? analysis.angles["knee_left"] ?? 0;
          onRepComplete?.(primaryJoint, primaryAngle, newCount);
          sendRepEvent(primaryAngle, 90);
          speak(`Rep ${newCount}`);
        }

        const topFault = analysis.faults.find(f => f.severity === "error")
          ?? analysis.faults.find(f => f.severity === "warning");
        if (topFault) {
          const now = Date.now();
          if (topFault.fault !== lastFaultRef.current || now - lastFaultTime.current > 4000) {
            lastFaultRef.current = topFault.fault;
            lastFaultTime.current = now;
            onFeedback?.(topFault.message, topFault.severity === "error" ? "out_of_range" : "warning");
            if (topFault.severity === "error") speak(topFault.message);
          }
        } else if (analysis.score === 100) {
          onFeedback?.("Perfect form!", "good");
        }

        drawSkeleton(kp, analysis.faults, ctx, w, h);
        if (debugMode) drawDebugOverlay(kp, ctx, w, h);
      } else {
        // No pose detected — still draw the video frame so it's not black
        ctx.drawImage(video, 0, 0, w, h);
      }
      ctx.restore();
    } catch (e) {
      // Swallow inference errors — keep the loop alive
      console.warn("[PoseCamera] inference error:", e);
    }

    // FPS counter
    const now = Date.now();
    fpsRef.current.frames++;
    if (now - fpsRef.current.lastTime >= 1000) {
      setFps(fpsRef.current.frames);
      fpsRef.current = { frames: 0, lastTime: now };
    }

    if (activeRef.current) rafRef.current = requestAnimationFrame(() => runLoopRef.current?.());
  }, [drawSkeleton, drawDebugOverlay, debugMode, preset, onRepComplete, onFeedback, onFormScore, sendRepEvent, speak]);

  // Keep runLoopRef always pointing to the latest runLoop closure
  useEffect(() => { runLoopRef.current = runLoop; }, [runLoop]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    activeRef.current = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        setLoadingMsg("Loading TensorFlow.js…");
        setLoadingPct(15);
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        setLoadingMsg("Setting up WebGL backend…");
        setLoadingPct(30);
        await tf.setBackend("webgl");
        await tf.ready();

        setLoadingMsg("Loading BlazePose Heavy model…");
        setLoadingPct(55);

        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: "tfjs" as const,
            modelType: "heavy",
            enableSmoothing: true,
            enableSegmentation: false,
          }
        );

        detectorRef.current = detector;
        setLoadingMsg("Starting camera…");
        setLoadingPct(75);

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: false,
        });

        if (!videoRef.current) return;
        const video = videoRef.current;
        video.srcObject = stream;

        // Wait for video to have real dimensions before starting the loop
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play()
              .then(() => {
                // Extra guard: wait until videoWidth is populated
                const poll = setInterval(() => {
                  if (video.videoWidth > 0) {
                    clearInterval(poll);
                    resolve();
                  }
                }, 50);
              })
              .catch(reject);
          };
          video.onerror = reject;
        });

        setLoadingPct(100);
        setIsLoading(false);
        // Start loop via ref so it always uses the latest closure
        rafRef.current = requestAnimationFrame(() => runLoopRef.current?.());
      } catch (err: any) {
        setCameraError(err?.message || "Failed to start pose engine");
        setIsLoading(false);
      }
    }

    init();
    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      detectorRef.current?.dispose?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLoading && !cameraError) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => runLoopRef.current?.());
    }
  }, [isLoading, cameraError]);

  const scoreColor = formScore == null ? "#6b7280"
    : formScore >= 92 ? "#22c55e"   // excellent (dataset top 25%)
    : formScore >= 77 ? "#0fffc5"   // good (dataset median)
    : formScore >= 60 ? "#eab308"   // fair
    : "#ef4444";                    // needs work (dataset bottom quartile)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Camera canvas */}
      <div style={{
        position: "relative", width: "100%", background: "#000",
        borderRadius: 16, overflow: "hidden", minHeight: 320,
        border: "1px solid rgba(15,255,197,0.15)",
      }}>
        <video ref={videoRef} style={{ display: "none" }} playsInline muted />
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block", maxHeight: "60vh" }} />

        {/* Loading */}
        {isLoading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(2,24,43,0.93)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
          }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#0fffc5", animation: "spinCW 1s linear infinite" }} />
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "rgba(15,255,197,0.5)", animation: "spinCW 1.5s linear infinite reverse" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🦴</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#0fffc5", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{loadingMsg}</p>
              <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12 }}>BlazePose Heavy · 33 keypoints · 3D · ~8MB · 95% PCK</p>
            </div>
            <div style={{ width: 200, height: 3, background: "rgba(15,255,197,0.1)", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,rgba(15,255,197,0.5),#0fffc5)", width: `${loadingPct}%`, transition: "width 0.4s ease", boxShadow: "0 0 8px rgba(15,255,197,0.6)" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {cameraError && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(2,24,43,0.95)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, textAlign: "center", gap: 16,
          }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div>
              <p style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Pose Engine Error</p>
              <p style={{ color: "rgba(232,244,240,0.6)", fontSize: 13, marginBottom: 12, maxWidth: 320 }}>{cameraError}</p>
              <p style={{ color: "rgba(232,244,240,0.35)", fontSize: 11 }}>Chrome/Edge · Camera permission · HTTPS or localhost</p>
            </div>
            <button onClick={() => { setCameraError(null); setIsLoading(true); setLoadingPct(0); }}
              style={{ padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* HUD */}
        {!isLoading && !cameraError && (
          <>
            {/* Top-left: FPS + model */}
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ background: "rgba(0,0,0,0.7)", color: fps >= 20 ? "#0fffc5" : "#eab308", fontSize: 10, fontFamily: "monospace", padding: "3px 7px", borderRadius: 5, border: "1px solid rgba(15,255,197,0.2)" }}>
                {fps} FPS
              </span>
              <span style={{ background: "rgba(0,0,0,0.7)", color: "rgba(232,244,240,0.4)", fontSize: 9, fontFamily: "monospace", padding: "3px 7px", borderRadius: 5 }}>
                BlazePose Heavy · 95%
              </span>
            </div>

            {/* Top-right: form score */}
            {formScore !== null && (
              <div style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(0,0,0,0.75)", borderRadius: 10,
                padding: "8px 12px", textAlign: "center",
                border: `1px solid ${scoreColor}40`,
              }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{formScore}</p>
                <p style={{ fontSize: 9, color: scoreColor, marginTop: 2, fontWeight: 600 }}>
                  {getScoreBandLabel(formScore).toUpperCase()}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Live fault panel */}
      {!isLoading && !cameraError && (
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12, padding: "12px 14px",
        }}>
          {/* Exercise + phase */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0fffc5", textTransform: "capitalize" }}>{exercise}</span>
              {phase && <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 5 }}>{phase}</span>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0fffc5" }}>Rep {repCount}</span>
          </div>

          {/* Faults */}
          {faults.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "#22c55e" }}>Good form — keep it up</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {faults.slice(0, 3).map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "7px 10px", borderRadius: 8,
                  background: `${FAULT_COLOR[f.severity]}10`,
                  border: `1px solid ${FAULT_COLOR[f.severity]}30`,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: FAULT_COLOR[f.severity], flexShrink: 0, marginTop: 3 }} />
                  <span style={{ fontSize: 12, color: FAULT_COLOR[f.severity], lineHeight: 1.4 }}>{f.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Angle readouts */}
          {Object.keys(angles).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
              {Object.entries(angles).map(([joint, angle]) => (
                <span key={joint} style={{
                  fontSize: 10, fontFamily: "monospace",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 5, padding: "2px 7px", color: "rgba(232,244,240,0.5)",
                }}>
                  {joint.replace("_", " ")}: <span style={{ color: "#0fffc5" }}>{angle.toFixed(0)}°</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Debug panel */}
      {debugMode && !isLoading && !cameraError && (
        <div style={{
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(15,255,197,0.2)",
          borderRadius: 12, padding: "12px 14px", fontFamily: "monospace",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "#0fffc5", fontWeight: 700 }}>🔬 Stream Diagnostics</span>
            <button onClick={runDiagnostics} disabled={debugRunning} style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
              background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.3)",
              color: "#0fffc5",
            }}>
              {debugRunning ? "Running…" : "Run Diagnostics"}
            </button>
          </div>

          {debugInfo ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                ["readyState",      `${debugInfo.readyState} ${debugInfo.readyState >= 2 ? "✓" : "✗ (need ≥ 2)"}`],
                ["resolution",      `${debugInfo.videoWidth}×${debugInfo.videoHeight}`],
                ["frame advancing", debugInfo.frameAdvanced ? "✓ yes" : "✗ stalled"],
                ["brightness",      `${debugInfo.meanBrightness}/255 ${debugInfo.isBlackFrame ? "⚠ black frame" : "✓"}`],
                ["base64 length",   `${debugInfo.base64Length.toLocaleString()} chars`],
                ["blob size",       `${(debugInfo.blobSizeBytes / 1024).toFixed(1)} KB`],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)" }}>{label}</span>
                  <span style={{ fontSize: 10, color: "#e8f4f0" }}>{value}</span>
                </div>
              ))}

              {debugInfo.errors.length > 0 && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  {debugInfo.errors.map((e, i) => (
                    <p key={i} style={{ fontSize: 10, color: "#ef4444", marginBottom: 2 }}>⚠ {e}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)" }}>Click "Run Diagnostics" to check the webcam stream.</p>
          )}
        </div>
      )}
    </div>
  );
}
