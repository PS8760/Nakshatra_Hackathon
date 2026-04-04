"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createSession, endSession, logPainEvent } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLang } from "@/context/LangContext";
import type { JointName } from "@/types";

const PoseCamera   = dynamic(() => import("@/components/session/PoseCamera"),   { ssr: false });
const PhysioGuide  = dynamic(() => import("@/components/session/PhysioGuide"),  { ssr: false });

/* ── Joint selector ─────────────────────────────────────────────────────── */
const JOINT_PRESETS = [
  { id: "full",     label: "Full Body",    joints: undefined,                                                    icon: "🏃" },
  { id: "knee",     label: "Knee Rehab",   joints: ["knee_left", "knee_right"] as JointName[],                  icon: "🦵" },
  { id: "shoulder", label: "Shoulder",     joints: ["shoulder_left", "shoulder_right"] as JointName[],          icon: "💪" },
  { id: "hip",      label: "Hip",          joints: ["hip_left", "hip_right"] as JointName[],                    icon: "🦴" },
  { id: "wrist",    label: "Wrist",        joints: ["wrist_left", "wrist_right"] as JointName[],                icon: "🤚" },
  { id: "ankle",    label: "Ankle",        joints: ["ankle_left", "ankle_right"] as JointName[],                icon: "🦶" },
  { id: "finger",   label: "Finger",       joints: ["finger_left", "finger_right"] as JointName[],              icon: "🖐️" },
];

