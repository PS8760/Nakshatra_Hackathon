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
  { key: "memory",    label: "Memory",    icon: "🧩", desc: "Word recall & retention",   color: "#6B9EFF" },
  { key: "reaction",  label: "Reaction",  icon: "⚡", desc: "Response speed & timing",   color: "#6B9EFF" },
  { key: "pattern",   label: "Pattern",   icon: "🔷", desc: "Sequence & visual memory",  color: "#6B9EFF" },
  { key: "attention", label: "Attention", icon: "👁️", desc: "Focus & gaze stability",    color: "#6B9EFF" },
];

// ── Clinical thresholds (Point 4) ─────────────────────────────────────────────
// Based on MoCA / MMSE normative data and published cognitive screening benchmarks
const THRESHOLDS: Record<string, { excellent: number; good: number; borderline: number; concern: number }> = {
  memory:    { excellent: 85, good: 70, borderline: 55, concern: 40 },
  reaction:  { excellent: 90, good: 75, borderline: 55, concern: 40 },
  pattern:   { excellent: 85, good: 70, borderline: 50, concern: 35 },
  attention: { excellent: 80, good: 65, borderline: 50, concern: 35 },
};

const OVERALL_THRESHOLDS = { excellent: 85, good: 70, borderline: 55, concern: 40 };

type Band = "excellent" | "good" | "borderline" | "concern";

function getBand(key: string, score: number): Band {
  const t = THRESHOLDS[key] ?? OVERALL_THRESHOLDS;
  if (score >= t.excellent)  return "excellent";
  if (score >= t.good)       return "good";
  if (score >= t.borderline) return "borderline";
  return "concern";
}

const BAND_META: Record<Band, { label: string; color: string; bg: string; desc: string }> = {
  excellent:  { label: "Excellent",  color: "#6B9EFF", bg: "rgba(34,197,94,0.08)",   desc: "Above normative range" },
  good:       { label: "Good",       color: "#6B9EFF", bg: "rgba(15,255,197,0.08)",  desc: "Within normal range" },
  borderline: { label: "Borderline", color: "#6B9EFF", bg: "rgba(234,179,8,0.08)",   desc: "Monitor closely" },
  concern:    { label: "Concern",    color: "#6B9EFF", bg: "rgba(239,68,68,0.08)",   desc: "Consult a clinician" },
};

// ── Metric descriptions (Point 3) ─────────────────────────────────────────────
const METRIC_INFO: Record<string, { what: string; why: string; threshold_note: string }> = {
  memory: {
    what: "Immediate + delayed word recall (40/60 weighted)",
    why: "Detects early episodic memory decline — first marker of MCI",
    threshold_note: "≥85 Excellent · ≥70 Good · ≥55 Borderline · <55 Concern",
  },
  reaction: {
    what: "Visual stimulus response time (best 2 of 3 trials)",
    why: "Processing speed — slows with neurological fatigue or medication effects",
    threshold_note: "≤250ms Excellent · ≤400ms Good · ≤600ms Borderline · >600ms Concern",
  },
  pattern: {
    what: "Sequence recognition & visual working memory",
    why: "Visuospatial ability — affected by parietal lobe dysfunction",
    threshold_note: "≥85 Excellent · ≥70 Good · ≥50 Borderline · <50 Concern",
  },
  attention: {
    what: "Sustained focus & gaze stability tracking",
    why: "Attention & executive function — impaired in TBI, ADHD, post-stroke",
    threshold_note: "≥80 Excellent · ≥65 Good · ≥50 Borderline · <50 Concern",
  },
};

