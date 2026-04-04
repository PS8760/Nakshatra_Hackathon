"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessions, getCognitiveHistory } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type Tab = "sessions" | "cognitive";

export default function HistoryPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<any[]>([]);
  const [cogHistory, setCogHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (!token) return;
    Promise.all([
      getSessions(),
      getCognitiveHistory().catch(() => ({ data: [] })),
    ]).then(([s, c]) => {
      setSessions(s.data);
      setCogHistory(c.data);
    }).finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to view history.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 32, paddingBottom: 56 }}>

        <div style={{ marginBottom: 28 }}>
          <div className="pill" style={{ marginBottom: 14 }}>📋 History</div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, letterSpacing: "-.025em" }}>Your Activity History</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["sessions", "🏃 Physical Sessions"], ["cognitive", "🧠 Cognitive Tests"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: tab === t ? "rgba(15,255,197,0.12)" : "transparent",
              border: tab === t ? "1px solid rgba(15,255,197,0.25)" : "1px solid transparent",
              color: tab === t ? "#0fffc5" : "rgba(232,244,240,0.5)",
              cursor: "pointer", transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5", animation: "spinCW 1s linear infinite" }} />
          </div>
        ) : tab === "sessions" ? (
          <div>
            {!sessions.length ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontSize: 40, marginBottom: 16 }}>🏃</p>
                <p style={{ fontSize: 16, color: "rgba(232,244,240,0.4)", marginBottom: 20 }}>No sessions yet</p>
                <Link href="/session" className="btn-solid">Start First Session</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sessions.map((s) => {
                  const sc = s.recovery_score;
                  const c = sc >= 70 ? "#22c55e" : sc >= 50 ? "#eab308" : "#ef4444";
                  return (
                    <div key={s.id} style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 14, padding: "16px 20px",
                      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                      transition: "all .2s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,255,197,0.15)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(15,255,197,0.08)", border: "1px solid rgba(15,255,197,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                          {s.session_type === "cognitive" ? "🧠" : "🏃"}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#e8f4f0", marginBottom: 3 }}>
                            {new Date(s.started_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)" }}>
                            {s.session_type} · {s.duration_s ? `${Math.floor(s.duration_s / 60)}m ${s.duration_s % 60}s` : "—"}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        {sc != null && (
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{sc.toFixed(0)}</p>
                            <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)" }}>score</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {!cogHistory.length ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontSize: 40, marginBottom: 16 }}>🧠</p>
                <p style={{ fontSize: 16, color: "rgba(232,244,240,0.4)", marginBottom: 20 }}>No cognitive tests yet</p>
                <Link href="/cognitive-tests" style={{ padding: "13px 28px", borderRadius: 10, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8", textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
                  Take First Test
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {cogHistory.map((s) => (
                  <div key={s.session_id} style={{
                    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "16px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#e8f4f0" }}>
                        {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      {s.cognitive_score != null && (
                        <span style={{ fontSize: 18, fontWeight: 800, color: s.cognitive_score >= 70 ? "#22c55e" : s.cognitive_score >= 50 ? "#eab308" : "#ef4444" }}>
                          {s.cognitive_score.toFixed(0)}/100
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {s.tests.map((t: any) => (
                        <div key={t.type} style={{
                          padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(232,244,240,0.6)",
                        }}>
                          {t.type}: <span style={{ color: "#0fffc5" }}>{t.score?.toFixed(0) ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
