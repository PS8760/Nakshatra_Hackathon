"use client";
/**
 * TriageModal — Pre-Session Voice-Enabled Intake
 * ================================================
 * Asks 3 questions before the session starts:
 *   1. How do you feel today? (mood)
 *   2. Did you experience pain after yesterday's session?
 *   3. Rate your current pain (1–10) + which joint
 *
 * Features:
 * - Web Speech API reads each question aloud
 * - Speech-to-Text captures verbal answers (no typing needed)
 * - Returns a SessionConfig from POST /triage/intake
 * - Dynamic timer limit set from config.duration_s
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { submitTriage } from "@/lib/api";

export interface SessionConfig {
  session_type: string;
  label: string;
  emoji: string;
  duration_min: number;
  duration_s: number;
  angle_target_pct: number;
  rep_target: number;
  intensity: string;
  focus: string;
  color: string;
  description: string;
  voice_intro: string;
  physio_flag: boolean;
  physio_flag_reason: string;
  new_pain_area: boolean;
}

interface Props {
  onComplete: (config: SessionConfig) => void;
  onSkip: () => void;
}

const MOODS = [
  { id: "great",   label: "Great",   emoji: "😄", color: "#22c55e" },
  { id: "good",    label: "Good",    emoji: "🙂", color: "#0fffc5" },
  { id: "neutral", label: "Okay",    emoji: "😐", color: "#eab308" },
  { id: "tired",   label: "Tired",   emoji: "😴", color: "#f97316" },
  { id: "bad",     label: "Bad",     emoji: "😣", color: "#ef4444" },
];

const YESTERDAY = [
  { id: "good",       label: "Good",       emoji: "✅" },
  { id: "okay",       label: "Okay",       emoji: "➡️" },
  { id: "bad",        label: "Painful",    emoji: "❌" },
  { id: "no_session", label: "No session", emoji: "⏭️" },
];

const JOINTS = [
  { id: "none",           label: "No pain" },
  { id: "knee_left",      label: "Knee (L)" },
  { id: "knee_right",     label: "Knee (R)" },
  { id: "shoulder_left",  label: "Shoulder (L)" },
  { id: "shoulder_right", label: "Shoulder (R)" },
  { id: "elbow_left",     label: "Elbow (L)" },
  { id: "elbow_right",    label: "Elbow (R)" },
  { id: "hip_left",       label: "Hip (L)" },
  { id: "hip_right",      label: "Hip (R)" },
];

// ── Web Speech helpers ────────────────────────────────────────────────────────
function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1.05;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

function startListening(
  onResult: (transcript: string) => void,
  onEnd: () => void,
): (() => void) | null {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) { onEnd(); return null; }
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: any) => onResult(e.results[0][0].transcript.toLowerCase());
  rec.onend = onEnd;
  rec.start();
  return () => rec.stop();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TriageModal({ onComplete, onSkip }: Props) {
  const [step,        setStep]        = useState(0);   // 0=mood 1=yesterday 2=pain 3=loading 4=result
  const [mood,        setMood]        = useState("neutral");
  const [yesterday,   setYesterday]   = useState("okay");
  const [painLevel,   setPainLevel]   = useState(0);
  const [painJoint,   setPainJoint]   = useState("none");
  const [notes,       setNotes]       = useState("");
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState("");
  const [config,      setConfig]      = useState<SessionConfig | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const stopListenRef = useRef<(() => void) | null>(null);

  // Speak question when step changes
  useEffect(() => {
    const questions = [
      "How do you feel today? Select your mood.",
      "How was yesterday's session? Did you experience any pain?",
      "Rate your current pain from 0 to 10. Say a number or use the slider.",
    ];
    if (step < 3) speak(questions[step]);
  }, [step]);

  const handleVoiceListen = useCallback(() => {
    setListening(true);
    setTranscript("");
    stopListenRef.current = startListening(
      (t) => {
        setTranscript(t);
        // Parse verbal answer for pain level
        if (step === 2) {
          const num = t.match(/\b([0-9]|10)\b/);
          if (num) setPainLevel(parseInt(num[1]));
        }
      },
      () => setListening(false),
    );
  }, [step]);

  const stopListening = useCallback(() => {
    stopListenRef.current?.();
    setListening(false);
  }, []);

  const handleSubmit = async () => {
    setStep(3);
    setSubmitting(true);
    try {
      const res = await submitTriage({
        pain_intensity:       painLevel,
        yesterday_experience: yesterday,
        pain_joint:           painJoint,
        mood,
        notes,
      });
      setConfig(res.data);
      setStep(4);
      // Speak the personalised intro
      speak(res.data.voice_intro);
    } catch {
      setConfig(null);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  };

  const painColor = painLevel >= 7 ? "#ef4444" : painLevel >= 4 ? "#eab308" : "#22c55e";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(2,18,43,0.92)", backdropFilter: "blur(14px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(15,255,197,0.2)",
        borderRadius: 24, overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Top accent */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#0fffc5,#60a5fa,#0fffc5)" }} />

        <div style={{ padding: "24px 24px 20px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 11, color: "#0fffc5", fontWeight: 700, letterSpacing: ".08em",
                textTransform: "uppercase", marginBottom: 4 }}>
                Pre-Session Check-In
              </p>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e8f4f0" }}>
                {step === 0 && "How do you feel today?"}
                {step === 1 && "Yesterday's experience?"}
                {step === 2 && "Current pain level?"}
                {step === 3 && "Personalising your session…"}
                {step === 4 && (config ? `${config.emoji} ${config.label}` : "Session Ready")}
              </h2>
            </div>
            <button onClick={onSkip} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,244,240,0.4)", borderRadius: 8, padding: "5px 12px",
              fontSize: 12, cursor: "pointer",
            }}>Skip</button>
          </div>

          {/* Step 0 — Mood */}
          {step === 0 && (
            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {MOODS.map(m => (
                  <button key={m.id} onClick={() => setMood(m.id)} style={{
                    flex: 1, minWidth: 70, padding: "12px 8px", borderRadius: 12,
                    cursor: "pointer", transition: "all .15s",
                    background: mood === m.id ? `${m.color}20` : "rgba(255,255,255,0.04)",
                    border: `2px solid ${mood === m.id ? m.color : "rgba(255,255,255,0.08)"}`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  }}>
                    <span style={{ fontSize: 22 }}>{m.emoji}</span>
                    <span style={{ fontSize: 11, color: mood === m.id ? m.color : "rgba(232,244,240,0.5)", fontWeight: 600 }}>
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} style={{
                width: "100%", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer",
              }}>Next →</button>
            </div>
          )}

          {/* Step 1 — Yesterday */}
          {step === 1 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                {YESTERDAY.map(y => (
                  <button key={y.id} onClick={() => setYesterday(y.id)} style={{
                    padding: "14px", borderRadius: 12, cursor: "pointer", transition: "all .15s",
                    background: yesterday === y.id ? "rgba(15,255,197,0.1)" : "rgba(255,255,255,0.04)",
                    border: `2px solid ${yesterday === y.id ? "#0fffc5" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{ fontSize: 20 }}>{y.emoji}</span>
                    <span style={{ fontSize: 13, color: yesterday === y.id ? "#0fffc5" : "rgba(232,244,240,0.6)", fontWeight: 600 }}>
                      {y.label}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(0)} style={{
                  flex: 1, padding: "13px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(232,244,240,0.5)", cursor: "pointer",
                }}>← Back</button>
                <button onClick={() => setStep(2)} style={{
                  flex: 2, padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer",
                }}>Next →</button>
              </div>
            </div>
          )}

          {/* Step 2 — Pain level */}
          {step === 2 && (
            <div>
              {/* Pain slider */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: "rgba(232,244,240,0.5)" }}>No pain</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: painColor }}>{painLevel}/10</span>
                  <span style={{ fontSize: 12, color: "rgba(232,244,240,0.5)" }}>Severe</span>
                </div>
                <input type="range" min={0} max={10} value={painLevel}
                  onChange={e => setPainLevel(Number(e.target.value))}
                  style={{ width: "100%", accentColor: painColor }} />
              </div>

              {/* Joint selector */}
              {painLevel > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 8,
                    textTransform: "uppercase", letterSpacing: ".06em" }}>Which joint?</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {JOINTS.map(j => (
                      <button key={j.id} onClick={() => setPainJoint(j.id)} style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                        background: painJoint === j.id ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${painJoint === j.id ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                        color: painJoint === j.id ? "#ef4444" : "rgba(232,244,240,0.5)",
                        fontWeight: painJoint === j.id ? 700 : 400,
                      }}>{j.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Voice input */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={listening ? stopListening : handleVoiceListen} style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                  background: listening ? "rgba(239,68,68,0.15)" : "rgba(15,255,197,0.08)",
                  border: `1px solid ${listening ? "rgba(239,68,68,0.3)" : "rgba(15,255,197,0.2)"}`,
                  color: listening ? "#ef4444" : "#0fffc5", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  {listening ? "🔴 Listening…" : "🎤 Say your pain level"}
                </button>
              </div>
              {transcript && (
                <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 12 }}>
                  Heard: "{transcript}"
                </p>
              )}

              {/* Notes */}
              <textarea
                placeholder="Any notes? (optional)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)", color: "#e8f4f0",
                  borderRadius: 10, padding: "10px 12px", fontSize: 12,
                  outline: "none", resize: "none", marginBottom: 16, boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setStep(1)} style={{
                  flex: 1, padding: "13px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(232,244,240,0.5)", cursor: "pointer",
                }}>← Back</button>
                <button onClick={handleSubmit} style={{
                  flex: 2, padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer",
                }}>Personalise Session →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Loading */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", margin: "0 auto 16px",
                border: "3px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5",
                animation: "spinCW .8s linear infinite" }} />
              <p style={{ fontSize: 14, color: "rgba(232,244,240,0.5)" }}>
                Analysing your intake data…
              </p>
            </div>
          )}

          {/* Step 4 — Result */}
          {step === 4 && config && (
            <div>
              {/* Session type card */}
              <div style={{
                background: `${config.color}12`,
                border: `1px solid ${config.color}40`,
                borderRadius: 14, padding: "16px 18px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{config.emoji}</span>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 800, color: config.color }}>{config.label}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.5)" }}>{config.description}</p>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {[
                    { label: "Duration",  value: `${config.duration_min} min` },
                    { label: "Intensity", value: config.intensity },
                    { label: "Focus",     value: config.focus },
                  ].map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)",
                      borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <p style={{ fontSize: 9, color: "rgba(232,244,240,0.4)", textTransform: "uppercase",
                        letterSpacing: ".06em", marginBottom: 3 }}>{s.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: config.color,
                        textTransform: "capitalize" }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physio flag */}
              {config.physio_flag && (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                  display: "flex", gap: 8,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🩺</span>
                  <p style={{ fontSize: 12, color: "#ef4444", lineHeight: 1.4 }}>
                    {config.physio_flag_reason}
                  </p>
                </div>
              )}

              <button onClick={() => onComplete(config)} style={{
                width: "100%", padding: "14px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                background: config.color, color: "#02182b", border: "none", cursor: "pointer",
                boxShadow: `0 0 24px ${config.color}40`,
              }}>
                ▶ Start {config.label}
              </button>
            </div>
          )}

          {/* Step 4 — fallback if API failed */}
          {step === 4 && !config && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "rgba(232,244,240,0.5)", marginBottom: 16 }}>
                Could not personalise session. Starting standard session.
              </p>
              <button onClick={onSkip} style={{
                padding: "13px 32px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: "#0fffc5", color: "#02182b", border: "none", cursor: "pointer",
              }}>Start Session</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
