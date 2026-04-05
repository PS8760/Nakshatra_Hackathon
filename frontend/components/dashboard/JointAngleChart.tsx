"use client";
/**
 * JointAngleChart — per-user line plot of joint angle progress vs target
 * ========================================================================
 * - Fetches AFTER auth token is available (no premature 401)
 * - Line: achieved angle per session (with fill under curve)
 * - Dashed line: target ROM — the goal to beat
 * - Gold star ⭐ on the best session
 * - Accuracy % = (achieved / target) × 100 shown on Y2 axis
 * - Auto-refreshes when a session ends (localStorage signal)
 * - Works for every user independently
 */
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface SessionPoint {
  session_id: number;
  date: string;
  avg_angle: number;
  max_angle: number;
  target: number;
  reps: number;
  avg_deviation: number;
}

interface Stats {
  today_best: number | null;
  yesterday_best: number | null;
  total_gain: number | null;
  highlight_index: number | null;
  points: SessionPoint[];
}

const JOINTS = [
  { id: "knee_left",      label: "Knee (L)" },
  { id: "knee_right",     label: "Knee (R)" },
  { id: "elbow_left",     label: "Elbow (L)" },
  { id: "elbow_right",    label: "Elbow (R)" },
  { id: "shoulder_left",  label: "Shoulder (L)" },
  { id: "shoulder_right", label: "Shoulder (R)" },
  { id: "hip_left",       label: "Hip (L)" },
  { id: "hip_right",      label: "Hip (R)" },
];

function speakSummary(stats: Stats) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const best = stats.today_best ?? stats.points[stats.points.length - 1]?.max_angle;
  if (!best) return;
  const gain = stats.total_gain;
  let msg = `Great work! Your best angle is ${best} degrees.`;
  if (gain !== null && gain > 0)
    msg += ` You improved by ${gain} degrees. Keep it up!`;
  else if (gain !== null && gain < 0)
    msg += ` You are down ${Math.abs(gain)} degrees. Push a little further next session.`;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(msg);
  u.rate = 1.0; u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

