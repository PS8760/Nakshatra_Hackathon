"use client";
import { useState, useEffect } from "react";
import { getDashboard, getReportInsights, getCognitiveLatestScores } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";

/* ── Parse and render AI recommendations as styled bullet points ─────────── */
function RecommendationRenderer({ text }: { text: string }) {
  if (!text) return null;

  // Split into lines, filter empty
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    // Section header: **Overall Progress:** or **Key Strengths:**
    const headerMatch = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (headerMatch) {
      elements.push(
        <div key={key++} style={{
          fontSize: 11, fontWeight: 700, color: "#0fffc5",
          letterSpacing: ".08em", textTransform: "uppercase",
          marginTop: elements.length > 0 ? 14 : 0, marginBottom: 6,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 16, height: 1, background: "#0fffc5", opacity: .5 }} />
          {headerMatch[1]}
        </div>
      );
      continue;
    }

    // Numbered point: "1. text" or "2. text"
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
          <span style={{
            minWidth: 22, height: 22, borderRadius: "50%", flexShrink: 0,
            background: "rgba(15,255,197,0.12)", border: "1px solid rgba(15,255,197,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, color: "#0fffc5",
          }}>{numberedMatch[1]}</span>
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>
            {numberedMatch[2].replace(/\*\*/g, "")}
          </span>
        </div>
      );
      continue;
    }

    // Bullet point: "• text" or "- text" or "* text"
    const bulletMatch = line.match(/^[•\-\*]\s+(.+)/);
    if (bulletMatch) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6,
            background: "#0fffc5", opacity: .7,
          }} />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>
            {bulletMatch[1].replace(/\*\*/g, "")}
          </span>
        </div>
      );
      continue;
    }

    // Inline bold+bullet combo: "**Section:** • point1 • point2"
    // Split on • and render each as a bullet
    if (line.includes("•")) {
      const parts = line.split("•").map(p => p.trim()).filter(Boolean);
      // First part might be a header
      const firstPart = parts[0];
      const isHeader = firstPart.startsWith("**") && firstPart.endsWith("**");
      if (isHeader) {
        elements.push(
          <div key={key++} style={{
            fontSize: 11, fontWeight: 700, color: "#0fffc5",
            letterSpacing: ".08em", textTransform: "uppercase",
            marginTop: elements.length > 0 ? 14 : 0, marginBottom: 6,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <div style={{ width: 16, height: 1, background: "#0fffc5", opacity: .5 }} />
            {firstPart.replace(/\*\*/g, "")}
          </div>
        );
        for (const pt of parts.slice(1)) {
          elements.push(
            <div key={key++} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: "#0fffc5", opacity: .7 }} />
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{pt.replace(/\*\*/g, "")}</span>
            </div>
          );
        }
      } else {
        for (const pt of parts) {
          elements.push(
            <div key={key++} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: "#0fffc5", opacity: .7 }} />
              <span style={{ fontSize: 13, lineHeight: 1.6, color: "#e8f4f0" }}>{pt.replace(/\*\*/g, "")}</span>
            </div>
          );
        }
      }
      continue;
    }

    // Plain text — strip any remaining markdown
    const clean = line.replace(/\*\*/g, "");
    if (clean) {
      elements.push(
        <p key={key++} style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(232,244,240,0.7)", marginBottom: 6 }}>
          {clean}
        </p>
      );
    }
  }

  return <div style={{ display: "flex", flexDirection: "column" }}>{elements}</div>;
}

