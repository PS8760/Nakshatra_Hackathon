"use client";
import { useState, useEffect, useRef } from "react";
import { clamp } from "@/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: (score: number) => void;
}

const TRIALS = 3; // 3 trials, average the best 2 (drop worst)

// Clinically validated reaction time scoring
// Average human: 200-300ms. Cognitive decline shows >400ms.
function msToScore(ms: number): number {
  if (ms < 150) return 85; // suspiciously fast (anticipation) — cap it
  if (ms <= 250) return 100;
  if (ms <= 350) return 90;
  if (ms <= 450) return 75;
  if (ms <= 600) return 55;
  if (ms <= 800) return 35;
  return 15;
}

export default function ReactionTest({ onComplete }: Props) {
  const [trial, setTrial] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "ready" | "clicked" | "early" | "done">("waiting");
  const [times, setTimes] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    scheduleNext();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  function scheduleNext() {
    setPhase("waiting");
    setLastMs(null);
    const delay = 2000 + Math.random() * 3000; // 2–5s random delay
    timerRef.current = setTimeout(() => {
      setPhase("ready");
      startRef.current = performance.now(); // higher precision than Date.now()
    }, delay);
  }

  function handleClick() {
    if (phase === "waiting") {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase("early");
      // Don't count early clicks — restart this trial after 1.5s
      setTimeout(() => scheduleNext(), 1500);
      return;
    }

    if (phase === "ready") {
      const ms = Math.round(performance.now() - startRef.current);
      setLastMs(ms);
      setPhase("clicked");

      const newTimes = [...times, ms];
      setTimes(newTimes);

      if (newTimes.length >= TRIALS) {
        // Drop the worst (highest) time, average the rest
        const sorted = [...newTimes].sort((a, b) => a - b);
        const best = sorted.slice(0, TRIALS - 1); // drop worst
        const avgMs = Math.round(best.reduce((a, b) => a + b, 0) / best.length);
        const finalScore = msToScore(avgMs);

        setTimeout(() => {
          if (!doneRef.current) { doneRef.current = true; onComplete(finalScore); }
          setPhase("done");
        }, 800);
      } else {
        // Next trial after 1s
        setTimeout(() => scheduleNext(), 1000);
      }
    }
  }

  const avgMs = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", width: "100%" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF" }}>⚡ Reaction Test</h2>

      {/* Trial progress */}
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: TRIALS }, (_, i) => (
          <div key={i} style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: i < times.length ? "#6B9EFF" : i === times.length ? "rgba(107,158,255,0.4)" : "rgba(255,255,255,0.1)",
            transition: "all .3s",
          }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Trial {Math.min(times.length + 1, TRIALS)} of {TRIALS}</p>

      <AnimatePresence mode="wait">
        {phase !== "done" && (
          <motion.div key="test" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {phase === "waiting" ? "Wait for the circle to turn blue…" :
               phase === "early" ? "Too early! Wait for blue…" :
               phase === "ready" ? "Click NOW!" : "Good!"}
            </p>

            <motion.button
              onClick={handleClick}
              animate={phase === "ready" ? {
                scale: [1, 1.08, 1.05],
                boxShadow: ["0 0 0px #6B9EFF", "0 0 50px #6B9EFF", "0 0 30px #6B9EFF"],
              } : {}}
              transition={{ duration: 0.3 }}
              style={{
                width: 160,
                height: 160,
                borderRadius: "50%",
                fontWeight: 700,
                fontSize: 20,
                transition: "all .15s",
                userSelect: "none",
                cursor: "pointer",
                border: "none",
                background: phase === "ready"
                  ? "#6B9EFF"
                  : phase === "early"
                  ? "rgba(107,158,255,0.2)"
                  : "rgba(255,255,255,0.08)",
                color: phase === "ready" ? "#FFFFFF" : phase === "early" ? "#6B9EFF" : "rgba(255,255,255,0.5)",
              }}
            >
              {phase === "waiting" ? "⏳" : phase === "ready" ? "NOW!" : phase === "early" ? "Early!" : "✓"}
            </motion.button>

            {lastMs !== null && phase === "clicked" && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <p style={{ color: "#6B9EFF", fontWeight: 700, fontSize: 24 }}>{lastMs}ms</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  {lastMs <= 250 ? "Excellent!" : lastMs <= 400 ? "Good" : lastMs <= 600 ? "Average" : "Slow"}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>Reaction test complete ✓</p>
            <div style={{ display: "flex", gap: 12 }}>
              {times.map((t, i) => (
                <div key={i} style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  background: "#1A3447",
                  border: "2px solid #243B4E",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Trial {i + 1}</div>
                  <div style={{ fontWeight: 700, color: "#6B9EFF", fontSize: 15 }}>{t}ms</div>
                </div>
              ))}
            </div>
            {avgMs && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Average: {avgMs}ms</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
