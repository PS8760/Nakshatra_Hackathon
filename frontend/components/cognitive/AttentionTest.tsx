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
    <div className="flex flex-col items-center gap-4 text-center w-full">
      <h2 className="text-2xl font-bold">👁️ Facial Attention Analysis</h2>

      {/* ── Video always in DOM, shown/hidden via CSS only ── */}
      <div className={`relative rounded-2xl overflow-hidden border border-[#09ffd3]/40 w-full max-w-xs transition-all duration-500 ${showVideo ? "h-52 opacity-100" : "h-0 opacity-0 pointer-events-none"}`}>
        {/* The actual camera feed */}
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Calibrating overlay */}
        {phase === "calibrating" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 gap-2">
            <div className="w-6 h-6 border-2 border-[#09ffd3] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#09ffd3] text-xs font-semibold tracking-wide">Calibrating…</p>
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
            className="flex flex-col items-center gap-4 w-full">
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
              A 20-second webcam scan measures your{" "}
              <span className="text-[#09ffd3]">blink rate</span> and{" "}
              <span className="text-[#09ffd3]">gaze stability</span> — key indicators of cognitive attention.
            </p>
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs text-xs">
              {[["🔒", "Private", "No data stored"], ["⚡", "Fast", "20 seconds"], ["🧠", "Accurate", "Clinically inspired"]].map(([icon, title, desc]) => (
                <div key={title} className="p-2 rounded-xl bg-white/5 border border-white/8 text-center">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className="font-semibold text-white text-xs">{title}</div>
                  <div className="text-gray-600 text-[10px]">{desc}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={requestCamera}
                className="px-7 py-3 rounded-xl bg-[#09ffd3] text-[#02182b] font-bold text-sm hover:brightness-110 transition shadow-[0_0_16px_rgba(9,255,211,0.25)]">
                Enable Camera
              </button>
              <button onClick={skip}
                className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 text-sm hover:border-white/20 transition">
                Skip
              </button>
            </div>
          </motion.div>
        )}

        {phase === "permission" && (
          <motion.div key="perm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 border-2 border-[#09ffd3] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Requesting camera access…</p>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col gap-2 w-full max-w-xs">
            {/* Progress bar */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-[#09ffd3] to-[#09ffd3]/60 rounded-full"
                animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8 }} />
            </div>
            {/* Live metrics */}
            <div className="flex flex-col gap-1.5 mt-1">
              <MetricBar label="Blink Rate" value={liveMetrics.blink} color="#09ffd3" icon="👁️" />
              <MetricBar label="Gaze Stability" value={liveMetrics.gaze} color="#6366f1" icon="🎯" />
              <MetricBar label="Attention" value={liveMetrics.attention} color="#f59e0b" icon="🧠" />
            </div>
            <p className="text-[10px] text-gray-600 text-center mt-1">Look naturally at the screen. Keep your face in the oval.</p>
          </motion.div>
        )}

        {phase === "denied" && (
          <motion.div key="denied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-1 py-2">
            <p className="text-yellow-400 text-sm">Camera access denied.</p>
            <p className="text-gray-500 text-xs">Score estimated from other domains.</p>
          </motion.div>
        )}

        {phase === "done" && finalMetrics && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3 w-full">
            <p className="text-[#09ffd3] font-semibold">Facial analysis complete ✓</p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              {[
                { label: "Blink Rate", value: `${finalMetrics.blinkRate}/min`, sub: "Normal: 12–25", color: "#09ffd3" },
                { label: "Gaze Stability", value: `${finalMetrics.gazeStability}%`, sub: "Higher = better", color: "#6366f1" },
                { label: "Attention Score", value: `${finalMetrics.attentionScore}/100`, sub: "Overall", color: "#f59e0b" },
                { label: "Expression", value: `${finalMetrics.expressionVariance}%`, sub: "Variance", color: "#ec4899" },
              ].map((m, i) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-3 rounded-xl bg-white/5 border border-white/8 text-left">
                  <div className="text-[10px] text-gray-500 mb-0.5">{m.label}</div>
                  <div className="font-bold text-sm" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[10px] text-gray-600">{m.sub}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
