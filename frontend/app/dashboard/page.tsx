"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getDashboard, getDashboardSummary, getCognitiveLatestScores } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

const RecoveryChart = dynamic(() => import("@/components/dashboard/RecoveryChart"), { ssr: false });

interface DashboardData {
  user: { id: number; name: string; role: string };
  latest_recovery_score: number | null;
  total_sessions: number;
  recent_sessions: any[];
  recovery_trend: any[];
}

function ScoreRing({ score, size = 110 }: { score: number | null | undefined; size?: number }) {
  const pct = score ?? 0;
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#6B9EFF" : pct >= 50 ? "#6B9EFF" : pct > 0 ? "#6B9EFF" : "#374151";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 1.2s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>{score != null ? score.toFixed(0) : "—"}</span>
        <span style={{ fontSize: 9, color: "rgba(232,244,240,0.35)", marginTop: 2 }}>/ 100</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, color = "var(--tertiary)", onClick }: {
  label: string; value: string | number; sub?: string; icon: string; color?: string; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      background: "#1A3447", border: "1px solid var(--border)",
      borderRadius: 16, padding: "20px 20px 18px",
      cursor: onClick ? "pointer" : "default",
      transition: "all .3s cubic-bezier(.4,0,.2,1)",
      position: "relative", overflow: "hidden",
    }}
      onMouseEnter={(e) => { 
        if (onClick) { 
          const el = e.currentTarget as HTMLElement; 
          el.style.borderColor = color; 
          el.style.background = "var(--neutral)"; 
          el.style.transform = "translateY(-4px) scale(1.02)";
          el.style.boxShadow = `0 8px 24px ${color}20`;
        } 
      }}
      onMouseLeave={(e) => { 
        if (onClick) { 
          const el = e.currentTarget as HTMLElement; 
          el.style.borderColor = "var(--border)"; 
          el.style.background = "#FFFFFF"; 
          el.style.transform = "translateY(0) scale(1)";
          el.style.boxShadow = "none";
        } 
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)`, opacity: .3 }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</p>
        <span style={{ fontSize: 18, transition: "transform 0.3s" }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2) rotate(10deg)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1) rotate(0deg)")}
        >{icon}</span>
      </div>
      <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 4, transition: "transform 0.3s" }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [cogScores, setCogScores] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    useAuthStore.getState().hydrate();
    Promise.all([
      getDashboard(),
      getDashboardSummary().catch(() => ({ data: { summary: "" } })),
      getCognitiveLatestScores().catch(() => ({ data: {} })),
    ]).then(([dash, ai, cog]) => {
      setData(dash.data);
      setAiSummary(ai.data.summary || "");
      setCogScores(cog.data);
    }).catch(() => router.push("/auth"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F2E", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(107,158,255,0.2)", borderTopColor: "#6B9EFF", animation: "spinCW 1s linear infinite" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const score = data?.latest_recovery_score;
  const scoreColor = score == null ? "#6b7280" : score >= 70 ? "#6B9EFF" : score >= 50 ? "#6B9EFF" : "#6B9EFF";
  const scoreLabel = score == null ? "No data yet" : score >= 70 ? "Excellent 🎯" : score >= 50 ? "Good progress 💪" : "Keep going 🔥";
  const firstName = (data?.user.name ?? user?.full_name ?? "").split(" ")[0];

  const cogTests = [
    { key: "memory",   label: "Memory",   icon: "🧩", color: "var(--primary)" },
    { key: "reaction", label: "Reaction", icon: "⚡", color: "var(--secondary)" },
    { key: "pattern",  label: "Pattern",  icon: "🔷", color: "var(--tertiary)" },
    { key: "attention",label: "Attention",icon: "👁️", color: "#6B9EFF" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#FFFFFF", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 32, paddingBottom: 56 }}>

        {/* Welcome header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, letterSpacing: "-.025em", marginBottom: 6 }}>
              Welcome back, {firstName} 👋
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-light)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/session" className="btn-solid" style={{ fontSize: 13, padding: "10px 20px", borderRadius: 10 }}>
              ▶ Start Session
            </Link>
            <Link href="/cognitive-tests" style={{
              fontSize: 13, padding: "10px 20px", borderRadius: 10, fontWeight: 600,
              background: "rgba(96,125,139,0.12)", border: "1px solid rgba(96,125,139,0.3)",
              color: "var(--secondary)", textDecoration: "none", transition: "all .2s",
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(96,125,139,0.2)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(96,125,139,0.12)"; }}
            >🧠 Cognitive Test</Link>
          </div>
        </div>

        {/* AI Summary banner */}
        {aiSummary && (
          <div style={{
            background: "rgba(0,191,165,0.05)", border: "1px solid rgba(0,191,165,0.15)",
            borderRadius: 14, padding: "16px 20px", marginBottom: 24,
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🤖</span>
            <div>
              <p style={{ fontSize: 12, color: "var(--tertiary)", fontWeight: 600, marginBottom: 4, letterSpacing: ".06em", textTransform: "uppercase" }}>AI Insight</p>
              <p style={{ fontSize: 14, color: "var(--text-light)", lineHeight: 1.6 }}>{aiSummary}</p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }} className="stats-grid">
          <div style={{
            background: "#1A3447", border: "1px solid var(--border)",
            borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg,transparent,var(--primary),transparent)", opacity: .3 }} />
            <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: ".08em", textTransform: "uppercase" }}>Recovery Score</p>
            <ScoreRing score={score} />
            <p style={{ fontSize: 12, color: scoreColor, fontWeight: 600 }}>{scoreLabel}</p>
          </div>

          <StatCard label="Total Sessions" value={data?.total_sessions ?? 0} sub="completed" icon="🏃" color="var(--tertiary)"
            onClick={() => router.push("/history")} />

          <StatCard
            label="Last Session"
            value={data?.recent_sessions[0] ? new Date(data.recent_sessions[0].started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
            sub={data?.recent_sessions[0]?.duration_s ? `${Math.floor(data.recent_sessions[0].duration_s / 60)}m` : "No sessions yet"}
            icon="📅" color="var(--secondary)"
          />

          <StatCard
            label="Cognitive Tests"
            value={cogScores ? Object.values(cogScores).filter((v: any) => v.score !== null).length : 0}
            sub="of 4 completed"
            icon="🧠" color="var(--primary)"
            onClick={() => router.push("/cognitive-tests")}
          />
        </div>

        {/* Main content grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }} className="dash-main">

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Recovery trend chart */}
            <div style={{ background: "#1A3447", border: "1px solid var(--border)", borderRadius: 16, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Recovery Trend</h2>
                <Link href="/history" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>View all →</Link>
              </div>
              <RecoveryChart data={data?.recovery_trend ?? []} />
            </div>

            {/* Cognitive scores */}
            <div style={{ background: "#1A3447", border: "1px solid var(--border)", borderRadius: 16, padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>Cognitive Performance</h2>
                <Link href="/cognitive-tests" style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", background: "rgba(0,94,184,0.1)", padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(0,94,184,0.2)" }}>
                  Take Tests →
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {cogTests.map((t) => {
                  const s = cogScores?.[t.key]?.score;
                  const pct = s ?? 0;
                  return (
                    <div key={t.key} style={{
                      background: "var(--neutral)", border: "1px solid var(--border)",
                      borderRadius: 12, padding: "14px 16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{t.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t.label}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: s != null ? t.color : "var(--text-muted)" }}>
                          {s != null ? `${s.toFixed(0)}` : "—"}
                        </span>
                      </div>
                      <div style={{ height: 4, background: "var(--neutral-dark)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: t.color, borderRadius: 2, transition: "width 1s ease", boxShadow: `0 0 8px ${t.color}60` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Quick actions */}
            <div style={{ background: "#1A3447", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
              <h2 style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 14 }}>Quick Actions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { icon: "🏃", label: "Start Physical Session", href: "/session",         color: "var(--tertiary)" },
                  { icon: "🧠", label: "Cognitive Tests",         href: "/cognitive-tests", color: "var(--secondary)" },
                  { icon: "💬", label: "AI Physiotherapist",      href: "/chatbot",         color: "#6B9EFF" },
                  { icon: "📄", label: "Download Report",         href: "/reports",         color: "var(--primary)" },
                  { icon: "📋", label: "Session History",         href: "/history",         color: "var(--tertiary)" },
                ].map((a) => (
                  <Link key={a.href} href={a.href} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 10, textDecoration: "none",
                    background: "var(--neutral)", border: "1px solid var(--border)",
                    transition: "all .2s",
                  }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = `${a.color}10`; el.style.borderColor = `${a.color}30`; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--neutral)"; el.style.borderColor = "var(--border)"; }}
                  >
                    <span style={{ fontSize: 18 }}>{a.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-light)" }}>{a.label}</span>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto", opacity: .4 }}>
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent sessions */}
            <div style={{ background: "#1A3447", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>Recent Sessions</h2>
                <Link href="/history" style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "none" }}>All →</Link>
              </div>

              {!data?.recent_sessions.length ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <p style={{ fontSize: 28, marginBottom: 8 }}>🏃</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No sessions yet</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {data.recent_sessions.slice(0, 5).map((s) => {
                    const sc = s.recovery_score;
                    const c = sc >= 70 ? "#6B9EFF" : sc >= 50 ? "#6B9EFF" : "#6B9EFF";
                    return (
                      <div key={s.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "9px 12px", borderRadius: 9,
                        background: "var(--neutral)", border: "1px solid var(--border)",
                      }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
                            {new Date(s.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                            {s.duration_s ? `${Math.floor(s.duration_s / 60)}m` : "—"} · {s.type}
                          </p>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: c }}>{sc != null ? sc.toFixed(0) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .dash-main { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px)  { .stats-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 480px)  { .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
