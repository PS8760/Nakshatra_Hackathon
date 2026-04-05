"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSessions, getCognitiveHistory, getSessionDetail, updateSession, deleteSession } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type Tab = "sessions" | "cognitive";

export default function HistoryPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("sessions");
  const [sessions, setSessions] = useState<any[]>([]);
  const [cogHistory, setCogHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit modal state
  const [editSession, setEditSession] = useState<any>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // PDF state
  const [pdfLoading, setPdfLoading] = useState<number | null>(null);

  useEffect(() => { useAuthStore.getState().hydrate(); }, []);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError("");
    Promise.all([
      getSessions(),
      getCognitiveHistory().catch(() => ({ data: [] })),
    ])
      .then(([s, c]) => {
        setSessions(Array.isArray(s.data) ? s.data : []);
        setCogHistory(Array.isArray(c.data) ? c.data : []);
      })
      .catch(() => setError("Failed to load history. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  const scoreColor = (sc: number) => sc >= 70 ? "#6B9EFF" : sc >= 50 ? "#6B9EFF" : "#6B9EFF";

  // ── Edit ──────────────────────────────────────────────────────────────────
  const openEdit = (s: any) => { setEditSession(s); setEditNotes(s.notes ?? ""); };
  const saveEdit = async () => {
    if (!editSession) return;
    setEditSaving(true);
    try {
      await updateSession(editSession.id, editNotes);
      setSessions(prev => prev.map(s => s.id === editSession.id ? { ...s, notes: editNotes } : s));
      setEditSession(null);
    } catch { alert("Failed to save notes."); }
    finally { setEditSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteSession(deleteId);
      setSessions(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
    } catch { alert("Failed to delete session."); }
    finally { setDeleting(false); }
  };

  // ── Per-session PDF ───────────────────────────────────────────────────────
  const downloadSessionPDF = async (sessionId: number) => {
    setPdfLoading(sessionId);
    try {
      const { data: detail } = await getSessionDetail(sessionId);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const W = 210, M = 20;
      let y = M;

      // Header band
      doc.setFillColor(11, 31, 46); // #0B1F2E - Dark navy background
      doc.rect(0, 0, W, 48, "F");
      doc.setTextColor(107, 158, 255); // #6B9EFF - Primary blue
      doc.setFontSize(20); doc.setFont("helvetica", "bold");
      doc.text("NeuroRestore AI", M, y + 8);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.setTextColor(255, 255, 255); // #FFFFFF - White
      doc.text("Session Report", M, y + 17);
      doc.text(`Patient: ${user?.full_name ?? "—"}`, M, y + 25);
      doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, M, y + 32);
      y = 58;

      const section = (title: string) => {
        doc.setTextColor(107, 158, 255); // #6B9EFF - Primary blue
        doc.setFontSize(13); doc.setFont("helvetica", "bold");
        doc.text(title, M, y); y += 6;
        doc.setDrawColor(107, 158, 255); // #6B9EFF - Primary blue
        doc.setLineWidth(0.3);
        doc.line(M, y, W - M, y); y += 7;
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
      };

      const row = (label: string, value: string) => {
        if (y > 270) { doc.addPage(); y = M; }
        doc.setFont("helvetica", "bold"); doc.text(label + ":", M, y);
        doc.setFont("helvetica", "normal"); doc.text(value, M + 50, y);
        y += 6;
      };

      // Session overview
      section("Session Overview");
      const date = detail.started_at
        ? new Date(detail.started_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "—";
      const dur = detail.duration_s
        ? `${Math.floor(detail.duration_s / 60)}m ${detail.duration_s % 60}s`
        : "—";
      row("Date", date);
      row("Type", detail.session_type ?? "physical");
      row("Duration", dur);
      row("Recovery Score", detail.recovery_score != null ? `${detail.recovery_score.toFixed(0)} / 100` : "—");
      row("Physical Score", detail.physical_score != null ? `${detail.physical_score.toFixed(0)} / 100` : "—");
      if (detail.notes) row("Notes", detail.notes);
      y += 6;

      // Joint stats
      if (detail.joint_stats && Object.keys(detail.joint_stats).length > 0) {
        section("Joint Performance");
        doc.setFont("helvetica", "bold");
        doc.text("Joint", M, y); doc.text("Reps", M + 50, y); doc.text("Avg Angle", M + 80, y); doc.text("Target", M + 115, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        for (const [joint, stats] of Object.entries<any>(detail.joint_stats)) {
          if (y > 270) { doc.addPage(); y = M; }
          doc.text(joint, M, y);
          doc.text(String(stats.reps), M + 50, y);
          doc.text(`${stats.avg_angle}°`, M + 80, y);
          doc.text(stats.target ? `${stats.target}°` : "—", M + 115, y);
          y += 6;
        }
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.text(`Total Reps: ${detail.total_reps}`, M, y); y += 10;
      }

      // Pain events
      if (detail.pain_events?.length > 0) {
        section("Pain Events");
        for (const p of detail.pain_events) {
          if (y > 270) { doc.addPage(); y = M; }
          const time = p.ts ? new Date(p.ts).toLocaleTimeString() : "";
          doc.text(`• ${p.joint} — Intensity ${p.intensity}/10${p.note ? ` — ${p.note}` : ""}${time ? ` (${time})` : ""}`, M, y);
          y += 6;
        }
        y += 4;
      }

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150, 150, 150);
        doc.text("NeuroRestore AI · Not a substitute for professional medical advice", M, 290);
        doc.text(`Page ${i} of ${pages}`, W - M - 20, 290);
      }

      const dateStr = detail.started_at ? new Date(detail.started_at).toISOString().split("T")[0] : "session";
      doc.save(`NeuroRestore_Session_${detail.id}_${dateStr}.pdf`);
    } catch (err) {
      console.error(err);
      alert("PDF generation failed.");
    } finally {
      setPdfLoading(null);
    }
  };

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", background: "#0B1F2E", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 64 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(232,244,240,0.6)", marginBottom: 16 }}>Please sign in to view history.</p>
          <button onClick={() => router.push("/auth")} className="btn-solid">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 32, paddingBottom: 56 }}>

        <div style={{ marginBottom: 28 }}>
          <div className="pill" style={{ marginBottom: 14 }}>📋 History</div>
          <h1 style={{ fontSize: "clamp(22px,3vw,34px)", fontWeight: 800, letterSpacing: "-.025em" }}>
            Your Activity History
          </h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 4, width: "fit-content" }}>
          {([["sessions", "🏃 Physical Sessions"], ["cognitive", "🧠 Cognitive Tests"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: tab === t ? "rgba(15,255,197,0.12)" : "transparent",
              border: tab === t ? "1px solid rgba(15,255,197,0.25)" : "1px solid transparent",
              color: tab === t ? "#6B9EFF" : "rgba(232,244,240,0.5)",
              cursor: "pointer", transition: "all .2s",
            }}>{label}</button>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "12px 16px", color: "#6B9EFF", fontSize: 13, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(15,255,197,0.2)", borderTopColor: "#6B9EFF", animation: "spinCW 1s linear infinite" }} />
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
                  const c = sc != null ? scoreColor(sc) : "#6b7280";
                  const dur = s.duration_s ? `${Math.floor(s.duration_s / 60)}m ${s.duration_s % 60}s` : "—";
                  const isPdfLoading = pdfLoading === s.id;
                  return (
                    <div key={s.id} style={{
                      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 14, padding: "16px 20px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      flexWrap: "wrap", gap: 12, transition: "border-color .2s",
                    }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,255,197,0.18)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
                    >
                      {/* Left */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: "rgba(15,255,197,0.08)", border: "1px solid rgba(15,255,197,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                        }}>
                          {s.session_type === "cognitive" ? "🧠" : "🏃"}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#e8f4f0", marginBottom: 3 }}>
                            {new Date(s.started_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          <p style={{ fontSize: 12, color: "rgba(232,244,240,0.45)" }}>
                            <span style={{ textTransform: "capitalize" }}>{s.session_type}</span>
                            {" · "}{dur}
                            {s.notes && <span style={{ color: "rgba(15,255,197,0.5)", marginLeft: 6 }}>📝</span>}
                          </p>
                        </div>
                      </div>

                      {/* Right — score + actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        {sc != null && (
                          <div style={{ textAlign: "right", marginRight: 4 }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: c, lineHeight: 1 }}>{sc.toFixed(0)}</p>
                            <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)", marginTop: 1 }}>/100</p>
                          </div>
                        )}

                        {/* PDF button */}
                        <button
                          onClick={() => downloadSessionPDF(s.id)}
                          disabled={isPdfLoading}
                          title="Download PDF"
                          style={{
                            width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(15,255,197,0.2)",
                            background: "rgba(15,255,197,0.06)", color: "#6B9EFF",
                            cursor: isPdfLoading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, transition: "all .18s", opacity: isPdfLoading ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => { if (!isPdfLoading) (e.currentTarget as HTMLElement).style.background = "rgba(15,255,197,0.14)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(15,255,197,0.06)"; }}
                        >
                          {isPdfLoading
                            ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(15,255,197,0.3)", borderTopColor: "#6B9EFF", animation: "spinCW .8s linear infinite" }} />
                            : "⬇"}
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => openEdit(s)}
                          title="Edit notes"
                          style={{
                            width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)", color: "rgba(232,244,240,0.5)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, transition: "all .18s",
                          }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.08)"; el.style.color = "#e8f4f0"; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.color = "rgba(232,244,240,0.5)"; }}
                        >✏️</button>

                        {/* Delete button */}
                        <button
                          onClick={() => setDeleteId(s.id)}
                          title="Delete session"
                          style={{
                            width: 34, height: 34, borderRadius: 9, border: "1px solid rgba(239,68,68,0.15)",
                            background: "rgba(239,68,68,0.05)", color: "rgba(239,68,68,0.5)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, transition: "all .18s",
                          }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(239,68,68,0.12)"; el.style.color = "#6B9EFF"; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(239,68,68,0.05)"; el.style.color = "rgba(239,68,68,0.5)"; }}
                        >🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── Cognitive Tests ── */
          <div>
            {!cogHistory.length ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontSize: 40, marginBottom: 16 }}>🧠</p>
                <p style={{ fontSize: 16, color: "rgba(232,244,240,0.4)", marginBottom: 20 }}>No cognitive tests yet</p>
                <Link href="/cognitive-tests" style={{
                  padding: "13px 28px", borderRadius: 10,
                  background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)",
                  color: "#7BAAFF", textDecoration: "none", fontWeight: 600, fontSize: 14,
                }}>Take First Test</Link>
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
                        <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(s.cognitive_score) }}>
                          {s.cognitive_score.toFixed(0)}/100
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {s.tests?.map((t: any) => (
                        <div key={t.type} style={{
                          padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                          color: "rgba(232,244,240,0.6)",
                        }}>
                          {t.type}: <span style={{ color: "#6B9EFF" }}>{t.score?.toFixed(0) ?? "—"}</span>
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

      {/* ── Edit Notes Modal ── */}
      {editSession && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={(e) => { if (e.target === e.currentTarget) setEditSession(null); }}>
          <div style={{
            background: "#031e35", border: "1px solid rgba(15,255,197,0.2)",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 440,
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#e8f4f0", marginBottom: 6 }}>Edit Session Notes</h3>
            <p style={{ fontSize: 12, color: "rgba(232,244,240,0.4)", marginBottom: 18 }}>
              {new Date(editSession.started_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes about this session…"
              rows={4}
              style={{
                width: "100%", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(15,255,197,0.2)", borderRadius: 10,
                padding: "12px 14px", color: "#e8f4f0", fontSize: 13,
                resize: "vertical", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button onClick={() => setEditSession(null)} style={{
                padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(232,244,240,0.6)", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={saveEdit} disabled={editSaving} style={{
                padding: "10px 20px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: editSaving ? "rgba(15,255,197,0.3)" : "#6B9EFF",
                border: "none", color: "#0B1F2E", cursor: editSaving ? "not-allowed" : "pointer",
              }}>
                {editSaving ? "Saving…" : "Save Notes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteId !== null && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }} onClick={(e) => { if (e.target === e.currentTarget && !deleting) setDeleteId(null); }}>
          <div style={{
            background: "#031e35", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🗑️</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#e8f4f0", marginBottom: 8 }}>Delete Session?</h3>
            <p style={{ fontSize: 13, color: "rgba(232,244,240,0.5)", marginBottom: 24 }}>
              This will permanently delete the session and all its data. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} disabled={deleting} style={{
                padding: "10px 24px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(232,244,240,0.6)", cursor: "pointer",
              }}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting} style={{
                padding: "10px 24px", borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: deleting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                color: "#6B9EFF", cursor: deleting ? "not-allowed" : "pointer",
              }}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