/* ── Strip markdown for PDF plain text ───────────────────────────────────── */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[•\-\*]\s+/gm, "  - ")
    .replace(/^\d+\.\s+/gm, (m) => m);
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [dashData, setDashData] = useState<any>(null);
  const [cogScores, setCogScores] = useState<any>(null);
  const [insights, setInsights] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reportType, setReportType] = useState<"overall" | "session">("overall");

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (!token) return;
    Promise.all([
      getDashboard(),
      getCognitiveLatestScores().catch(() => ({ data: {} })),
    ]).then(([d, c]) => {
      setDashData(d.data);
      setCogScores(c.data);
    });
  }, [token]);

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const res = await getReportInsights(undefined, reportType);
      setInsights(res.data.insights);
    } catch {
      setInsights("Unable to generate AI insights at this time.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const W = 210, margin = 20;
      let y = margin;

      // ── Header ──
      doc.setFillColor(2, 24, 43);
      doc.rect(0, 0, W, 50, "F");
      doc.setTextColor(15, 255, 197);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("NeuroRestore AI", margin, y + 10);
      doc.setFontSize(11);
      doc.setTextColor(200, 230, 220);
      doc.setFont("helvetica", "normal");
      doc.text("AI-Powered Rehabilitation Report", margin, y + 20);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y + 28);
      doc.text(`Patient: ${dashData?.user?.name ?? user?.full_name ?? "—"}`, margin, y + 36);
      y = 60;

      // ── Recovery Score ──
      doc.setTextColor(15, 255, 197);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Recovery Overview", margin, y);
      y += 8;
      doc.setDrawColor(15, 255, 197);
      doc.setLineWidth(0.3);
      doc.line(margin, y, W - margin, y);
      y += 8;

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const score = dashData?.latest_recovery_score;
      doc.text(`Overall Recovery Score: ${score != null ? score.toFixed(0) + "/100" : "No data"}`, margin, y); y += 7;
      doc.text(`Total Sessions Completed: ${dashData?.total_sessions ?? 0}`, margin, y); y += 7;
      const lastSession = dashData?.recent_sessions?.[0];
      doc.text(`Last Session: ${lastSession ? new Date(lastSession.started_at).toLocaleDateString() : "None"}`, margin, y); y += 14;

      // ── Cognitive Scores ──
      if (cogScores && Object.keys(cogScores).length > 0) {
        doc.setTextColor(15, 255, 197);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Cognitive Performance", margin, y); y += 8;
        doc.setDrawColor(15, 255, 197);
        doc.line(margin, y, W - margin, y); y += 8;

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        const tests = [
          { key: "memory", label: "Memory Recall" },
          { key: "reaction", label: "Reaction Time" },
          { key: "pattern", label: "Pattern Recognition" },
          { key: "attention", label: "Attention & Focus" },
        ];
        for (const t of tests) {
          const s = cogScores[t.key]?.score;
          doc.text(`${t.label}: ${s != null ? s.toFixed(0) + "/100" : "Not tested"}`, margin, y); y += 7;
        }
        y += 7;
      }

      // ── Recent Sessions ──
      if (dashData?.recent_sessions?.length > 0) {
        doc.setTextColor(15, 255, 197);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Recent Sessions", margin, y); y += 8;
        doc.setDrawColor(15, 255, 197);
        doc.line(margin, y, W - margin, y); y += 8;

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Date", margin, y);
        doc.text("Type", margin + 40, y);
        doc.text("Duration", margin + 80, y);
        doc.text("Score", margin + 120, y);
        y += 6;
        doc.setFont("helvetica", "normal");

        for (const s of dashData.recent_sessions.slice(0, 8)) {
          if (y > 260) { doc.addPage(); y = margin; }
          doc.text(new Date(s.started_at).toLocaleDateString(), margin, y);
          doc.text(s.type ?? "physical", margin + 40, y);
          doc.text(s.duration_s ? `${Math.floor(s.duration_s / 60)}m` : "—", margin + 80, y);
          doc.text(s.recovery_score != null ? s.recovery_score.toFixed(0) : "—", margin + 120, y);
          y += 6;
        }
        y += 8;
      }

      // ── AI Insights ──
      if (insights) {
        if (y > 220) { doc.addPage(); y = margin; }
        doc.setTextColor(15, 255, 197);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("AI Recommendations", margin, y); y += 8;
        doc.setDrawColor(15, 255, 197);
        doc.line(margin, y, W - margin, y); y += 8;

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const cleanInsights = stripMarkdown(insights);
        const lines = doc.splitTextToSize(cleanInsights, W - margin * 2);
        for (const line of lines) {
          if (y > 270) { doc.addPage(); y = margin; }
          doc.text(line, margin, y); y += 5.5;
        }
        y += 8;
      }

      // ── Footer ──
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("NeuroRestore AI · Not a substitute for professional medical advice", margin, 290);
        doc.text(`Page ${i} of ${pageCount}`, W - margin - 20, 290);
      }

      doc.save(`NeuroRestore_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#02182b", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to view reports.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  const score = dashData?.latest_recovery_score;
  const scoreColor = score == null ? "#6b7280" : score >= 70 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 32, paddingBottom: 56 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="pill" style={{ marginBottom: 16 }}>📄 Reports</div>
          <h1 style={{ fontSize: "clamp(24px,3.5vw,38px)", fontWeight: 800, letterSpacing: "-.025em", marginBottom: 8 }}>
            Your Rehabilitation Report
          </h1>
          <p style={{ fontSize: 14, color: "rgba(232,244,240,0.45)" }}>
            Download a comprehensive PDF report of your progress and AI recommendations.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }} className="report-grid">

          {/* Report preview */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden" }}>
            {/* Report header preview */}
            <div style={{ background: "#02182b", padding: "28px 28px 20px", borderBottom: "1px solid rgba(15,255,197,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#0fffc5" }} />
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0" }}>NeuroRestore<span style={{ color: "#0fffc5" }}> AI</span></span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e8f4f0", marginBottom: 4 }}>Rehabilitation Report</h2>
              <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)" }}>
                {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · {dashData?.user?.name ?? user?.full_name}
              </p>
            </div>

            <div style={{ padding: "24px 28px" }}>
              {/* Stats preview */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Recovery Score", value: score != null ? `${score.toFixed(0)}/100` : "—", color: scoreColor },
                  { label: "Total Sessions", value: dashData?.total_sessions ?? 0, color: "#0fffc5" },
                  { label: "Cognitive Tests", value: cogScores ? Object.values(cogScores).filter((v: any) => v.score !== null).length + "/4" : "0/4", color: "#818cf8" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>{s.label}</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* AI Insights preview */}
              {insights ? (
                <div style={{ background: "rgba(15,255,197,0.04)", border: "1px solid rgba(15,255,197,0.12)", borderRadius: 12, padding: "16px 18px" }}>
                  <p style={{ fontSize: 11, color: "#0fffc5", fontWeight: 700, marginBottom: 12, letterSpacing: ".08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🤖</span> AI Recommendations
                  </p>
                  <RecommendationRenderer text={insights} />
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: "rgba(232,244,240,0.35)" }}>Generate AI insights to include in your report</p>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Report type */}
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f4f0", marginBottom: 14 }}>Report Type</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { id: "overall", label: "Overall Analysis", desc: "All sessions + cognitive tests + AI insights" },
                  { id: "session", label: "Recent Sessions", desc: "Last 10 sessions with detailed breakdown" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setReportType(t.id as any)} style={{
                    padding: "12px 14px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                    background: reportType === t.id ? "rgba(15,255,197,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${reportType === t.id ? "rgba(15,255,197,0.3)" : "rgba(255,255,255,0.07)"}`,
                    transition: "all .2s",
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: reportType === t.id ? "#0fffc5" : "#e8f4f0", marginBottom: 3 }}>{t.label}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate AI insights */}
            <button onClick={generateInsights} disabled={generating} style={{
              padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 600,
              background: generating ? "rgba(255,255,255,0.05)" : "rgba(245,158,11,0.1)",
              border: `1px solid ${generating ? "rgba(255,255,255,0.1)" : "rgba(245,158,11,0.3)"}`,
              color: generating ? "rgba(232,244,240,0.4)" : "#f59e0b",
              cursor: generating ? "not-allowed" : "pointer", transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {generating ? (
                <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(245,158,11,0.3)", borderTopColor: "#f59e0b", animation: "spinCW .8s linear infinite" }} /> Generating…</>
              ) : "🤖 Generate AI Insights"}
            </button>

            {/* Download PDF */}
            <button onClick={downloadPDF} disabled={downloading} style={{
              padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: downloading ? "rgba(255,255,255,0.05)" : "#0fffc5",
              border: "none", color: downloading ? "rgba(232,244,240,0.4)" : "#02182b",
              cursor: downloading ? "not-allowed" : "pointer",
              boxShadow: downloading ? "none" : "0 0 24px rgba(15,255,197,0.3)",
              transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {downloading ? (
                <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(2,24,43,0.3)", borderTopColor: "#02182b", animation: "spinCW .8s linear infinite" }} /> Generating PDF…</>
              ) : "⬇ Download PDF Report"}
            </button>

            <p style={{ fontSize: 11, color: "rgba(232,244,240,0.3)", textAlign: "center" }}>
              Professional PDF · Shareable with your doctor
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .report-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
