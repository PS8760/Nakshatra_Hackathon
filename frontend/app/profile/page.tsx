"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { getProgressSummary, getMilestones } from "@/lib/api";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const [progress, setProgress] = useState<any>(null);
  const [milestones, setMilestones] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (!token) router.push("/auth");
  }, [token, router]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getProgressSummary().catch(() => ({ data: null })),
      getMilestones().catch(() => ({ data: null })),
    ])
      .then(([p, m]) => {
        setProgress(p.data);
        setMilestones(m.data);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (!token || !user) return null;

  const initials = user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  const trendColor = progress?.trend === "improving" ? "#22c55e" : progress?.trend === "declining" ? "#ef4444" : "#6b7280";
  const trendIcon = progress?.trend === "improving" ? "📈" : progress?.trend === "declining" ? "📉" : "➡️";

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 40, paddingBottom: 56, maxWidth: 1000 }}>

        <div className="pill" style={{ marginBottom: 20 }}>👤 Profile</div>

        {/* Avatar card */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
          borderRadius: 20, padding: "32px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.25),transparent)" }} />
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(15,255,197,0.12)", border: "2px solid rgba(15,255,197,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "#0fffc5",
          }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8f4f0", marginBottom: 4 }}>{user.full_name}</h1>
            <p style={{ fontSize: 14, color: "rgba(232,244,240,0.5)", marginBottom: 6 }}>{user.email}</p>
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
              background: user.role === "clinician" ? "rgba(99,102,241,0.12)" : "rgba(15,255,197,0.08)",
              border: user.role === "clinician" ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(15,255,197,0.2)",
              color: user.role === "clinician" ? "#818cf8" : "#0fffc5",
              textTransform: "capitalize",
            }}>{user.role}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5", animation: "spinCW 1s linear infinite" }} />
          </div>
        ) : (
          <>
            {/* Progress Summary */}
            {progress && progress.total_sessions > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8f4f0", marginBottom: 14 }}>Progress Overview</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {/* Total Sessions */}
                  <div style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Sessions</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#0fffc5" }}>{progress.total_sessions}</p>
                  </div>

                  {/* Avg Score */}
                  {progress.avg_recovery_score && (
                    <div style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
                      borderRadius: 14, padding: "18px 20px",
                    }}>
                      <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Avg Recovery Score</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: "#0fffc5" }}>{progress.avg_recovery_score}<span style={{ fontSize: 14, color: "rgba(232,244,240,0.3)" }}>/100</span></p>
                    </div>
                  )}

                  {/* Trend */}
                  <div style={{
                    background: "rgba(255,255,255,0.025)", border: `1px solid ${trendColor}30`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>7-Day Trend</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{trendIcon}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: trendColor, textTransform: "capitalize" }}>{progress.trend}</span>
                      {progress.trend_percentage !== 0 && (
                        <span style={{ fontSize: 13, color: trendColor }}>({progress.trend_percentage > 0 ? "+" : ""}{progress.trend_percentage}%)</span>
                      )}
                    </div>
                  </div>

                  {/* Streak */}
                  {progress.streak_days > 0 && (
                    <div style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(234,179,8,0.3)",
                      borderRadius: 14, padding: "18px 20px",
                    }}>
                      <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Current Streak</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 24 }}>🔥</span>
                        <span style={{ fontSize: 28, fontWeight: 800, color: "#eab308" }}>{progress.streak_days}</span>
                        <span style={{ fontSize: 13, color: "rgba(232,244,240,0.4)" }}>days</span>
                      </div>
                    </div>
                  )}

                  {/* Total Reps */}
                  <div style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Total Reps</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: "#0fffc5" }}>{progress.total_reps.toLocaleString()}</p>
                  </div>

                  {/* Most Improved */}
                  {progress.most_improved_joint && (
                    <div style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: 14, padding: "18px 20px",
                    }}>
                      <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>Most Improved</p>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#22c55e", textTransform: "capitalize" }}>
                        {progress.most_improved_joint.joint.replace("_", " ")}
                      </p>
                      <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", marginTop: 2 }}>
                        +{progress.most_improved_joint.improvement_degrees}° ROM
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Milestones */}
            {milestones && milestones.milestones && milestones.milestones.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8f4f0", marginBottom: 14 }}>Achievements</h2>
                <div style={{
                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
                  borderRadius: 14, padding: "20px",
                }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {milestones.milestones.map((m: any, i: number) => (
                      <div key={i} style={{
                        background: "rgba(15,255,197,0.08)", border: "1px solid rgba(15,255,197,0.2)",
                        borderRadius: 10, padding: "10px 16px",
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontSize: 20 }}>{m.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0fffc5" }}>{m.title}</span>
                      </div>
                    ))}
                  </div>
                  {milestones.best_recovery_score && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", marginBottom: 4 }}>Personal Best</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: "#0fffc5" }}>
                        {milestones.best_recovery_score.toFixed(0)}/100
                        <span style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", fontWeight: 400, marginLeft: 8 }}>
                          {milestones.best_session_date && new Date(milestones.best_session_date).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quick links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "📊", label: "Progress Tracking",  href: "/dashboard",        color: "#0fffc5" },
            { icon: "📋", label: "Session History",     href: "/history",          color: "#60a5fa" },
            { icon: "🧠", label: "Cognitive Tests",     href: "/cognitive-tests",  color: "#818cf8" },
            { icon: "📄", label: "Download Reports",    href: "/reports",          color: "#34d399" },
            { icon: "💬", label: "AI Chatbot",          href: "/chatbot",          color: "#f59e0b" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 14, textDecoration: "none",
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
              transition: "all .2s",
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = `${item.color}10`; el.style.borderColor = `${item.color}30`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.025)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(232,244,240,0.75)" }}>{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto", opacity: .35 }}>
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}

          <button onClick={() => { logout(); router.push("/"); }} style={{
            padding: "14px 18px", borderRadius: 14, fontSize: 14, fontWeight: 600,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", cursor: "pointer", transition: "all .2s", marginTop: 4,
            display: "flex", alignItems: "center", gap: 14,
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
          >
            <span style={{ fontSize: 20 }}>🚪</span> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
