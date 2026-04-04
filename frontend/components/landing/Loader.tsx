"use client";
import { useEffect, useState } from "react";

const DURATION = 2000; // exactly 2 seconds

export default function Loader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const start = Date.now();
    let raf: number;

    function tick() {
      const elapsed = Date.now() - start;
      const p = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(p);

      if (p < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        // Hold at 100% for 200ms then fade out
        setTimeout(() => {
          setExiting(true);
          setTimeout(onDone, 400);
        }, 200);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const phase =
    progress < 30 ? "Initialising neural pathways" :
    progress < 60 ? "Calibrating pose engine" :
    progress < 90 ? "Loading recovery models" :
    "System ready";

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center"
      style={{
        background: "#02182b",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.02)" : "scale(1)",
        pointerEvents: exiting ? "none" : "all",
      }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(15,255,197,0.06) 0%, transparent 70%)" }} />

      {/* Orbital rings */}
      <div className="relative mb-10" style={{ width: 120, height: 120 }}>
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full animate-spin-slow"
          style={{
            border: "1.5px solid transparent",
            borderTopColor: "#0fffc5",
            borderRightColor: "rgba(15,255,197,0.3)",
            filter: "drop-shadow(0 0 6px rgba(15,255,197,0.4))",
          }} />

        {/* Middle ring */}
        <div className="absolute rounded-full animate-spin-reverse"
          style={{
            inset: 14,
            border: "1px solid transparent",
            borderBottomColor: "rgba(15,255,197,0.5)",
            borderLeftColor: "rgba(15,255,197,0.15)",
          }} />

        {/* Inner ring */}
        <div className="absolute rounded-full animate-spin-slow"
          style={{
            inset: 28,
            border: "1px solid rgba(15,255,197,0.12)",
            borderTopColor: "rgba(15,255,197,0.4)",
            animationDuration: "4s",
          }} />

        {/* Orbiting dot — outer */}
        <div className="absolute" style={{ inset: 0, animation: "orbit 9s linear infinite" }}>
          <div style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "#0fffc5",
            boxShadow: "0 0 8px #0fffc5, 0 0 16px rgba(15,255,197,0.5)",
          }} />
        </div>

        {/* Orbiting dot — inner */}
        <div className="absolute" style={{ inset: 0, animation: "orbit-reverse 6s linear infinite" }}>
          <div style={{
            width: 3, height: 3, borderRadius: "50%",
            background: "rgba(15,255,197,0.7)",
            boxShadow: "0 0 6px rgba(15,255,197,0.6)",
          }} />
        </div>

        {/* Center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <div className="w-3 h-3 rounded-full animate-pulse-glow"
              style={{ background: "#0fffc5" }} />
            {/* Ripple */}
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(15,255,197,0.3)", animationDuration: "1.5s" }} />
          </div>
        </div>
      </div>

      {/* Brand */}
      <div className="text-center mb-10">
        <p className="text-xs tracking-[0.35em] uppercase mb-2"
          style={{ color: "rgba(15,255,197,0.4)" }}>
          Nakshatra 2026
        </p>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          NeuroRestore AI
        </h1>
      </div>

      {/* Progress bar */}
      <div className="mb-4" style={{ width: 240 }}>
        <div className="flex justify-between mb-2">
          <span className="text-xs font-mono" style={{ color: "rgba(15,255,197,0.35)" }}>
            {phase}<span className="animate-blink">_</span>
          </span>
          <span className="text-xs font-mono" style={{ color: "rgba(15,255,197,0.35)" }}>
            {Math.floor(progress)}%
          </span>
        </div>
        <div className="h-px w-full rounded-full overflow-hidden"
          style={{ background: "rgba(15,255,197,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, rgba(15,255,197,0.4) 0%, #0fffc5 100%)",
              boxShadow: "0 0 10px rgba(15,255,197,0.7)",
              transition: "width 0.05s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
