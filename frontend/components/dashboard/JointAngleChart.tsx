"use client";
/**
 * JointAngleChart
 * ===============
 * Glassmorphism Chart.js hybrid bar+line chart showing joint angle progress.
 *
 * - Bars:        Daily max angle per session
 * - Line:        Target ROM (from ExerciseConfig)
 * - Gold star:   Session with the highest recorded angle
 * - Auto-refresh every 30s and after each session completes
 * - 3 summary cards: Today's Best / Yesterday's Best / Total Gain
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { getJointLiveStats } from "@/lib/api";

interface LiveStats {
  joint: string;
  labels: string[];
  max_angles: number[];
  mean_angles: number[];
  target: number[];
  highlight_index: number | null;
  today_best: number | null;
  yesterday_best: number | null;
  total_gain: number | null;
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

// Speak the weekly summary using Web Speech API
function speakSummary(stats: LiveStats) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const gain = stats.total_gain;
  const best = stats.today_best;
  if (!best) return;

  let msg = `Great work! Your best angle today is ${best} degrees.`;
  if (gain !== null && gain > 0) {
    msg += ` You improved by ${gain} degrees compared to yesterday. Keep it up!`;
  } else if (gain !== null && gain < 0) {
    msg += ` You're down ${Math.abs(gain)} degrees from yesterday. Try to push a little further next session.`;
  } else {
    msg += ` You're maintaining your progress. Consistency is key!`;
  }

  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(msg);
  u.rate = 1.0; u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

export default function JointAngleChart({ onSessionEnd }: { onSessionEnd?: number }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const chartRef   = useRef<any>(null);
  const [stats,    setStats]    = useState<LiveStats | null>(null);
  const [joint,    setJoint]    = useState("knee_left");
  const [loading,  setLoading]  = useState(true);
  const [spoken,   setSpoken]   = useState(false);

  const fetchStats = useCallback(async (j: string) => {
    setLoading(true);
    try {
      const res = await getJointLiveStats(j, 10);
      setStats(res.data);
      setSpoken(false);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount, joint change, and after session ends
  useEffect(() => { fetchStats(joint); }, [joint, fetchStats]);
  useEffect(() => {
    if (onSessionEnd) fetchStats(joint);
  }, [onSessionEnd, joint, fetchStats]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchStats(joint), 30000);
    return () => clearInterval(id);
  }, [joint, fetchStats]);

  // Build / update Chart.js instance
  useEffect(() => {
    if (!canvasRef.current || !stats || stats.labels.length === 0) return;

    const buildChart = async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      // Custom gold-star point plugin
      const goldStarPlugin = {
        id: "goldStar",
        afterDatasetsDraw(chart: any) {
          if (stats.highlight_index === null) return;
          const meta = chart.getDatasetMeta(0);
          const pt   = meta.data[stats.highlight_index];
          if (!pt) return;
          const ctx = chart.ctx;
          ctx.save();
          ctx.font = "18px serif";
          ctx.textAlign = "center";
          ctx.fillText("⭐", pt.x, pt.y - 14);
          ctx.restore();
        },
      };

      // Point colours — gold for highlight, teal for rest
      const pointColors = stats.max_angles.map((_, i) =>
        i === stats.highlight_index ? "#f59e0b" : "rgba(15,255,197,0.7)"
      );
      const pointRadius = stats.max_angles.map((_, i) =>
        i === stats.highlight_index ? 7 : 4
      );

      const cfg: any = {
        type: "bar",
        data: {
          labels: stats.labels,
          datasets: [
            {
              type: "bar",
              label: "Max Angle (°)",
              data: stats.max_angles,
              backgroundColor: stats.max_angles.map((_, i) =>
                i === stats.highlight_index
                  ? "rgba(245,158,11,0.55)"
                  : "rgba(15,255,197,0.25)"
              ),
              borderColor: stats.max_angles.map((_, i) =>
                i === stats.highlight_index ? "#f59e0b" : "#0fffc5"
              ),
              borderWidth: 1.5,
              borderRadius: 6,
              order: 2,
            },
            {
              type: "line",
              label: "Mean Angle (°)",
              data: stats.mean_angles,
              borderColor: "rgba(96,165,250,0.8)",
              backgroundColor: "transparent",
              borderWidth: 1.5,
              borderDash: [4, 3],
              pointRadius: 3,
              pointBackgroundColor: "rgba(96,165,250,0.8)",
              tension: 0.35,
              order: 1,
            },
            {
              type: "line",
              label: "Target ROM (°)",
              data: stats.target,
              borderColor: "rgba(239,68,68,0.7)",
              backgroundColor: "transparent",
              borderWidth: 2,
              borderDash: [6, 4],
              pointRadius: 0,
              tension: 0,
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 600, easing: "easeOutQuart" },
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: {
              labels: {
                color: "rgba(232,244,240,0.55)",
                font: { size: 11 },
                boxWidth: 12,
                padding: 16,
              },
            },
            tooltip: {
              backgroundColor: "rgba(2,24,43,0.92)",
              borderColor: "rgba(15,255,197,0.2)",
              borderWidth: 1,
              titleColor: "#e8f4f0",
              bodyColor: "rgba(232,244,240,0.7)",
              padding: 10,
              callbacks: {
                label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(1)}°`,
                afterBody: (items: any[]) => {
                  const idx = items[0]?.dataIndex;
                  return idx === stats.highlight_index ? ["⭐ Best session!"] : [];
                },
              },
            },
          },
          scales: {
            x: {
              ticks: { color: "rgba(232,244,240,0.4)", font: { size: 10 } },
              grid:  { color: "rgba(255,255,255,0.04)" },
            },
            y: {
              min: 0,
              ticks: {
                color: "rgba(232,244,240,0.4)",
                font: { size: 10 },
                callback: (v: number) => `${v}°`,
              },
              grid: { color: "rgba(255,255,255,0.06)" },
              title: {
                display: true,
                text: "Angle (degrees)",
                color: "rgba(232,244,240,0.3)",
                font: { size: 10 },
              },
            },
          },
        },
        plugins: [goldStarPlugin],
      };

      if (chartRef.current) {
        chartRef.current.destroy();
      }
      chartRef.current = new Chart(canvasRef.current!, cfg);
    };

    buildChart();
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [stats]);

  const gainColor = !stats?.total_gain ? "#6b7280"
    : stats.total_gain > 0 ? "#22c55e"
    : stats.total_gain < 0 ? "#ef4444"
    : "#eab308";

  const gainPrefix = stats?.total_gain != null && stats.total_gain > 0 ? "+" : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Chart container — glassmorphism */}
      <div style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(15,255,197,0.12)",
        borderRadius: 20,
        padding: "20px 20px 16px",
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Top accent */}
        <div style={{ position: "absolute", top: 0, left: "30%", right: "30%", height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.3),transparent)" }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0", marginBottom: 2 }}>
              Joint Angle Progress
            </h3>
            <p style={{ fontSize: 11, color: "rgba(232,244,240,0.35)" }}>
              Last 10 sessions · updates automatically
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Joint selector */}
            <select
              value={joint}
              onChange={e => setJoint(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(15,255,197,0.2)",
                color: "#e8f4f0", borderRadius: 8,
                padding: "5px 10px", fontSize: 11, outline: "none", cursor: "pointer",
              }}
            >
              {JOINTS.map(j => (
                <option key={j.id} value={j.id} style={{ background: "#02182b" }}>{j.label}</option>
              ))}
            </select>

            {/* Voice summary button */}
            <button
              onClick={() => { if (stats) { speakSummary(stats); setSpoken(true); } }}
              title="Hear voice summary"
              style={{
                background: spoken ? "rgba(15,255,197,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${spoken ? "rgba(15,255,197,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 14, color: spoken ? "#0fffc5" : "rgba(232,244,240,0.5)",
                transition: "all .2s",
              }}
            >
              🔊
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchStats(joint)}
              title="Refresh"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
                fontSize: 12, color: "rgba(232,244,240,0.5)", transition: "all .2s",
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: "relative", height: 220 }}>
          {loading && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: "rgba(2,24,43,0.6)", borderRadius: 12, zIndex: 2,
            }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5", animation: "spinCW .8s linear infinite" }} />
            </div>
          )}
          {!loading && stats?.labels.length === 0 && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span style={{ fontSize: 32 }}>📊</span>
              <p style={{ fontSize: 13, color: "rgba(232,244,240,0.35)" }}>
                No data yet — complete a session to see your progress
              </p>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
        </div>

        {/* Legend note */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
          {[
            { color: "#0fffc5", label: "Max angle (bar)" },
            { color: "#60a5fa", label: "Mean angle" },
            { color: "#ef4444", label: "Target ROM" },
            { color: "#f59e0b", label: "⭐ Best session" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
              <span style={{ fontSize: 10, color: "rgba(232,244,240,0.35)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        {[
          {
            label: "Today's Best",
            value: stats?.today_best != null ? `${stats.today_best}°` : "—",
            icon: "🏆",
            color: "#f59e0b",
            sub: "max angle today",
          },
          {
            label: "Yesterday's Best",
            value: stats?.yesterday_best != null ? `${stats.yesterday_best}°` : "—",
            icon: "📅",
            color: "#60a5fa",
            sub: "max angle yesterday",
          },
          {
            label: "Total Gain",
            value: stats?.total_gain != null ? `${gainPrefix}${stats.total_gain}°` : "—",
            icon: stats?.total_gain != null && stats.total_gain > 0 ? "📈" : stats?.total_gain != null && stats.total_gain < 0 ? "📉" : "➡️",
            color: gainColor,
            sub: "vs yesterday",
          },
        ].map(card => (
          <div key={card.label} style={{
            background: "rgba(255,255,255,0.025)",
            border: `1px solid ${card.color}20`,
            borderRadius: 14, padding: "14px 16px",
            backdropFilter: "blur(8px)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${card.color}30,transparent)` }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", textTransform: "uppercase", letterSpacing: ".07em" }}>{card.label}</p>
              <span style={{ fontSize: 16 }}>{card.icon}</span>
            </div>
            <p style={{ fontSize: 26, fontWeight: 800, color: card.color, lineHeight: 1, marginBottom: 4 }}>{card.value}</p>
            <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)" }}>{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
