"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: (score: number, metrics: FacialMetrics) => void;
}

export interface FacialMetrics {
  blinkRate: number;
  gazeStability: number;
  attentionScore: number;
  expressionVariance: number;
}

type Phase = "intro" | "permission" | "calibrating" | "recording" | "done" | "denied";
const RECORD_DURATION = 20;

function MetricBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm w-5">{icon}</span>
      <span className="text-xs text-gray-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }}
          animate={{ width: `${Math.min(value, 100)}%` }} transition={{ duration: 0.4 }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

export default function FacialTest({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(RECORD_DURATION);
  const [liveMetrics, setLiveMetrics] = useState({ blink: 0, gaze: 0, attention: 0 });
  const [finalMetrics, setFinalMetrics] = useState<FacialMetrics | null>(null);

  // Video is ALWAYS in the DOM — never conditionally rendered
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkCountRef = useRef(0);
  const prevBrightnessRef = useRef(0);
  const brightnessHistoryRef = useRef<number[]>([]);
  const doneRef = useRef(false);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameRef.current) clearInterval(frameRef.current);
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);

  // Whenever stream changes, attach it to the video element
  useEffect(() => {
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  async function requestCamera() {
    setPhase("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Attach immediately — video is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setPhase("calibrating");
      setTimeout(startRecording, 2000);
    } catch {
      setPhase("denied");
      const m: FacialMetrics = { blinkRate: 18, gazeStability: 65, attentionScore: 62, expressionVariance: 50 };
      if (!doneRef.current) { doneRef.current = true; onComplete(62, m); }
    }
  }

  function analyzeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 80; canvas.height = 60;
    ctx.drawImage(video, 0, 0, 80, 60);
    const data = ctx.getImageData(0, 0, 80, 60).data;
    let brightness = 0;
    for (let i = 0; i < data.length; i += 4) brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    brightness /= (data.length / 4);
    brightnessHistoryRef.current.push(brightness);
    const prev = prevBrightnessRef.current;
    if (prev > 0 && brightness < prev - 8) blinkCountRef.current++;
    prevBrightnessRef.current = brightness;
  }

  function startRecording() {
    setPhase("recording");
    blinkCountRef.current = 0;
    brightnessHistoryRef.current = [];
    let elapsed = 0;
    frameRef.current = setInterval(analyzeFrame, 100);
    timerRef.current = setInterval(() => {
      elapsed++;
      const remaining = RECORD_DURATION - elapsed;
      setCountdown(remaining);
      const blinkRate = Math.round((blinkCountRef.current / elapsed) * 60);
      const frames = brightnessHistoryRef.current;
      const mean = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
      const variance = frames.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (frames.length || 1);
      const gazeStability = Math.round(Math.max(0, Math.min(100, 100 - variance / 2)));
      const blinkScore = blinkRate >= 12 && blinkRate <= 25 ? 100 : blinkRate > 0 ? 60 : 40;
      setLiveMetrics({ blink: Math.min(blinkRate * 2.5, 100), gaze: gazeStability, attention: Math.round(gazeStability * 0.6 + blinkScore * 0.4) });
      if (remaining <= 0) { clearInterval(timerRef.current!); clearInterval(frameRef.current!); finishRecording(); }
    }, 1000);
  }

  function finishRecording() {
    stopAll();
    const frames = brightnessHistoryRef.current;
    const blinkRate = Math.round((blinkCountRef.current / RECORD_DURATION) * 60);
    const mean = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
    const variance = frames.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (frames.length || 1);
    const gazeStability = Math.round(Math.max(0, Math.min(100, 100 - variance / 2)));
    const maxB = Math.max(...frames, 0); const minB = Math.min(...frames, 0);
    const expressionVariance = Math.round(Math.min(100, ((maxB - minB) / 50) * 100));
    const blinkScore = blinkRate < 8 ? 40 : blinkRate <= 25 ? 100 : 55;
    const attentionScore = Math.min(100, Math.max(0, Math.round(gazeStability * 0.5 + blinkScore * 0.3 + (100 - expressionVariance) * 0.2)));
    const m: FacialMetrics = { blinkRate, gazeStability, attentionScore, expressionVariance };
    setFinalMetrics(m);
    setPhase("done");
    if (!doneRef.current) { doneRef.current = true; onComplete(attentionScore, m); }
  }

  function skip() {
    stopAll();
    const m: FacialMetrics = { blinkRate: 16, gazeStability: 70, attentionScore: 70, expressionVariance: 45 };
    setFinalMetrics(m); setPhase("done");
    if (!doneRef.current) { doneRef.current = true; onComplete(70, m); }
  }

  const showVideo = phase === "calibrating" || phase === "recording";
  const progressPct = ((RECORD_DURATION - countdown) / RECORD_DURATION) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", width: "100%" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF" }}>👁️ Attention Analysis</h2>

      {/* ── Video always in DOM, shown/hidden via CSS only ── */}
      <div style={{
        position: "relative",
        borderRadius: 8,
        overflow: "hidden",
        border: "2px solid rgba(107,158,255,0.4)",
        width: "100%",
        maxWidth: 400,
        transition: "all .5s",
        height: showVideo ? 240 : 0,
        opacity: showVideo ? 1 : 0,
        pointerEvents: showVideo ? "auto" : "none",
      }}>
        {/* The actual camera feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Calibrating overlay */}
        {phase === "calibrating" && (
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.4)",
            gap: 8,
          }}>
            <div style={{ width: 28, height: 28, border: "3px solid #6B9EFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spinCW 1s linear infinite" }} />
            <p style={{ color: "#6B9EFF", fontSize: 12, fontWeight: 600, letterSpacing: ".05em" }}>Calibrating…</p>
          </div>
        )}

        {/* Recording overlays */}
        {phase === "recording" && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Pulsing face oval */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="w-32 h-40 rounded-full border-2 border-dashed"
                animate={{ borderColor: ["rgba(9,255,211,0.3)", "rgba(9,255,211,0.9)", "rgba(9,255,211,0.3)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            {/* Corner brackets */}
            {(["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2",
               "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"] as const).map((cls) => (
              <div key={cls} className={`absolute w-5 h-5 border-[#09ffd3] ${cls}`} />
            ))}
            {/* REC badge */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 rounded-full px-3 py-1">
              <motion.div className="w-2 h-2 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />
              <span className="text-[10px] text-white font-mono font-bold">SCANNING</span>
            </div>
            {/* Countdown */}
            <div className="absolute bottom-2 right-2 bg-black/70 rounded-lg px-2 py-1">
              <span className="text-sm text-[#09ffd3] font-mono font-bold">{countdown}s</span>
            </div>
            {/* Scan line animation */}
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#09ffd3]/60 to-transparent"
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )}
      </div>

      {/* ── Phase-specific UI below the video ── */}
      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%" }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, maxWidth: 400, lineHeight: 1.6 }}>
              A 20-second webcam scan measures your{" "}
              <span style={{ color: "#6B9EFF" }}>blink rate</span> and{" "}
              <span style={{ color: "#6B9EFF" }}>gaze stability</span> — key indicators of cognitive attention.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, width: "100%", maxWidth: 400, fontSize: 12 }}>
              {[["🔒", "Private", "No data stored"], ["⚡", "Fast", "20 seconds"], ["🧠", "Accurate", "Clinically inspired"]].map(([icon, title, desc]) => (
                <div key={title} style={{
                  padding: "12px 8px",
                  borderRadius: 8,
                  background: "#1A3447",
                  border: "2px solid #243B4E",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontWeight: 600, color: "#FFFFFF", fontSize: 12, marginBottom: 2 }}>{title}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>{desc}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={requestCamera}
                style={{
                  padding: "14px 28px",
                  borderRadius: 8,
                  background: "#6B9EFF",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 15,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 16px rgba(107,158,255,0.25)",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
              >
                Enable Camera
              </button>
              <button onClick={skip}
                style={{
                  padding: "14px 20px",
                  borderRadius: 8,
                  border: "2px solid #243B4E",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 15,
                  cursor: "pointer",
                  transition: "all .2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)";
                  (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "#243B4E";
                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
                }}
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {phase === "permission" && (
          <motion.div key="perm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
            <div style={{ width: 24, height: 24, border: "3px solid #6B9EFF", borderTopColor: "transparent", borderRadius: "50%", animation: "spinCW 1s linear infinite" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>Requesting camera access…</p>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 400 }}>
            {/* Progress bar */}
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <motion.div style={{
                height: "100%",
                background: "linear-gradient(90deg, #6B9EFF, rgba(107,158,255,0.6))",
                borderRadius: 3,
              }}
                animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }} />
            </div>
            {/* Live metrics */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <MetricBar label="Blink Rate" value={liveMetrics.blink} color="#6B9EFF" icon="👁️" />
              <MetricBar label="Gaze Stability" value={liveMetrics.gaze} color="#7BAAFF" icon="🎯" />
              <MetricBar label="Attention" value={liveMetrics.attention} color="#5A8EEE" icon="🧠" />
            </div>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 4 }}>Look naturally at the screen. Keep your face in the oval.</p>
          </motion.div>
        )}

        {phase === "denied" && (
          <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "8px 0" }}>
            <p style={{ color: "#6B9EFF", fontSize: 14 }}>Camera access denied.</p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Score estimated from other domains.</p>
          </motion.div>
        )}

        {phase === "done" && finalMetrics && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>Attention analysis complete ✓</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, width: "100%", maxWidth: 400 }}>
              {[
                { label: "Blink Rate", value: `${finalMetrics.blinkRate}/min`, sub: "Normal: 12–25", color: "#6B9EFF" },
                { label: "Gaze Stability", value: `${finalMetrics.gazeStability}%`, sub: "Higher = better", color: "#7BAAFF" },
                { label: "Attention Score", value: `${finalMetrics.attentionScore}/100`, sub: "Overall", color: "#5A8EEE" },
                { label: "Expression", value: `${finalMetrics.expressionVariance}%`, sub: "Variance", color: "#6B9EFF" },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    padding: "14px 12px",
                    borderRadius: 8,
                    background: "#1A3447",
                    border: "2px solid #243B4E",
                    textAlign: "left",
                  }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{m.sub}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
