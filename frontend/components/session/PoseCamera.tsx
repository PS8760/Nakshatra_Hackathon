"use client";
/**
 * PoseCamera — Production-ready Track A Component
 *
 * Fix: Uses locally-served WASM files from /public/mediapipe/
 * instead of CDN to avoid CORS, network failures, and Module.arguments issues.
 *
 * Strategy:
 * 1. Try local /mediapipe/pose.js first (fastest, no network)
 * 2. Fall back to pinned CDN if local fails
 * 3. Script injection into global scope (bypasses webpack WASM bundling)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  extractJointAngles,
  updateRepState,
  createRepState,
  getJointColor,
  computeSymmetryScore,
  DEFAULT_TARGET_ROM,
} from "@/lib/poseEngine";
import type { JointAngleResult, JointName, RepState } from "@/types";

interface Props {
  sessionId: number;
  token: string;
  targetRoms?: Partial<Record<JointName, number>>;
  activeJoints?: JointName[];
  onRepComplete?: (joint: JointName, angle: number, repCount: number) => void;
  onFeedback?: (msg: string, status: string) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// Local files served from /public/mediapipe/ — no CDN dependency
const LOCAL_POSE_JS   = "/mediapipe/pose.js";
const LOCAL_CAM_JS    = "/mediapipe/pose_solution_packed_assets_loader.js"; // not needed
const CDN_POSE_JS     = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js";
const CDN_CAM_JS      = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js";
const LOCAL_BASE      = "/mediapipe";
const CDN_BASE        = "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404";

function loadScript(src: string, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    const timer = setTimeout(() => reject(new Error(`Timeout loading ${src}`)), timeout);
    s.onload  = () => { clearTimeout(timer); resolve(); };
    s.onerror = () => { clearTimeout(timer); reject(new Error(`Failed to load ${src}`)); };
    document.head.appendChild(s);
  });
}

/** Try local first, fall back to CDN */
async function loadPoseScripts(setMsg: (m: string) => void): Promise<{ base: string }> {
  setMsg("Loading pose engine (local)…");
  try {
    await loadScript(LOCAL_POSE_JS, 8000);
    // Also load camera utils from CDN (small file, no WASM)
    await loadScript(CDN_CAM_JS, 10000);
    // Verify globals exist
    if ((window as any).Pose && (window as any).Camera) {
      return { base: LOCAL_BASE };
    }
    throw new Error("Globals missing after local load");
  } catch (localErr) {
    console.warn("Local MediaPipe failed, trying CDN:", localErr);
    setMsg("Loading pose engine (CDN fallback)…");
    await loadScript(CDN_POSE_JS, 20000);
    await loadScript(CDN_CAM_JS, 10000);
    if (!(window as any).Pose || !(window as any).Camera) {
      throw new Error(
        "MediaPipe could not be loaded. Please check your internet connection and try again."
      );
    }
    return { base: CDN_BASE };
  }
}