/* ── Pain modal ─────────────────────────────────────────────────────────── */
function PainModal({ onLog, onClose }: { onLog: (joint: string, intensity: number) => void; onClose: () => void }) {
  const [joint, setJoint] = useState("knee_left");
  const [intensity, setIntensity] = useState(5);
  const joints = ["knee_left","knee_right","shoulder_left","shoulder_right","elbow_left","elbow_right","hip_left","hip_right"];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(2,24,43,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#031e35", border: "1px solid rgba(15,255,197,0.2)",
        borderRadius: 20, padding: "28px 28px", width: "100%", maxWidth: 360,
        boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Top glow */}
        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.3),transparent)", marginBottom: 24 }} />

        <h3 style={{ fontWeight: 700, fontSize: 17, color: "#e8f4f0", marginBottom: 20 }}>🚨 Log Pain Event</h3>

        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: "rgba(232,244,240,0.5)", letterSpacing: ".06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Joint</label>
          <select value={joint} onChange={(e) => setJoint(e.target.value)} style={{
            width: "100%", background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(15,255,197,0.15)", color: "#e8f4f0",
            borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none",
          }}>
            {joints.map((j) => <option key={j} value={j} style={{ background: "#031e35" }}>{j.replace("_", " ")}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: "rgba(232,244,240,0.5)", letterSpacing: ".06em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
            Intensity: <span style={{ color: intensity >= 7 ? "#ef4444" : intensity >= 4 ? "#eab308" : "#22c55e" }}>{intensity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} style={{ width: "100%", accentColor: "#0fffc5" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(232,244,240,0.3)", marginTop: 4 }}>
            <span>Mild</span><span>Moderate</span><span>Severe</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { onLog(joint, intensity); onClose(); }} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 700,
            background: "#ef4444", color: "#fff", border: "none", cursor: "pointer",
          }}>Log Pain</button>
          <button onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
            background: "rgba(255,255,255,0.05)", color: "rgba(232,244,240,0.7)",
            border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detailed feedback for real-time form correction
  const [detailedFeedback, setDetailedFeedback] = useState<{
    joint: string;
    currentAngle: number;
    targetAngle: number;
    deviation: number;
    correction: string;
  } | null>(null);

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
      // Ensure token is loaded
      const currentToken = token || localStorage.getItem("nr_token");
      if (!currentToken) {
        alert("⚠️ Not Signed In\n\nPlease sign in first:\n\n📧 Email: demo@neurorestore.ai\n🔑 Password: Demo@1234\n\nClick OK to go to sign-in page.");
        router.push("/auth");
        return;
      }
      
      const res = await createSession("physical");
      setSessionId(res.data.id);
      setIsActive(true);
      setStartTime(Date.now());
      setRepCounts({});
      setPhysScores([]);
    } catch (error: any) {
      console.error("Session creation error:", error);
      
      // Check if it's a 401 error
      if (error?.response?.status === 401) {
        alert("🔐 Authentication Error\n\nYour session has expired or you're not signed in.\n\nPlease sign in again:\n\n📧 Email: demo@neurorestore.ai\n🔑 Password: Demo@1234\n\nClick OK to go to sign-in page.");
        // Clear invalid token
        localStorage.removeItem("nr_token");
        localStorage.removeItem("nr_user");
        router.push("/auth");
        return;
      }
      
      const errorMsg = error?.response?.data?.detail || error?.message || "Unknown error";
      alert(`❌ Failed to start session\n\n${errorMsg}\n\nPlease check:\n✓ Backend is running (http://localhost:8000)\n✓ You are signed in\n✓ Check browser console for details`);
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

  const handleRepComplete = useCallback((joint: string, angle: number, repCount: number) => {
    setRepCounts((prev) => ({ ...prev, [joint]: repCount }));
    setPhysScores((prev) => [...prev.slice(-50), Math.min(100, (angle / 120) * 100)]);
  }, []);

  const handleFeedback = useCallback((message: string, status: string) => {
    setFeedback({ message, status });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const handleDetailedFeedback = useCallback((feedback: {
    joint: string;
    currentAngle: number;
    targetAngle: number;
    deviation: number;
    correction: string;
  }) => {
    setDetailedFeedback(feedback);
    // Clear after PhysioGuide processes it
    setTimeout(() => setDetailedFeedback(null), 500);
  }, []);

  const handlePainLog = async (joint: string, intensity: number) => {
    if (!sessionId) return;
    try { await logPainEvent(sessionId, joint, intensity); } catch {}
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h2 style={{ color: "#e8f4f0", fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            Authentication Required
          </h2>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 24, lineHeight: 1.6 }}>
            Please sign in to start a rehabilitation session.
          </p>
          
          <div style={{ 
            background: "rgba(15,255,197,0.05)", 
            border: "1px solid rgba(15,255,197,0.15)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            textAlign: "left"
          }}>
            <p style={{ color: "#0fffc5", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Demo Credentials:
            </p>
            <div style={{ fontSize: 13, color: "rgba(232,244,240,0.7)", lineHeight: 1.8 }}>
              <div>📧 Email: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>demo@neurorestore.ai</code></div>
              <div>🔑 Password: <code style={{ background: "rgba(0,0,0,0.3)", padding: "2px 8px", borderRadius: 4 }}>Demo@1234</code></div>
            </div>
          </div>

          <button onClick={() => router.push("/auth")} style={{
            padding: "14px 32px", borderRadius: 12, background: "#0fffc5",
            color: "#02182b", fontWeight: 700, border: "none", cursor: "pointer",
            fontSize: 15, boxShadow: "0 0 24px rgba(15,255,197,0.3)",
            transition: "all .2s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(15,255,197,0.5)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(15,255,197,0.3)"; }}
          >
            Go to Sign In →
          </button>
          
          <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12, marginTop: 20 }}>
            Tip: Click "Patient demo" button on the sign-in page for quick access
          </p>
        </div>
      </div>
    );
  }

  const feedbackColor = feedback?.status === "good" ? "#22c55e" : feedback?.status === "warning" ? "#eab308" : feedback?.status === "out_of_range" ? "#ef4444" : "#0fffc5";

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      {showPain && <PainModal onLog={handlePainLog} onClose={() => setShowPain(false)} />}

      <div className="W" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {/* Back + session status bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.push("/dashboard")} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,244,240,0.6)", borderRadius: 8, padding: "6px 12px",
              fontSize: 13, cursor: "pointer", transition: "all .2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#e8f4f0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(232,244,240,0.6)"; }}
            >← Dashboard</button>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#e8f4f0" }}>Physical Rehabilitation</p>
              <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>Track A — Joint Recovery</p>
            </div>
          </div>
          {isActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulseDot 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 13, color: "#22c55e", fontWeight: 600 }}>LIVE</span>
              <span style={{ fontSize: 20, fontFamily: "monospace", fontWeight: 700, color: "#e8f4f0", marginLeft: 4 }}>{fmt(elapsed)}</span>
            </div>
          )}
        </div>
        {/* Preset selector — only before session starts */}
        {!isActive && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", marginBottom: 10, letterSpacing: ".06em", textTransform: "uppercase" }}>Select Exercise Focus</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {JOINT_PRESETS.map((p) => (
                <button key={p.id} onClick={() => setPreset(p)} style={{
                  padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", transition: "all .2s",
                  background: preset.id === p.id ? "rgba(15,255,197,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${preset.id === p.id ? "rgba(15,255,197,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: preset.id === p.id ? "#0fffc5" : "rgba(232,244,240,0.6)",
                }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 300px", gap: 16, alignItems: "start" }} className="session-grid">

          {/* Camera */}
          <div>
            {isActive && sessionId && token ? (
              <PoseCamera
                sessionId={sessionId}
                token={token}
                preset={preset.id}
                activeJoints={preset.joints}
                onRepComplete={handleRepComplete}
                onFeedback={handleFeedback}
                onFormScore={(score) => setPhysScores(prev => [...prev.slice(-50), score])}
                onDetailedFeedback={handleDetailedFeedback}
              />
            ) : (
              <div style={{
                aspectRatio: "16/9", background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(15,255,197,0.1)", borderRadius: 16,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 16,
              }}>
                <div style={{ fontSize: 48, opacity: .4 }}>📷</div>
                <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 14 }}>Camera starts when session begins</p>
                <p style={{ color: "rgba(232,244,240,0.25)", fontSize: 12 }}>Selected: {preset.icon} {preset.label}</p>
              </div>
            )}

            {/* Feedback banner */}
            {feedback && isActive && (
              <div style={{
                marginTop: 12, padding: "12px 16px", borderRadius: 12,
                background: `${feedbackColor}15`,
                border: `1px solid ${feedbackColor}40`,
                display: "flex", alignItems: "center", gap: 10,
                transition: "all .3s",
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: feedbackColor, flexShrink: 0 }} />
                <p style={{ fontSize: 14, color: feedbackColor, fontWeight: 500 }}>{feedback.message}</p>
              </div>
            )}
          </div>

          {/* Physio Guide — middle column */}
          <PhysioGuide
            exercise={preset.id === "full" ? "full" : preset.joints?.[0] ?? "full"}
            isActive={isActive}
            repCount={Object.values(repCounts).reduce((a, b) => a + (b ?? 0), 0)}
            feedback={feedback}
            formScore={physScores.length ? physScores[physScores.length - 1] : null}
            detailedFeedback={detailedFeedback}
          />

          {/* Right panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Main control card */}
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.1)",
              borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.25),transparent)" }} />

              {!isActive ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "rgba(232,244,240,0.45)", marginBottom: 16 }}>
                    Ready to start your {preset.label} session
                  </p>
                  <button onClick={handleStart} style={{
                    width: "100%", padding: "14px 0", borderRadius: 12,
                    background: "#0fffc5", color: "#02182b", fontWeight: 700,
                    fontSize: 15, border: "none", cursor: "pointer",
                    boxShadow: "0 0 24px rgba(15,255,197,0.3)",
                    transition: "all .2s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(15,255,197,0.5)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(15,255,197,0.3)"; }}
                  >
                    ▶ Start Session
                  </button>
                </div>
              ) : (
                <div>
                  {/* Timer */}
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <p style={{ fontSize: 36, fontFamily: "monospace", fontWeight: 800, color: "#e8f4f0", letterSpacing: ".05em" }}>{fmt(elapsed)}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.35)", marginTop: 2 }}>Session duration</p>
                  </div>

                  {/* Total reps */}
                  <div style={{
                    background: "rgba(15,255,197,0.06)", border: "1px solid rgba(15,255,197,0.12)",
                    borderRadius: 10, padding: "12px 16px", textAlign: "center", marginBottom: 14,
                  }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#0fffc5" }}>{totalReps}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>Total reps completed</p>
                  </div>

                  {/* Per-joint reps */}
                  {Object.entries(repCounts).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                      {Object.entries(repCounts).map(([joint, count]) => (
                        <div key={joint} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", background: "rgba(255,255,255,0.03)",
                          borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                        }}>
                          <span style={{ fontSize: 12, color: "rgba(232,244,240,0.55)", textTransform: "capitalize" }}>
                            {joint.replace("_", " ")}
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#0fffc5" }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setShowPain(true)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                      color: "#ef4444", cursor: "pointer", transition: "all .2s",
                    }}>🚨 Pain</button>
                    <button onClick={handleEnd} disabled={ending} style={{
                      flex: 2, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                      background: ending ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: ending ? "rgba(232,244,240,0.4)" : "#ef4444",
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
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "18px",
              }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "#e8f4f0", marginBottom: 14 }}>How it works</p>
                {[
                  ["1", "Stand 1–2m from camera, full body visible"],
                  ["2", "Perform your prescribed exercises"],
                  ["3", "AI tracks joint angles in real time"],
                  ["4", "Reps counted automatically"],
                  ["5", "Use 🚨 to log pain events"],
                ].map(([n, text]) => (
                  <div key={n} style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#0fffc5",
                    }}>{n}</span>
                    <p style={{ fontSize: 12, color: "rgba(232,244,240,0.5)", lineHeight: 1.5 }}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Colour guide */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16, padding: "18px",
            }}>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#e8f4f0", marginBottom: 12 }}>Colour Guide</p>
              {[
                ["#22c55e", "Within 5° of target"],
                ["#eab308", "Within 15° of target"],
                ["#ef4444", "More than 15° away"],
                ["#6b7280", "Landmark not visible"],
              ].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(232,244,240,0.5)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .session-grid { grid-template-columns: 1fr 300px !important; }
          .session-grid > div:nth-child(2) { display: none; }
        }
        @media (max-width: 768px) {
          .session-grid { grid-template-columns: 1fr !important; }
          .session-grid > div:nth-child(2) { display: none; }
        }
      `}</style>
    </div>
  );
}
