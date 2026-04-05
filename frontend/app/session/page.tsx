"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createSession, endSession, logPainEvent } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLang } from "@/context/LangContext";
import type { JointName } from "@/types";
import { shouldTriggerReferral } from "@/components/session/ReferralCard";

const PoseCamera   = dynamic(() => import("@/components/session/PoseCamera"),   { ssr: false });
const PhysioGuide  = dynamic(() => import("@/components/session/PhysioGuide"),  { ssr: false });
const ReferralCard = dynamic(() => import("@/components/session/ReferralCard"), { ssr: false });

/* ── Joint selector ─────────────────────────────────────────────────────── */
const JOINT_PRESETS = [
  { id: "full",     label: "Full Body",    joints: undefined,                                                    icon: "🏃" },
  { id: "knee",     label: "Knee Rehab",   joints: ["knee_left", "knee_right"] as JointName[],                  icon: "🦵" },
  { id: "shoulder", label: "Shoulder",     joints: ["shoulder_left", "shoulder_right"] as JointName[],          icon: "💪" },
  { id: "hip",      label: "Hip",          joints: ["hip_left", "hip_right"] as JointName[],                    icon: "🦴" },
];

/* ── Pain modal ─────────────────────────────────────────────────────────── */
function PainModal({ onLog, onClose }: { onLog: (joint: string, intensity: number) => void; onClose: () => void }) {
  const [joint, setJoint] = useState("knee_left");
  const [intensity, setIntensity] = useState(5);
  const joints = ["knee_left","knee_right","shoulder_left","shoulder_right","elbow_left","elbow_right","hip_left","hip_right"];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#FFFFFF", border: "1px solid var(--border)",
        borderRadius: 20, padding: "28px 28px", width: "100%", maxWidth: 360,
        boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
      }}>
        {/* Top glow */}
        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(239,68,68,.3),transparent)", marginBottom: 24 }} />

        <h3 style={{ fontWeight: 700, fontSize: 17, color: "var(--text)", marginBottom: 20 }}>🚨 Log Pain Event</h3>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: ".06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Joint</label>
          <select value={joint} onChange={(e) => setJoint(e.target.value)} style={{
            width: "100%", background: "var(--neutral)",
            border: "1px solid var(--border)", color: "var(--text)",
            borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none",
          }}>
            {joints.map((j) => <option key={j} value={j} style={{ background: "#FFFFFF" }}>{j.replace("_", " ")}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: ".06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Intensity: <span style={{ color: intensity >= 7 ? "#6B9EFF" : intensity >= 4 ? "#6B9EFF" : "#6B9EFF" }}>{intensity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--primary)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
            <span>Mild</span><span>Moderate</span><span>Severe</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { onLog(joint, intensity); onClose(); }} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: "#6B9EFF", color: "#fff", border: "none", cursor: "pointer",
          }}>Log Pain</button>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: "var(--neutral)", color: "var(--text-light)",
            border: "1px solid var(--border)", cursor: "pointer",
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main session page ──────────────────────────────────────────────────── */
export default function SessionPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { t } = useLang();

  const [sessionId,     setSessionId]     = useState<number | null>(null);
  const [isActive,      setIsActive]      = useState(false);
  const [startTime,     setStartTime]     = useState(0);
  const [elapsed,       setElapsed]       = useState(0);
  const [repCounts,     setRepCounts]     = useState<Partial<Record<JointName, number>>>({});
  const [feedback,      setFeedback]      = useState<{ message: string; status: string } | null>(null);
  const [physScores,    setPhysScores]    = useState<number[]>([]);
  const [showPain,      setShowPain]      = useState(false);
  const [preset,        setPreset]        = useState(JOINT_PRESETS[0]);
  const [ending,        setEnding]        = useState(false);
  const [referral,      setReferral]      = useState<{ trigger: "pain" | "posture_critical"; intensity?: number } | null>(null);
  const [sessionData,   setSessionData]   = useState<{
    repCount: number;
    avgFormScore: number | null;
    sessionTime: number;
    exercise: string;
    formScore: number | null;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { useAuthStore.getState().hydrate(); }, []);

  // Timer
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const totalReps = Object.values(repCounts).reduce((a, b) => a + (b ?? 0), 0);

  const handleStart = async () => {
    try {
      const res = await createSession("physical");
      setSessionId(res.data.id);
      setIsActive(true);
      setStartTime(Date.now());
      setRepCounts({});
      setPhysScores([]);
    } catch {
      alert("Failed to start session. Is the backend running?");
    }
  };

  const handleEnd = async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    const duration_s = Math.floor((Date.now() - startTime) / 1000);
    const avgPhysical = physScores.length ? physScores.reduce((a, b) => a + b, 0) / physScores.length : undefined;
    try { await endSession(sessionId, duration_s, avgPhysical); } catch {}
    setIsActive(false);
    setSessionId(null);
    setEnding(false);
    router.push("/dashboard");
  };

  const handleRepComplete = useCallback((joint: JointName, angle: number, repCount: number) => {
    setRepCounts((prev) => ({ ...prev, [joint]: repCount }));
    setPhysScores((prev) => [...prev.slice(-50), Math.min(100, (angle / 120) * 100)]);
  }, []);

  const handleFeedback = useCallback((message: string, status: string) => {
    setFeedback({ message, status });
    setTimeout(() => setFeedback(null), 4000);
    // Severity trigger: critical posture from AI → show referral
    if (status === "critical" && !referral) {
      setReferral({ trigger: "posture_critical" });
    }
  }, [referral]);

  const handlePainLog = async (joint: string, intensity: number) => {
    if (!sessionId) return;
    try { await logPainEvent(sessionId, joint, intensity); } catch {}
    // Severity trigger: pain > 7 → show referral
    if (shouldTriggerReferral(intensity)) {
      setReferral({ trigger: "pain", intensity });
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F2E", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>Please sign in to start a session.</p>
          <button onClick={() => router.push("/auth")} style={{
            padding: "10px 24px", borderRadius: 10, background: "var(--primary)",
            color: "#FFFFFF", fontWeight: 700, border: "none", cursor: "pointer",
          }}>Sign In</button>
        </div>
      </div>
    );
  }

  const feedbackColor = feedback?.status === "good" ? "#6B9EFF" : feedback?.status === "warning" ? "#6B9EFF" : feedback?.status === "out_of_range" ? "#6B9EFF" : "#6B9EFF";

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#FFFFFF", paddingTop: 64 }}>
      {showPain && <PainModal onLog={handlePainLog} onClose={() => setShowPain(false)} />}

      {referral && (
        <ReferralCard
          trigger={referral.trigger}
          painIntensity={referral.intensity}
          postureStatus={referral.trigger === "posture_critical" ? "critical" : undefined}
          onDismiss={() => setReferral(null)}
        />
      )}

      <div className="W" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {/* Back + session status bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/dashboard")} style={{
              background: "var(--neutral)", border: "1px solid var(--border)",
              color: "var(--text-light)", borderRadius: 8, padding: "6px 12px",
              fontSize: 13, cursor: "pointer", transition: "all .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-light)"; }}
            >← Dashboard</button>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Physical Rehabilitation</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Track A — Joint Recovery</p>
            </div>
          </div>
          {isActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6B9EFF", animation: "pulseDot 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 13, color: "#6B9EFF", fontWeight: 600 }}>LIVE</span>
              <span style={{ fontSize: 20, fontFamily: "monospace", fontWeight: 700, color: "var(--text)", marginLeft: 4 }}>{fmt(elapsed)}</span>
            </div>
          )}
        </div>
        {/* Preset selector — only before session starts */}
        {!isActive && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>Select Exercise Focus</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {JOINT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => setPreset(p)} style={{
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all .2s",
                  background: preset.id === p.id ? "rgba(0,94,184,0.12)" : "var(--neutral)",
                  border: `1px solid ${preset.id === p.id ? "var(--primary)" : "var(--border)"}`,
                  color: preset.id === p.id ? "var(--primary)" : "var(--text-light)",
                }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px 320px", gap: 24, alignItems: "start" }} className="session-grid">

          {/* Camera + Analysis Overlay */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Action buttons - above camera */}
            {isActive && (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => setShowPain(true)}
                  style={{
                    flex: "1 1 auto", minWidth: 140, background: "rgba(107,158,255,0.1)", backdropFilter: "blur(8px)",
                    border: "2px solid rgba(107,158,255,0.3)", borderRadius: 12,
                    padding: "14px 20px", color: "#6B9EFF", fontSize: 15, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  🚨 Pain
                </button>
                <button
                  onClick={handleEnd}
                  disabled={ending}
                  style={{
                    flex: "2 1 auto", minWidth: 180, background: ending ? "rgba(100,100,100,0.5)" : "rgba(107,158,255,0.1)",
                    backdropFilter: "blur(8px)",
                    border: "2px solid rgba(107,158,255,0.3)", borderRadius: 12,
                    padding: "14px 20px", color: ending ? "rgba(107,158,255,0.5)" : "#6B9EFF",
                    fontSize: 15, fontWeight: 600,
                    cursor: ending ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  ⏹ {ending ? "Ending..." : "End Session"}
                </button>
              </div>
            )}

            {/* Camera */}
            {isActive && sessionId && token ? (
              <PoseCamera
                sessionId={sessionId}
                token={token}
                preset={preset.id}
                activeJoints={preset.joints}
                onRepComplete={handleRepComplete}
                onFeedback={handleFeedback}
                onFormScore={(score) => setPhysScores(prev => [...prev.slice(-50), score])}
                onSessionData={setSessionData}
              />
            ) : (
              <div style={{
                aspectRatio: "16/9", background: "var(--neutral)",
                border: "1px solid var(--border)", borderRadius: 16,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 16,
              }}>
                <div style={{ fontSize: 48, opacity: .4 }}>📷</div>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Camera starts when session begins</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>Selected: {preset.icon} {preset.label}</p>
              </div>
            )}

            {/* Skeleton Guide - below camera */}
            {isActive && (
              <div style={{
                background: "#1A3447", backdropFilter: "blur(8px)",
                borderRadius: 12, padding: "18px 22px",
                border: "1px solid #243B4E",
              }}>
                <div style={{ fontSize: 14, color: "#FFFFFF", marginBottom: 14, fontWeight: 600 }}>
                  Skeleton Guide
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6B9EFF" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Good form</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6B9EFF" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Minor issue</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6B9EFF" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Correction needed</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6B9EFF" }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>All keypoints</span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback banner */}
            {feedback && isActive && (
              <div style={{
                padding: "14px 18px", borderRadius: 12,
                background: `${feedbackColor}15`,
                border: `2px solid ${feedbackColor}40`,
                display: "flex", alignItems: "center", gap: 12,
                transition: "all .3s",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: feedbackColor, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: feedbackColor, fontWeight: 600 }}>{feedback.message}</p>
              </div>
            )}
          </div>

          {/* Physio Guide — middle column - FULL HEIGHT */}
          <div style={{ 
            position: "sticky", 
            top: 84,
            height: "calc(100vh - 104px)",
            display: "flex",
            flexDirection: "column",
            minWidth: 280,
          }}>
            <PhysioGuide
              exercise={preset.id === "full" ? "full" : preset.joints?.[0] ?? "full"}
              isActive={isActive}
              repCount={Object.values(repCounts).reduce((a, b) => a + (b ?? 0), 0)}
              feedback={feedback}
              formScore={physScores.length ? physScores[physScores.length - 1] : null}
            />
          </div>

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 84 }}>

            {/* Main control card */}
            <div style={{
              background: "#1A3447", border: "2px solid #243B4E",
              borderRadius: 16, padding: "24px", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 2, background: "linear-gradient(90deg,transparent,rgba(107,158,255,.4),transparent)" }} />

              {!isActive ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 20 }}>
                    Ready to start your {preset.label} session
                  </p>
                  <button onClick={handleStart} style={{
                    width: "100%", padding: "16px 0", borderRadius: 12,
                    background: "#6B9EFF", color: "#FFFFFF", fontWeight: 700,
                    fontSize: 16, border: "none", cursor: "pointer",
                    boxShadow: "0 0 24px rgba(107,158,255,0.3)",
                    transition: "all .2s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(107,158,255,0.5)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(107,158,255,0.3)"; }}
                  >
                    ▶ Start Session
                  </button>
                </div>
              ) : (
                <div>
                  {/* Timer */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <p style={{ fontSize: 40, fontFamily: "monospace", fontWeight: 800, color: "#FFFFFF", letterSpacing: ".05em" }}>{fmt(elapsed)}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Session duration</p>
                  </div>

                  {/* Total reps */}
                  <div style={{
                    background: "rgba(107,158,255,0.1)", border: "2px solid rgba(107,158,255,0.2)",
                    borderRadius: 12, padding: "16px 20px", textAlign: "center", marginBottom: 16,
                  }}>
                    <p style={{ fontSize: 32, fontWeight: 800, color: "#6B9EFF" }}>{totalReps}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Total reps completed</p>
                  </div>

                  {/* Per-joint reps */}
                  {Object.entries(repCounts).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                      {Object.entries(repCounts).map(([joint, count]) => (
                        <div key={joint} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", background: "rgba(255,255,255,0.05)",
                          borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
                        }}>
                          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textTransform: "capitalize" }}>
                            {joint.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: "#6B9EFF" }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowPain(true)} style={{
                      flex: 1, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 600,
                      background: "rgba(107,158,255,0.1)", border: "2px solid rgba(107,158,255,0.3)",
                      color: "#6B9EFF", cursor: "pointer", transition: "all .2s",
                    }}>🚨 Pain</button>
                    <button onClick={handleEnd} disabled={ending} style={{
                      flex: 2, padding: "12px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
                      background: ending ? "rgba(255,255,255,0.05)" : "rgba(107,158,255,0.15)",
                      border: "2px solid rgba(107,158,255,0.4)",
                      color: ending ? "rgba(255,255,255,0.4)" : "#6B9EFF",
                      cursor: ending ? "not-allowed" : "pointer",
                    }}>
                      {ending ? "Saving…" : "■ End Session"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions card */}
            {!isActive && (
              <div style={{
                background: "#1A3447", border: "1px solid #243B4E",
                borderRadius: 16, padding: "20px",
              }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#FFFFFF", marginBottom: 16 }}>How it works</p>
                {[
                  ["1", "Stand 1–2m from camera, full body visible"],
                  ["2", "Perform your prescribed exercises"],
                  ["3", "AI tracks joint angles in real time"],
                  ["4", "Reps counted automatically"],
                  ["5", "Use 🚨 to log pain events"],
                ].map(([n, text]) => (
                  <div key={n} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(107,158,255,0.15)", border: "2px solid rgba(107,158,255,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "#6B9EFF",
                    }}>{n}</span>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Colour guide */}
            <div style={{
              background: "#1A3447", border: "1px solid #243B4E",
              borderRadius: 16, padding: "20px",
            }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#FFFFFF", marginBottom: 14 }}>Colour Guide</p>
              {[
                ["#6B9EFF", "Within 5° of target"],
                ["#6B9EFF", "Within 15° of target"],
                ["#6B9EFF", "More than 15° away"],
                ["#6b7280", "Landmark not visible"],
              ].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .session-grid { grid-template-columns: 1fr 320px !important; }
          .session-grid > div:nth-child(2) { display: none; }
        }
        @media (max-width: 900px) {
          .session-grid { grid-template-columns: 1fr !important; }
          .session-grid > div:nth-child(2) { display: none; }
          .session-grid > div:nth-child(3) { 
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: #0B1F2E;
            border-top: 2px solid #1A3447;
            padding: 16px;
            box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
            max-height: 50vh;
            overflow-y: auto;
          }
        }
        @media (max-width: 640px) {
          .session-grid > div:nth-child(3) {
            max-height: 60vh;
          }
        }
      `}</style>
    </div>
  );
}