export default function JointAngleChart({ onSessionEnd }: { onSessionEnd?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<any>(null);
  const { token } = useAuthStore();

  const [stats,   setStats]   = useState<Stats | null>(null);
  const [joint,   setJoint]   = useState("knee_left");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [spoken,  setSpoken]  = useState(false);

  // ── Fetch joint-progress for the logged-in user ───────────────────────────
  const fetchStats = useCallback(async (j: string) => {
    const tok = token || localStorage.getItem("nr_token");
    if (!tok) return;                          // wait for auth
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/analytics/joint-progress/${j}?limit=20`);
      const points: SessionPoint[] = res.data;

      if (!points.length) {
        setStats({ today_best: null, yesterday_best: null, total_gain: null,
                   highlight_index: null, points: [] });
        return;
      }

      // Today / yesterday best
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let todayBest: number | null = null;
      let yestBest:  number | null = null;

      points.forEach(p => {
        const d = new Date(p.date).toDateString();
        if (d === today    && (todayBest === null || p.max_angle > todayBest)) todayBest = p.max_angle;
        if (d === yesterday && (yestBest  === null || p.max_angle > yestBest))  yestBest  = p.max_angle;
      });

      const maxAngles = points.map(p => p.max_angle);
      const hiIdx = maxAngles.indexOf(Math.max(...maxAngles));

      let totalGain: number | null = null;
      if (todayBest !== null && yestBest !== null)
        totalGain = Math.round((todayBest - yestBest) * 10) / 10;
      else if (points.length >= 2)
        totalGain = Math.round((points[points.length-1].max_angle - points[0].max_angle) * 10) / 10;

      setStats({ today_best: todayBest, yesterday_best: yestBest,
                 total_gain: totalGain, highlight_index: hiIdx, points });
      setSpoken(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch when token arrives or joint changes
  useEffect(() => { fetchStats(joint); }, [joint, fetchStats, token]);

  // Refresh after session ends (localStorage signal from session/page.tsx)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "nr_session_ended") fetchStats(joint);
    };
    window.addEventListener("storage", handler);
    const last = localStorage.getItem("nr_session_ended");
    if (last) { localStorage.removeItem("nr_session_ended"); fetchStats(joint); }
    return () => window.removeEventListener("storage", handler);
  }, [joint, fetchStats]);

  // Also refresh when onSessionEnd prop changes (same-page signal)
  useEffect(() => { if (onSessionEnd) fetchStats(joint); }, [onSessionEnd, joint, fetchStats]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => fetchStats(joint), 60000);
    return () => clearInterval(id);
  }, [joint, fetchStats]);

  // ── Build Chart.js line plot ──────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !stats || stats.points.length === 0) return;

    const buildChart = async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      const pts = stats.points;
      const labels   = pts.map((p, i) => {
        const d = new Date(p.date);
        return isNaN(d.getTime()) ? `S${i+1}` : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      const maxAngles  = pts.map(p => p.max_angle);
      const meanAngles = pts.map(p => p.avg_angle);
      const targets    = pts.map(p => p.target);
      const accuracy   = pts.map(p => p.target > 0 ? Math.min(100, Math.round((p.max_angle / p.target) * 100)) : 0);

      // Gold star plugin
      const goldStarPlugin = {
        id: "goldStar",
        afterDatasetsDraw(chart: any) {
          if (stats.highlight_index === null) return;
          const meta = chart.getDatasetMeta(0);
          const pt = meta.data[stats.highlight_index];
          if (!pt) return;
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = "16px serif";
          ctx.textAlign = "center";
          ctx.fillText("⭐", pt.x, pt.y - 12);
          ctx.restore();
        },
      };

      const pointColors = maxAngles.map((_, i) =>
        i === stats.highlight_index ? "#f59e0b" : "#0fffc5"
      );
      const pointSizes = maxAngles.map((_, i) =>
        i === stats.highlight_index ? 8 : 4
      );

      const cfg: any = {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Max Angle (°)",
              data: maxAngles,
              borderColor: "#0fffc5",
              backgroundColor: "rgba(15,255,197,0.08)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointBackgroundColor: pointColors,
              pointBorderColor: pointColors,
              pointRadius: pointSizes,
              pointHoverRadius: 7,
              yAxisID: "y",
              order: 1,
            },
            {
              label: "Mean Angle (°)",
              data: meanAngles,
              borderColor: "rgba(96,165,250,0.7)",
              backgroundColor: "transparent",
              borderWidth: 1.5,
              borderDash: [4, 3],
              fill: false,
              tension: 0.35,
              pointRadius: 2,
              pointBackgroundColor: "rgba(96,165,250,0.7)",
              yAxisID: "y",
              order: 2,
            },
            {
              label: "Target ROM (°)",
              data: targets,
              borderColor: "rgba(239,68,68,0.8)",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [8, 4],
              fill: false,
              tension: 0,
              pointRadius: 0,
              yAxisID: "y",
              order: 3,
            },
            {
              label: "Accuracy (%)",
              data: accuracy,
              borderColor: "rgba(167,139,250,0.6)",
              backgroundColor: "transparent",
              borderWidth: 1.5,
              borderDash: [2, 3],
              fill: false,
              tension: 0.3,
              pointRadius: 2,
              pointBackgroundColor: "rgba(167,139,250,0.6)",
              yAxisID: "y2",
              order: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700, easing: "easeOutQuart" },
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              labels: {
                color: "rgba(232,244,240,0.5)",
                font: { size: 10 },
                boxWidth: 10,
                padding: 14,
              },
            },
            tooltip: {
              backgroundColor: "rgba(2,24,43,0.95)",
              borderColor: "rgba(15,255,197,0.2)",
              borderWidth: 1,
              titleColor: "#e8f4f0",
              bodyColor: "rgba(232,244,240,0.65)",
              padding: 10,
              callbacks: {
                label: (ctx: any) => {
                  const v = ctx.parsed.y;
                  if (ctx.dataset.label?.includes("Accuracy"))
                    return ` Accuracy: ${v}%`;
                  return ` ${ctx.dataset.label}: ${v?.toFixed(1)}°`;
                },
                afterBody: (items: any[]) => {
                  const idx = items[0]?.dataIndex;
                  const p = pts[idx];
                  const lines = [];
                  if (p) lines.push(` Reps: ${p.reps}`);
                  if (idx === stats.highlight_index) lines.push("⭐ Personal best!");
                  return lines;
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "rgba(232,244,240,0.4)", font: { size: 10 }, maxRotation: 30 },
              grid:  { color: "rgba(255,255,255,0.04)" },
            },
            y: {
              position: "left",
              min: 0,
              ticks: {
                color: "rgba(232,244,240,0.4)",
                font: { size: 10 },
                callback: (v: number) => `${v}°`,
              },
              grid: { color: "rgba(255,255,255,0.05)" },
              title: { display: true, text: "Angle (°)", color: "rgba(232,244,240,0.25)", font: { size: 9 } },
            },
            y2: {
              position: "right",
              min: 0, max: 110,
              ticks: {
                color: "rgba(167,139,250,0.5)",
                font: { size: 10 },
                callback: (v: number) => `${v}%`,
              },
              grid: { drawOnChartArea: false },
              title: { display: true, text: "Accuracy (%)", color: "rgba(167,139,250,0.3)", font: { size: 9 } },
            },
          },
        },
        plugins: [goldStarPlugin],
      };

      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
      chartRef.current = new Chart(canvasRef.current!, cfg);
    };

    buildChart();
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [stats]);

  // ── Derived display values ────────────────────────────────────────────────
  const gainColor  = !stats?.total_gain ? "#6b7280"
    : stats.total_gain > 0 ? "#22c55e"
    : stats.total_gain < 0 ? "#ef4444" : "#eab308";
  const gainPrefix = stats?.total_gain != null && stats.total_gain > 0 ? "+" : "";

  const latestAccuracy = stats?.points.length
    ? (() => {
        const last = stats.points[stats.points.length - 1];
        return last.target > 0 ? Math.min(100, Math.round((last.max_angle / last.target) * 100)) : null;
      })()
    : null;

  const hasData = stats && stats.points.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Chart card */}
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(15,255,197,0.12)",
        borderRadius: 20, padding: "20px 20px 16px",
        backdropFilter: "blur(12px)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 1,
          background: "linear-gradient(90deg,transparent,rgba(15,255,197,.3),transparent)" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0", marginBottom: 2 }}>
              Joint Angle Progress
            </h3>
            <p style={{ fontSize: 11, color: "rgba(232,244,240,0.35)" }}>
              {hasData ? `${stats!.points.length} sessions · achieved vs target` : "Complete a session to see your graph"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={joint} onChange={e => setJoint(e.target.value)} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(15,255,197,0.2)",
              color: "#e8f4f0", borderRadius: 8, padding: "5px 10px",
              fontSize: 11, outline: "none", cursor: "pointer",
            }}>
              {JOINTS.map(j => (
                <option key={j.id} value={j.id} style={{ background: "#02182b" }}>{j.label}</option>
              ))}
            </select>

            <button onClick={() => { if (stats) { speakSummary(stats); setSpoken(true); } }}
              title="Voice summary"
              style={{
                background: spoken ? "rgba(15,255,197,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${spoken ? "rgba(15,255,197,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 14, color: spoken ? "#0fffc5" : "rgba(232,244,240,0.4)",
              }}>🔊</button>

            <button onClick={() => fetchStats(joint)} title="Refresh"
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 13, color: "rgba(232,244,240,0.4)",
              }}>↻</button>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ position: "relative", height: 240 }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
              justifyContent: "center", background: "rgba(2,24,43,0.5)", borderRadius: 12, zIndex: 2 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%",
                border: "2px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5",
                animation: "spinCW .8s linear infinite" }} />
            </div>
          )}

          {!loading && !hasData && !error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 36 }}>📊</span>
              <p style={{ fontSize: 13, color: "rgba(232,244,240,0.4)", textAlign: "center" }}>
                No {JOINTS.find(j => j.id === joint)?.label} data yet
              </p>
              <Link href="/session" style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "#0fffc5", color: "#02182b", textDecoration: "none",
              }}>▶ Start a Session</Link>
            </div>
          )}

          {!loading && error && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 28 }}>⚠️</span>
              <p style={{ fontSize: 12, color: "#ef4444" }}>Failed to load data</p>
              <button onClick={() => fetchStats(joint)} style={{
                padding: "6px 16px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
              }}>Retry</button>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>

        {/* Legend */}
        {hasData && (
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { color: "#0fffc5", label: "Max angle" },
              { color: "#60a5fa", label: "Mean angle" },
              { color: "#ef4444", label: "Target ROM" },
              { color: "#a78bfa", label: "Accuracy %" },
              { color: "#f59e0b", label: "⭐ Best" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                <span style={{ fontSize: 10, color: "rgba(232,244,240,0.35)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        {[
          {
            label: "Today's Best",
            value: stats?.today_best != null ? `${stats.today_best}°` : "—",
            icon: "🏆", color: "#f59e0b", sub: "max angle today",
          },
          {
            label: "Yesterday's Best",
            value: stats?.yesterday_best != null ? `${stats.yesterday_best}°` : "—",
            icon: "📅", color: "#60a5fa", sub: "max angle yesterday",
          },
          {
            label: "Total Gain",
            value: stats?.total_gain != null ? `${gainPrefix}${stats.total_gain}°` : "—",
            icon: stats?.total_gain != null && stats.total_gain > 0 ? "📈" : stats?.total_gain != null && stats.total_gain < 0 ? "📉" : "➡️",
            color: gainColor, sub: "first → latest session",
          },
          {
            label: "Accuracy",
            value: latestAccuracy != null ? `${latestAccuracy}%` : "—",
            icon: "🎯", color: "#a78bfa", sub: "vs target ROM",
          },
        ].map(card => (
          <div key={card.label} style={{
            background: "rgba(255,255,255,0.025)",
            border: `1px solid ${card.color}20`,
            borderRadius: 14, padding: "12px 14px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg,transparent,${card.color}30,transparent)` }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 9, color: "rgba(232,244,240,0.4)", textTransform: "uppercase", letterSpacing: ".07em" }}>{card.label}</p>
              <span style={{ fontSize: 14 }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: card.color, lineHeight: 1, marginBottom: 3 }}>{card.value}</p>
            <p style={{ fontSize: 9, color: "rgba(232,244,240,0.3)" }}>{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
