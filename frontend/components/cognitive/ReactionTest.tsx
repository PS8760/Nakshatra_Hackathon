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
    <div className="flex flex-col items-center gap-5 text-center w-full">
      <h2 className="text-2xl font-bold">⚡ Reaction Test</h2>

      {/* Trial progress */}
      <div className="flex gap-2">
        {Array.from({ length: TRIALS }, (_, i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${
            i < times.length ? "bg-[#09ffd3]" : i === times.length ? "bg-[#09ffd3]/40 animate-pulse" : "bg-white/10"
          }`} />
        ))}
      </div>
      <p className="text-xs text-gray-500">Trial {Math.min(times.length + 1, TRIALS)} of {TRIALS}</p>

      <AnimatePresence mode="wait">
        {phase !== "done" && (
          <motion.div key="test" className="flex flex-col items-center gap-4">
            <p className="text-gray-400 text-sm">
              {phase === "waiting" ? "Wait for the circle to turn green…" :
               phase === "early" ? "Too early! Wait for green…" :
               phase === "ready" ? "Click NOW!" : "Good!"}
            </p>

            <motion.button
              onClick={handleClick}
              animate={phase === "ready" ? {
                scale: [1, 1.08, 1.05],
                boxShadow: ["0 0 0px #09ffd3", "0 0 50px #09ffd3", "0 0 30px #09ffd3"],
              } : {}}
              transition={{ duration: 0.3 }}
              className={`w-36 h-36 rounded-full font-bold text-lg transition-colors duration-150 select-none ${
                phase === "ready"
                  ? "bg-[#09ffd3] text-[#02182b]"
                  : phase === "early"
                  ? "bg-red-500/20 border-2 border-red-500/40 text-red-400"
                  : "bg-white/8 border-2 border-white/10 text-gray-500"
              }`}
            >
              {phase === "waiting" ? "⏳" : phase === "ready" ? "NOW!" : phase === "early" ? "Early!" : "✓"}
            </motion.button>

            {lastMs !== null && phase === "clicked" && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-1">
                <p className="text-[#09ffd3] font-bold text-xl">{lastMs}ms</p>
                <p className="text-xs text-gray-500">
                  {lastMs <= 250 ? "Excellent!" : lastMs <= 400 ? "Good" : lastMs <= 600 ? "Average" : "Slow"}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-3">
            <p className="text-[#09ffd3] font-semibold">Reaction test complete ✓</p>
            <div className="flex gap-3">
              {times.map((t, i) => (
                <div key={i} className="px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-center">
                  <div className="text-xs text-gray-500">Trial {i + 1}</div>
                  <div className="font-bold text-[#09ffd3] text-sm">{t}ms</div>
                </div>
              ))}
            </div>
            {avgMs && <p className="text-xs text-gray-500">Average: {avgMs}ms</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
