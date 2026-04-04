"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import MemoryTest from "@/components/cognitive/MemoryTest";
import ReactionTest from "@/components/cognitive/ReactionTest";
import PatternTest from "@/components/cognitive/PatternTest";
import AttentionTest from "@/components/cognitive/AttentionTest";
import { submitCognitiveSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const STEPS = [
  { key: "memory",   label: "Memory",   icon: "🧩", desc: "Word recall & retention",    color: "#0fffc5" },
  { key: "reaction", label: "Reaction", icon: "⚡", desc: "Response speed & timing",    color: "#6366f1" },
  { key: "pattern",  label: "Pattern",  icon: "🔷", desc: "Sequence & visual memory",   color: "#f59e0b" },
  { key: "attention",label: "Attention",icon: "👁️", desc: "Focus & gaze stability",     color: "#ec4899" },
];

function ResultCard({ step, score }: { step: typeof STEPS[0]; score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  return (
    <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}
      style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${step.color}30`,
        borderRadius: 14, padding: "16px 18px",
        display: "flex", alignItems: "center", gap: 14,
      }}>
      <span style={{ fontSize: 28 }}>{step.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f4f0", marginBottom: 6 }}>{step.label}</p>
        <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 2, transition: "width 1s ease" }} />
        </div>
      </div>
      <span style={{ fontSize: 22, fontWeight: 800, color, minWidth: 40, textAlign: "right" }}>{score}</span>
    </motion.div>
  );
}

export default function CognitiveTestsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<"intro" | "testing" | "submitting" | "done">("intro");
  const [finalScore, setFinalScore] = useState<number | null>(null);

  const handleComplete = async (key: string, score: number) => {
    const updated = { ...scores, [key]: score };
    setScores(updated);

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // All done — submit
      setPhase("submitting");
      const tests = STEPS.map((s) => ({
        test_type: s.key,
        score: updated[s.key] ?? 0,
      }));
      try {
        await submitCognitiveSession(tests);
      } catch {}
      const avg = Math.round(Object.values(updated).reduce((a, b) => a + b, 0) / Object.values(updated).length);
      setFinalScore(avg);
      setPhase("done");
    }
  };

  const progress = (step / STEPS.length) * 100;

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to take cognitive tests.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="a-floatXY" style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }} />
        <div className="a-floatY" style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,255,197,0.04) 0%, transparent 70%)", animationDelay: "2s" }} />
      </div>

      <div className="W" style={{ paddingTop: 40, paddingBottom: 60, position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="pill" style={{ marginBottom: 16 }}>🧠 Cognitive Assessment</div>
          <h1 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 12 }}>
            {phase === "done" ? "Assessment Complete!" : "Cognitive Test Suite"}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(232,244,240,0.45)", maxWidth: 480, margin: "0 auto" }}>
            {phase === "done"
              ? "Your results have been saved and analyzed by AI."
              : "4 clinically-inspired tests measuring memory, reaction, pattern recognition, and attention."}
          </p>
        </div>

        {/* Intro */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 32 }}>
              {STEPS.map((s) => (
                <div key={s.key} style={{
                  background: "rgba(255,255,255,0.025)", border: `1px solid ${s.color}20`,
                  borderRadius: 14, padding: "18px 20px",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "#e8f4f0", marginBottom: 4 }}>{s.label}</p>
                  <p style={{ fontSize: 12, color: "rgba(232,244,240,0.45)" }}>{s.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => setPhase("testing")} className="btn-solid" style={{ fontSize: 15, padding: "14px 40px" }}>
                Begin Assessment →
              </button>
              <p style={{ fontSize: 12, color: "rgba(232,244,240,0.3)", marginTop: 12 }}>~8 minutes · Results saved automatically</p>
            </div>
          </motion.div>
        )}

        {/* Testing */}
        {phase === "testing" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            {/* Step indicators */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                {STEPS.map((s, i) => (
                  <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <motion.div animate={i === step ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: .4 }}
                      style={{
                        width: 40, height: 40, borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700,
                        background: i < step ? s.color : i === step ? `${s.color}20` : "rgba(255,255,255,0.05)",
                        border: i === step ? `2px solid ${s.color}` : "2px solid transparent",
                        color: i < step ? "#02182b" : i === step ? s.color : "rgba(232,244,240,0.3)",
                        transition: "all .3s",
                      }}>
                      {i < step ? "✓" : s.icon}
                    </motion.div>
                    <span style={{ fontSize: 10, color: i === step ? s.color : "rgba(232,244,240,0.3)", fontWeight: i === step ? 600 : 400 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div style={{ height: "100%", background: `linear-gradient(90deg, #0fffc5, ${STEPS[step].color})`, borderRadius: 2 }}
                  animate={{ width: `${progress + (100 / STEPS.length)}%` }} transition={{ duration: .6 }} />
              </div>
              <p style={{ textAlign: "right", fontSize: 11, color: "rgba(232,244,240,0.35)", marginTop: 6 }}>
                Test {step + 1} of {STEPS.length}
              </p>
            </div>

            {/* Test card */}
            <div style={{
              background: "rgba(255,255,255,0.025)", border: `1px solid ${STEPS[step].color}25`,
              borderRadius: 20, padding: "32px 28px", minHeight: 360,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              {/* Top glow */}
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: `linear-gradient(90deg,transparent,${STEPS[step].color}50,transparent)` }} />
              {/* Scan line */}
              <motion.div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${STEPS[step].color}30,transparent)` }}
                animate={{ top: ["0%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />

              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: .3 }} style={{ width: "100%" }}>
                  {step === 0 && <MemoryTest onComplete={(s) => handleComplete("memory", s)} />}
                  {step === 1 && <ReactionTest onComplete={(s) => handleComplete("reaction", s)} />}
                  {step === 2 && <PatternTest onComplete={(s) => handleComplete("pattern", s)} />}
                  {step === 3 && <AttentionTest onComplete={(s, _m) => handleComplete("attention", s)} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Submitting */}
        {phase === "submitting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(15,255,197,0.2)", animation: "pulseDot 1.5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🧠</div>
            </div>
            <p style={{ color: "#0fffc5", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Analyzing your cognitive profile…</p>
            <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 14 }}>AI is processing your results</p>
          </motion.div>
        )}

        {/* Done */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 560, margin: "0 auto" }}>

            {/* Overall score */}
            <div style={{
              background: "rgba(15,255,197,0.06)", border: "1px solid rgba(15,255,197,0.2)",
              borderRadius: 20, padding: "28px", textAlign: "center", marginBottom: 24,
            }}>
              <p style={{ fontSize: 12, color: "rgba(15,255,197,0.7)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 12 }}>Overall Cognitive Score</p>
              <p style={{ fontSize: 64, fontWeight: 900, color: "#0fffc5", lineHeight: 1, marginBottom: 8 }}>{finalScore}</p>
              <p style={{ fontSize: 14, color: "rgba(232,244,240,0.5)" }}>
                {finalScore! >= 80 ? "Excellent cognitive performance 🎯" : finalScore! >= 60 ? "Good cognitive health 💪" : "Room for improvement — keep practicing 🔥"}
              </p>
            </div>

            {/* Per-test results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {STEPS.map((s) => (
                <ResultCard key={s.key} step={s} score={scores[s.key] ?? 0} />
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/dashboard")} className="btn-solid" style={{ fontSize: 14 }}>
                View Dashboard →
              </button>
              <button onClick={() => router.push("/chatbot")} style={{
                padding: "13px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                color: "#f59e0b", cursor: "pointer",
              }}>
                💬 Get AI Insights
              </button>
              <button onClick={() => { setStep(0); setScores({}); setPhase("intro"); setFinalScore(null); }} style={{
                padding: "13px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(232,244,240,0.6)", cursor: "pointer",
              }}>
                Retake Tests
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
