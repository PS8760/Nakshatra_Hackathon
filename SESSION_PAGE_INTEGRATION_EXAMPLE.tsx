// Example: How to integrate enhanced 3D coach into session page
// Add this to frontend/app/session/page.tsx

"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createSession, endSession, logPainEvent } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLang } from "@/context/LangContext";
import type { JointName } from "@/types";

const PoseCamera = dynamic(() => import("@/components/session/PoseCamera"), { ssr: false });
const PhysioGuide = dynamic(() => import("@/components/session/PhysioGuide"), { ssr: false });

export default function SessionPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { t } = useLang();

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [repCounts, setRepCounts] = useState<Partial<Record<JointName, number>>>({});
  const [feedback, setFeedback] = useState<{ message: string; status: string } | null>(null);
  const [physScores, setPhysScores] = useState<number[]>([]);
  const [ending, setEnding] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ NEW: Add detailed feedback state
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
      const currentToken = token || localStorage.getItem("nr_token");
      if (!currentToken) {
        alert("⚠️ Not Signed In\n\nPlease sign in first");
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
      alert("❌ Failed to start session");
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
  }, []);

  // ✅ NEW: Handle detailed feedback
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

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ color: "#e8f4f0" }}>Authentication Required</h2>
          <button onClick={() => router.push("/auth")}>Go to Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 20, paddingBottom: 40 }}>
        {/* Session Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Physical Rehabilitation</p>
            <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>Track A — Joint Recovery</p>
          </div>
          {isActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontFamily: "monospace", fontWeight: 700 }}>{fmt(elapsed)}</span>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 300px", gap: 16 }}>
          
          {/* Camera Column */}
          <div>
            {isActive && sessionId && token ? (
              <PoseCamera
                sessionId={sessionId}
                token={token}
                preset="full"
                onRepComplete={handleRepComplete}
                onFeedback={handleFeedback}
                onFormScore={(score) => setPhysScores(prev => [...prev.slice(-50), score])}
                onDetailedFeedback={handleDetailedFeedback}  // ✅ NEW!
              />
            ) : (
              <div style={{
                aspectRatio: "16/9",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(15,255,197,0.1)",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <p style={{ color: "rgba(232,244,240,0.4)" }}>Camera starts when session begins</p>
              </div>
            )}

            {/* Feedback Banner */}
            {feedback && isActive && (
              <div style={{
                marginTop: 12,
                padding: "12px 16px",
                borderRadius: 12,
                background: `${feedback.status === "good" ? "#22c55e" : "#ef4444"}15`,
                border: `1px solid ${feedback.status === "good" ? "#22c55e" : "#ef4444"}40`
              }}>
                <p style={{ fontSize: 14, color: feedback.status === "good" ? "#22c55e" : "#ef4444" }}>
                  {feedback.message}
                </p>
              </div>
            )}
          </div>

          {/* PhysioGuide Column */}
          <PhysioGuide
            exercise="full"
            isActive={isActive}
            repCount={totalReps}
            feedback={feedback}
            formScore={physScores.length ? physScores[physScores.length - 1] : null}
            detailedFeedback={detailedFeedback}  // ✅ NEW!
          />

          {/* Controls Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(15,255,197,0.1)",
              borderRadius: 16,
              padding: "20px"
            }}>
              {!isActive ? (
                <button
                  onClick={handleStart}
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    borderRadius: 12,
                    background: "#0fffc5",
                    color: "#02182b",
                    fontWeight: 700,
                    fontSize: 15,
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  ▶ Start Session
                </button>
              ) : (
                <div>
                  <div style={{ textAlign: "center", marginBottom: 16 }}>
                    <p style={{ fontSize: 36, fontFamily: "monospace", fontWeight: 800 }}>{fmt(elapsed)}</p>
                  </div>

                  <div style={{
                    background: "rgba(15,255,197,0.06)",
                    border: "1px solid rgba(15,255,197,0.12)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    textAlign: "center",
                    marginBottom: 14
                  }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#0fffc5" }}>{totalReps}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>Total reps</p>
                  </div>

                  <button
                    onClick={handleEnd}
                    disabled={ending}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 10,
                      background: ending ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: ending ? "rgba(232,244,240,0.4)" : "#ef4444",
                      cursor: ending ? "not-allowed" : "pointer",
                      fontWeight: 700
                    }}
                  >
                    {ending ? "Saving…" : "■ End Session"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