export default function PoseCamera({
  sessionId, token, targetRoms = {}, activeJoints,
  onRepComplete, onFeedback,
}: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const poseRef     = useRef<any>(null);
  const cameraRef   = useRef<any>(null);
  const repStates   = useRef<Map<JointName, RepState>>(new Map());
  const fpsRef      = useRef({ frames: 0, lastTime: Date.now() });

  const [jointAngles,   setJointAngles]   = useState<JointAngleResult[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [loadingMsg,    setLoadingMsg]    = useState("Initialising…");
  const [loadingPct,    setLoadingPct]    = useState(0);
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  const [fps,           setFps]           = useState(0);
  const [symmetryScore, setSymmetryScore] = useState<number | null>(null);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
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
        if (d.event === "feedback") {
          onFeedback?.(d.message, d.status);
          if (d.rep_count && d.rep_count % 3 === 0) speak(d.message);
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => { try { ws.close(); } catch {} };
  }, [sessionId, token, onFeedback, speak]);

  const sendRepEvent = useCallback((joint: JointName, angle: number, target: number, visibility: number, side: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: "rep_complete", joint, angle, target,
        timestamp: Math.floor(Date.now() / 1000),
        session_id: sessionId, side, visibility_score: visibility,
      }));
    }
  }, [sessionId]);

  // ── Skeleton drawing ───────────────────────────────────────────────────────
  const drawSkeleton = useCallback((
    landmarks: any[], angles: JointAngleResult[],
    ctx: CanvasRenderingContext2D, w: number, h: number
  ) => {
    const angleMap = new Map(angles.map((a) => [a.joint, a]));
    const connections = [
      [11,13],[13,15],[12,14],[14,16],
      [11,12],[11,23],[12,24],[23,24],
      [23,25],[25,27],[24,26],[26,28],
    ];

    // Bones
    ctx.lineWidth = 2.5;
    for (const [a, b] of connections) {
      const lA = landmarks[a], lB = landmarks[b];
      if (!lA || !lB || (lA.visibility ?? 0) < 0.3 || (lB.visibility ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255,255,255,0.65)";
      ctx.moveTo(lA.x * w, lA.y * h);
      ctx.lineTo(lB.x * w, lB.y * h);
      ctx.stroke();
    }

    // Joints
    const jMap: Array<{ idx: number; joint?: JointName }> = [
      { idx: 11, joint: "shoulder_left" }, { idx: 12, joint: "shoulder_right" },
      { idx: 13, joint: "elbow_left" },    { idx: 14, joint: "elbow_right" },
      { idx: 15 }, { idx: 16 },
      { idx: 23, joint: "hip_left" },      { idx: 24, joint: "hip_right" },
      { idx: 25, joint: "knee_left" },     { idx: 26, joint: "knee_right" },
      { idx: 27 }, { idx: 28 },
    ];
    for (const { idx, joint } of jMap) {
      const lm = landmarks[idx];
      if (!lm || (lm.visibility ?? 0) < 0.3) continue;
      const ad = joint ? angleMap.get(joint) : undefined;
      const color = ad ? getJointColor(ad.status) : "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(lm.x * w, lm.y * h, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Angle labels
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    const jIdx: Record<string, number> = {
      knee_left: 25, knee_right: 26, elbow_left: 13, elbow_right: 14,
      shoulder_left: 11, shoulder_right: 12, hip_left: 23, hip_right: 24,
    };
    for (const angle of angles) {
      if (angle.status === "invisible") continue;
      const li = jIdx[angle.joint];
      if (li === undefined) continue;
      const lm = landmarks[li];
      if (!lm) continue;
      const x = lm.x * w, y = lm.y * h - 16;
      const label = `${angle.angle.toFixed(0)}°`;
      const mw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.beginPath();
      ctx.roundRect(x - mw / 2 - 5, y - 13, mw + 10, 18, 4);
      ctx.fill();
      ctx.fillStyle = getJointColor(angle.status);
      ctx.fillText(label, x, y);
    }
  }, []);

  // ── MediaPipe init ─────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoadingPct(10);
        const { base } = await loadPoseScripts(setLoadingMsg);
        if (!mounted) return;

        setLoadingMsg("Requesting camera access…");
        setLoadingPct(50);

        if (!videoRef.current || !canvasRef.current) return;

        setLoadingMsg("Initialising pose model…");
        setLoadingPct(70);

        const Pose   = (window as any).Pose;
        const Camera = (window as any).Camera;

        const pose = new Pose({ locateFile: (f: string) => `${base}/${f}` });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        pose.onResults((results: any) => {
          if (!mounted || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const w = results.image.videoWidth  || results.image.width  || 640;
          const h = results.image.videoHeight || results.image.height || 480;
          canvas.width = w; canvas.height = h;

          ctx.save();
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(results.image, 0, 0, w, h);

          if (results.poseLandmarks) {
            const merged = { ...DEFAULT_TARGET_ROM, ...targetRoms };
            const angles = extractJointAngles(results.poseLandmarks, merged);
            const filtered = activeJoints ? angles.filter((a) => activeJoints.includes(a.joint)) : angles;

            drawSkeleton(results.poseLandmarks, filtered, ctx, w, h);
            setJointAngles(filtered);

            for (const ad of filtered) {
              if (ad.status === "invisible") continue;
              if (!repStates.current.has(ad.joint)) repStates.current.set(ad.joint, createRepState(ad.joint));
              const prev = repStates.current.get(ad.joint)!;
              const { state: next, repCompleted } = updateRepState(prev, ad.angle);
              repStates.current.set(ad.joint, next);
              if (repCompleted) {
                onRepComplete?.(ad.joint, ad.angle, next.count);
                sendRepEvent(ad.joint, ad.angle, ad.target, ad.visibility, ad.side);
                speak(`Rep ${next.count}`);
              }
            }

            const kl = filtered.find((a) => a.joint === "knee_left");
            const kr = filtered.find((a) => a.joint === "knee_right");
            if (kl && kr && kl.status !== "invisible" && kr.status !== "invisible") {
              setSymmetryScore(computeSymmetryScore(kl.angle, kr.angle));
            }
          }
          ctx.restore();

          const now = Date.now();
          fpsRef.current.frames++;
          if (now - fpsRef.current.lastTime >= 1000) {
            setFps(fpsRef.current.frames);
            fpsRef.current = { frames: 0, lastTime: now };
          }
        });

        poseRef.current = pose;
        setLoadingPct(90);

        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (poseRef.current && videoRef.current) {
              await poseRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280, height: 720,
        });

        await camera.start();
        cameraRef.current = camera;
        if (mounted) { setIsLoading(false); setLoadingPct(100); }
      } catch (err: any) {
        if (mounted) {
          setCameraError(err?.message || "Failed to start pose engine");
          setIsLoading(false);
        }
      }
    }

    init();
    return () => {
      mounted = false;
      try { cameraRef.current?.stop(); } catch {}
      try { poseRef.current?.close(); } catch {}
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: "relative", width: "100%", background: "#000",
      borderRadius: 16, overflow: "hidden", minHeight: 320,
      border: "1px solid rgba(15,255,197,0.15)",
    }}>
      {/* Video element — always in DOM per cogniscan pattern */}
      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block", maxHeight: "68vh" }} />

      {/* Loading overlay */}
      {isLoading && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(2,24,43,0.92)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 20,
        }}>
          {/* Animated rings */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#0fffc5",
              animation: "spinCW 1s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 8, borderRadius: "50%",
              border: "2px solid transparent",
              borderBottomColor: "rgba(15,255,197,0.5)",
              animation: "spinCW 1.5s linear infinite reverse",
            }} />
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 22,
            }}>🦴</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ color: "#0fffc5", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{loadingMsg}</p>
            <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12 }}>
              First load downloads ~10MB model — cached after
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ width: 200, height: 3, background: "rgba(15,255,197,0.1)", borderRadius: 2 }}>
            <div style={{
              height: "100%", borderRadius: 2,
              background: "linear-gradient(90deg, rgba(15,255,197,0.5), #0fffc5)",
              width: `${loadingPct}%`,
              transition: "width 0.3s ease",
              boxShadow: "0 0 8px rgba(15,255,197,0.6)",
            }} />
          </div>
        </div>
      )}

      {/* Error overlay */}
      {cameraError && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(2,24,43,0.95)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 32, textAlign: "center", gap: 16,
        }}>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <div>
            <p style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Pose Engine Error
            </p>
            <p style={{ color: "rgba(232,244,240,0.6)", fontSize: 13, marginBottom: 12, maxWidth: 320 }}>
              {cameraError}
            </p>
            <p style={{ color: "rgba(232,244,240,0.35)", fontSize: 11 }}>
              Requires Chrome/Edge 120+ · Camera permission · localhost or HTTPS
            </p>
          </div>
          <button
            onClick={() => { setCameraError(null); setIsLoading(true); setLoadingPct(0); }}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* HUD — top left */}
      {!isLoading && !cameraError && (
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{
            background: "rgba(0,0,0,0.7)", color: fps >= 20 ? "#0fffc5" : "#eab308",
            fontSize: 11, fontFamily: "monospace", padding: "3px 8px", borderRadius: 6,
            border: "1px solid rgba(15,255,197,0.2)",
          }}>{fps} FPS</span>
          {symmetryScore !== null && (
            <span style={{
              background: "rgba(0,0,0,0.7)", color: "#60a5fa",
              fontSize: 11, fontFamily: "monospace", padding: "3px 8px", borderRadius: 6,
              border: "1px solid rgba(96,165,250,0.2)",
            }}>Sym {symmetryScore}%</span>
          )}
        </div>
      )}

      {/* Joint angles — top right */}
      {!isLoading && !cameraError && jointAngles.filter((a) => a.status !== "invisible").length > 0 && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          display: "flex", flexDirection: "column", gap: 3, maxWidth: 150,
        }}>
          {jointAngles.filter((a) => a.status !== "invisible").map((a) => (
            <div key={a.joint} style={{
              background: "rgba(0,0,0,0.75)", borderRadius: 6,
              padding: "3px 8px", fontSize: 11, fontFamily: "monospace",
              display: "flex", justifyContent: "space-between", gap: 8,
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <span style={{ color: "rgba(232,244,240,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.joint.replace("_", " ")}
              </span>
              <span style={{ color: a.status === "good" ? "#22c55e" : a.status === "warning" ? "#eab308" : "#ef4444", fontWeight: 700 }}>
                {a.angle.toFixed(0)}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
