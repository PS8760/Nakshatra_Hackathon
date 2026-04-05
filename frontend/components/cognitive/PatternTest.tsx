"use client";
import { useState, useRef } from "react";
import { sleep } from "@/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onComplete: (score: number) => void;
}

const COLORS = ["#09ffd3", "#6B9EFF", "#6B9EFF", "#6B9EFF"];
const MAX_ROUNDS = 7; // More rounds = better discrimination (was 5)

// Scoring: each round completed = points, weighted by difficulty
// Round 1 = 8pts, Round 2 = 12pts, ... harder rounds worth more
function computeScore(roundsCompleted: number, totalRounds: number): number {
  if (roundsCompleted === 0) return 5; // attempted but failed immediately
  // Progressive scoring: later rounds worth more
  let points = 0;
  for (let r = 1; r <= roundsCompleted; r++) {
    points += 5 + r * 3; // round 1=8, 2=11, 3=14, 4=17, 5=20, 6=23, 7=26
  }
  const maxPoints = Array.from({ length: totalRounds }, (_, i) => 5 + (i + 1) * 3).reduce((a, b) => a + b, 0);
  return Math.round(Math.min(100, (points / maxPoints) * 100));
}

export default function PatternTest({ onComplete }: Props) {
  const [phase, setPhase] = useState<"intro" | "showing" | "input" | "feedback" | "done">("intro");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [failed, setFailed] = useState(false);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const doneRef = useRef(false);

  async function showSequence(seq: number[]) {
    setPhase("showing");
    setUserSeq([]);
    setWrongIdx(null);
    await sleep(500);
    for (const idx of seq) {
      setLit(idx);
      await sleep(Math.max(400, 700 - seq.length * 30)); // speed up as sequence grows
      setLit(null);
      await sleep(250);
    }
    setPhase("input");
  }

  function startGame() {
    const first = [Math.floor(Math.random() * 4)];
    setSequence(first);
    setRound(1);
    showSequence(first);
  }

  function handleTile(idx: number) {
    if (phase !== "input") return;
    const next = [...userSeq, idx];

    // Flash the tile
    setLit(idx);
    setTimeout(() => setLit(null), 180);

    const pos = next.length - 1;

    if (next[pos] !== sequence[pos]) {
      // Wrong tile — show feedback then end
      setWrongIdx(idx);
      setFailed(true);
      setPhase("feedback");
      setTimeout(() => {
        const score = computeScore(round - 1, MAX_ROUNDS);
        setPhase("done");
        if (!doneRef.current) { doneRef.current = true; onComplete(score); }
      }, 1200);
      return;
    }

    setUserSeq(next);

    if (next.length === sequence.length) {
      if (round >= MAX_ROUNDS) {
        setPhase("done");
        if (!doneRef.current) { doneRef.current = true; onComplete(100); }
        return;
      }
      // Correct — next round
      setPhase("feedback");
      setTimeout(() => {
        const nextSeq = [...sequence, Math.floor(Math.random() * 4)];
        setSequence(nextSeq);
        setRound((r) => r + 1);
        showSequence(nextSeq);
      }, 600);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center", width: "100%" }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF" }}>🔷 Pattern Test</h2>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 400 }}>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.6 }}>
              Watch the tiles light up in sequence, then repeat the exact order. Sequences get longer each round.
            </p>
            <button onClick={startGame}
              style={{
                padding: "14px 36px",
                borderRadius: 8,
                background: "#6B9EFF",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 16,
                border: "none",
                cursor: "pointer",
                transition: "all .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = "translateY(0)"}
            >
              Start
            </button>
          </motion.div>
        )}

        {(phase === "showing" || phase === "input" || phase === "feedback") && (
          <motion.div key="game" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {/* Round indicator */}
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: MAX_ROUNDS }, (_, i) => (
                <div key={i} style={{
                  height: 6,
                  borderRadius: 3,
                  transition: "all .3s",
                  width: i < round - 1 ? 16 : i === round - 1 ? 16 : 8,
                  background: i < round - 1 ? "#6B9EFF" : i === round - 1 ? "rgba(107,158,255,0.6)" : "rgba(255,255,255,0.1)",
                }} />
              ))}
            </div>

            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              {phase === "showing" ? `Watch the sequence (${sequence.length} tiles)…` :
               phase === "feedback" && !failed ? "✓ Correct!" :
               phase === "feedback" && failed ? "✗ Wrong tile" :
               `Your turn — repeat ${userSeq.length}/${sequence.length}`}
            </p>

            {/* 2×2 grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[0, 1, 2, 3].map((idx) => (
                <motion.button
                  key={idx}
                  onClick={() => handleTile(idx)}
                  disabled={phase !== "input"}
                  animate={
                    lit === idx ? { scale: 1.08 } :
                    wrongIdx === idx ? { scale: [1, 1.1, 0.95, 1] } :
                    { scale: 1 }
                  }
                  transition={{ duration: 0.15 }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 8,
                    border: "3px solid",
                    transition: "all .1s",
                    cursor: phase === "input" ? "pointer" : "default",
                    backgroundColor: lit === idx
                      ? COLORS[idx]
                      : wrongIdx === idx
                      ? `${COLORS[idx]}40`
                      : `${COLORS[idx]}18`,
                    borderColor: lit === idx
                      ? COLORS[idx]
                      : wrongIdx === idx
                      ? COLORS[idx]
                      : `${COLORS[idx]}40`,
                    boxShadow: lit === idx ? `0 0 28px ${COLORS[idx]}90` : "none",
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            {failed ? (
              <p style={{ color: "#6B9EFF", fontSize: 16 }}>Reached round {round} of {MAX_ROUNDS}</p>
            ) : (
              <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16 }}>All {MAX_ROUNDS} rounds complete! ✓</p>
            )}
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Pattern test complete</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