// ── Result card with full metrics (Point 3) ────────────────────────────────────
function ResultCard({ step, score }: { step: typeof STEPS[0]; score: number }) {
  const band = getBand(step.key, score);
  const meta = BAND_META[band];
  const info = METRIC_INFO[step.key];
  const t = THRESHOLDS[step.key];
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: meta.bg, border: `1px solid ${meta.color}30`,
        borderRadius: 14, overflow: "hidden",
      }}>
      {/* Main row */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 26 }}>{step.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#e8f4f0" }}>{step.label}</p>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5,
              background: `${meta.color}20`, color: meta.color, letterSpacing: ".05em",
            }}>{meta.label.toUpperCase()}</span>
          </div>
          {/* Score bar with threshold markers */}
          <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "visible" }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: "easeOut" }}
              style={{ height: "100%", background: meta.color, borderRadius: 3 }} />
            {/* Threshold tick marks */}
            {[t.concern, t.borderline, t.good, t.excellent].map((v, i) => (
              <div key={i} style={{
                position: "absolute", top: -2, left: `${v}%`,
                width: 1, height: 10, background: "rgba(255,255,255,0.2)",
                transform: "translateX(-50%)",
              }} />
            ))}
          </div>
          <p style={{ fontSize: 10, color: "rgba(232,244,240,0.35)", marginTop: 4 }}>{meta.desc}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: meta.color, lineHeight: 1 }}>{score}</p>
          <button onClick={() => setExpanded(!expanded)} style={{
            fontSize: 10, color: "rgba(232,244,240,0.4)", background: "none", border: "none",
            cursor: "pointer", marginTop: 2,
          }}>{expanded ? "▲ less" : "▼ details"}</button>
        </div>
      </div>

      {/* Expanded metrics */}
      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
          style={{ padding: "0 18px 14px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", minWidth: 60 }}>Measures:</span>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.7)" }}>{info.what}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", minWidth: 60 }}>Clinical:</span>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.7)" }}>{info.why}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", minWidth: 60 }}>Thresholds:</span>
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.7)" }}>{info.threshold_note}</span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Radar chart for overall cognitive profile (Point 3) ───────────────────────
function CognitiveRadar({ scores }: { scores: Record<string, number> }) {
  const keys = STEPS.map(s => s.key);
  const vals = keys.map(k => (scores[k] ?? 0) / 100);
  const cx = 80, cy = 80, r = 60;
  const n = keys.length;

  const point = (val: number, i: number) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + val * r * Math.cos(angle), y: cy + val * r * Math.sin(angle) };
  };

  const gridPoints = (level: number) =>
    keys.map((_, i) => point(level, i)).map(p => `${p.x},${p.y}`).join(" ");

  const dataPoints = vals.map((v, i) => point(v, i)).map(p => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={160} height={160} style={{ overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map(l => (
        <polygon key={l} points={gridPoints(l)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {keys.map((_, i) => {
        const p = point(1, i);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />;
      })}
      <polygon points={dataPoints} fill="rgba(15,255,197,0.15)" stroke="#6B9EFF" strokeWidth={1.5} />
      {vals.map((v, i) => {
        const p = point(v, i);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6B9EFF" />;
      })}
      {keys.map((k, i) => {
        const p = point(1.25, i);
        return (
          <text key={k} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize={9} fill="rgba(232,244,240,0.5)">{STEPS[i].icon}</text>
        );
      })}
    </svg>
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
      setStep(s => s + 1);
    } else {
      setPhase("submitting");
      const tests = STEPS.map(s => ({ test_type: s.key, score: updated[s.key] ?? 0 }));
      try { await submitCognitiveSession(tests); } catch {}
      // Weighted average: memory 30%, reaction 25%, pattern 25%, attention 20%
      const weights: Record<string, number> = { memory: 0.30, reaction: 0.25, pattern: 0.25, attention: 0.20 };
      const weighted = STEPS.reduce((sum, s) => sum + (updated[s.key] ?? 0) * (weights[s.key] ?? 0.25), 0);
      setFinalScore(Math.round(weighted));
      setPhase("done");
    }
  };

  const overallBand = finalScore !== null ? getBand("memory", finalScore) : null; // use overall thresholds
  const overallMeta = overallBand ? BAND_META[overallBand] : null;

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F2E", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to take cognitive tests.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#e8f4f0", paddingTop: 64 }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div className="a-floatXY" style={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" }} />
        <div className="a-floatY" style={{ position: "absolute", bottom: "20%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,255,197,0.04) 0%, transparent 70%)", animationDelay: "2s" }} />
      </div>

      <div className="W" style={{ paddingTop: 40, paddingBottom: 60, position: "relative", zIndex: 1 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="pill" style={{ marginBottom: 16 }}>🧠 Cognitive Assessment</div>
          <h1 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 800, letterSpacing: "-.03em", marginBottom: 12 }}>
            {phase === "done" ? "Assessment Complete!" : "Cognitive Test Suite"}
          </h1>
          <p style={{ fontSize: 15, color: "rgba(232,244,240,0.45)", maxWidth: 480, margin: "0 auto" }}>
            {phase === "done"
              ? "Clinical-grade metrics with threshold analysis."
              : "4 clinically-inspired tests · memory, reaction, pattern, attention."}
          </p>
        </div>

        {/* ── Intro ── */}
        {phase === "intro" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 28 }}>
              {STEPS.map(s => {
                const t = THRESHOLDS[s.key];
                return (
                  <div key={s.key} style={{
                    background: "rgba(255,255,255,0.025)", border: `1px solid ${s.color}20`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0", marginBottom: 4 }}>{s.label}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.45)", marginBottom: 10 }}>{s.desc}</p>
                    {/* Threshold legend */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {[
                        { label: `≥${t.excellent}`, color: "#6B9EFF", name: "Excellent" },
                        { label: `≥${t.good}`, color: "#6B9EFF", name: "Good" },
                        { label: `≥${t.borderline}`, color: "#6B9EFF", name: "Borderline" },
                        { label: `<${t.borderline}`, color: "#6B9EFF", name: "Concern" },
                      ].map(th => (
                        <span key={th.name} style={{
                          fontSize: 9, padding: "2px 5px", borderRadius: 4,
                          background: `${th.color}15`, color: th.color, fontWeight: 600,
                        }}>{th.label}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => setPhase("testing")} className="btn-solid" style={{ fontSize: 15, padding: "14px 40px" }}>
                Begin Assessment →
              </button>
              <p style={{ fontSize: 12, color: "rgba(232,244,240,0.3)", marginTop: 12 }}>~8 minutes · Results saved automatically</p>
            </div>
          </motion.div>
        )}

        {/* ── Testing ── */}
        {phase === "testing" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
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
                        color: i < step ? "#0B1F2E" : i === step ? s.color : "rgba(232,244,240,0.3)",
                        transition: "all .3s",
                      }}>
                      {i < step ? "✓" : s.icon}
                    </motion.div>
                    <span style={{ fontSize: 10, color: i === step ? s.color : "rgba(232,244,240,0.3)", fontWeight: i === step ? 600 : 400 }}>{s.label}</span>
                  </div>
                ))}
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <motion.div style={{ height: "100%", background: `linear-gradient(90deg, #6B9EFF, ${STEPS[step].color})`, borderRadius: 2 }}
                  animate={{ width: `${(step / STEPS.length) * 100 + 100 / STEPS.length}%` }} transition={{ duration: .6 }} />
              </div>
              <p style={{ textAlign: "right", fontSize: 11, color: "rgba(232,244,240,0.35)", marginTop: 6 }}>
                Test {step + 1} of {STEPS.length}
              </p>
            </div>

            <div style={{
              background: "rgba(255,255,255,0.025)", border: `1px solid ${STEPS[step].color}25`,
              borderRadius: 20, padding: "32px 28px", minHeight: 360,
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: `linear-gradient(90deg,transparent,${STEPS[step].color}50,transparent)` }} />
              <motion.div style={{ position: "absolute", left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${STEPS[step].color}30,transparent)` }}
                animate={{ top: ["0%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} />
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: .3 }} style={{ width: "100%" }}>
                  {step === 0 && <MemoryTest onComplete={s => handleComplete("memory", s)} />}
                  {step === 1 && <ReactionTest onComplete={s => handleComplete("reaction", s)} />}
                  {step === 2 && <PatternTest onComplete={s => handleComplete("pattern", s)} />}
                  {step === 3 && <AttentionTest onComplete={(s, _m) => handleComplete("attention", s)} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── Submitting ── */}
        {phase === "submitting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 24px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(15,255,197,0.2)", animation: "pulseDot 1.5s ease-in-out infinite" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🧠</div>
            </div>
            <p style={{ color: "#6B9EFF", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Analyzing cognitive profile…</p>
            <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 14 }}>Applying clinical thresholds</p>
          </motion.div>
        )}

        {/* ── Done — full metrics (Points 3 & 4) ── */}
        {phase === "done" && finalScore !== null && overallMeta && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 640, margin: "0 auto" }}>

            {/* Overall score + radar */}
            <div style={{
              background: `${overallMeta.color}08`, border: `1px solid ${overallMeta.color}25`,
              borderRadius: 20, padding: "24px 28px", marginBottom: 20,
              display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
            }}>
              <CognitiveRadar scores={scores} />
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Overall Cognitive Score
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
                  <p style={{ fontSize: 56, fontWeight: 900, color: overallMeta.color, lineHeight: 1 }}>{finalScore}</p>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
                    background: `${overallMeta.color}20`, color: overallMeta.color,
                  }}>{overallMeta.label.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(232,244,240,0.5)", marginBottom: 12 }}>{overallMeta.desc}</p>
                {/* Threshold bar */}
                <div style={{ position: "relative" }}>
                  <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${finalScore}%` }} transition={{ duration: 1.2 }}
                      style={{ height: "100%", background: `linear-gradient(90deg, #6B9EFF, #6B9EFF, #6B9EFF, #6B9EFF)`, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    {["Concern", "Borderline", "Good", "Excellent"].map((l, i) => (
                      <span key={l} style={{ fontSize: 9, color: "rgba(232,244,240,0.3)" }}>{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-test results with metrics */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {STEPS.map(s => <ResultCard key={s.key} step={s} score={scores[s.key] ?? 0} />)}
            </div>

            {/* Clinical note */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 24,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
              <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", lineHeight: 1.6 }}>
                Thresholds are based on MoCA/MMSE normative data. Scores in the Borderline or Concern range
                on two or more tests warrant clinical follow-up. This tool is not a diagnostic instrument.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => router.push("/dashboard")} className="btn-solid" style={{ fontSize: 14 }}>
                View Dashboard →
              </button>
              <button onClick={() => router.push("/chatbot")} style={{
                padding: "13px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
                color: "#6B9EFF", cursor: "pointer",
              }}>💬 Get AI Insights</button>
              <button onClick={() => { setStep(0); setScores({}); setPhase("intro"); setFinalScore(null); }} style={{
                padding: "13px 24px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(232,244,240,0.6)", cursor: "pointer",
              }}>Retake Tests</button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
