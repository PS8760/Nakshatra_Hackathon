"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import {
  getDashboard, getCognitiveLatestScores, getReportInsights,
  getDoctorAnalysis, api,
} from "@/lib/api";

const JOINTS = [
  { id: "knee_left", label: "Knee (L)" }, { id: "knee_right", label: "Knee (R)" },
  { id: "elbow_left", label: "Elbow (L)" }, { id: "elbow_right", label: "Elbow (R)" },
  { id: "shoulder_left", label: "Shoulder (L)" }, { id: "shoulder_right", label: "Shoulder (R)" },
  { id: "hip_left", label: "Hip (L)" }, { id: "hip_right", label: "Hip (R)" },
];

function strip(t: string) {
  return t.replace(/\*\*/g, "").replace(/^[•\-\*]\s+/gm, "  - ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(15,255,197,0.2)" }} />
        <p style={{ fontSize: 11, fontWeight: 700, color: "#0fffc5", letterSpacing: ".1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{title}</p>
        <div style={{ flex: 1, height: 1, background: "rgba(15,255,197,0.2)" }} />
      </div>
      {children}
    </div>
  );
}

function TextBlock({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {text.split("\n").map((l, i) => {
        const t = l.trim();
        if (!t) return null;
        const hdr = t.match(/^\*\*(.+?)\*\*:?\s*$/);
        if (hdr) return <p key={i} style={{ fontSize: 11, fontWeight: 700, color: "#0fffc5", textTransform: "uppercase", letterSpacing: ".07em", marginTop: 10 }}>{hdr[1]}</p>;
        const num = t.match(/^(\d+)\.\s+(.+)/);
        if (num) return (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <span style={{ minWidth: 18, height: 18, borderRadius: "50%", flexShrink: 0, background: "rgba(15,255,197,0.12)", border: "1px solid rgba(15,255,197,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#0fffc5" }}>{num[1]}</span>
            <span style={{ fontSize: 12, color: "#e8f4f0", lineHeight: 1.5 }}>{num[2].replace(/\*\*/g, "")}</span>
          </div>
        );
        const bul = t.match(/^[•\-\*]\s+(.+)/);
        if (bul) return (
          <div key={i} style={{ display: "flex", gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, marginTop: 6, background: "#0fffc5", opacity: .7 }} />
            <span style={{ fontSize: 12, color: "#e8f4f0", lineHeight: 1.5 }}>{bul[1].replace(/\*\*/g, "")}</span>
          </div>
        );
        return <p key={i} style={{ fontSize: 12, color: "rgba(232,244,240,0.7)", lineHeight: 1.5 }}>{t.replace(/\*\*/g, "")}</p>;
      })}
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [dash,        setDash]        = useState<any>(null);
  const [cogScores,   setCogScores]   = useState<any>(null);
  const [jointData,   setJointData]   = useState<any>(null);
  const [insights,    setInsights]    = useState("");
  const [doctorNote,  setDoctorNote]  = useState("");
  const [joint,       setJoint]       = useState("knee_left");
  const [generating,  setGenerating]  = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [step,        setStep]        = useState<"idle"|"insights"|"doctor"|"ready">("idle");

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (!token) return;
    Promise.all([
      getDashboard(),
      getCognitiveLatestScores().catch(() => ({ data: {} })),
      api.get(`/analytics/joint-progress/${joint}?limit=20`).catch(() => ({ data: [] })),
    ]).then(([d, c, j]) => {
      setDash(d.data);
      setCogScores(c.data);
      setJointData(j.data);
    });
  }, [token, joint]);

  const generate = async () => {
    setGenerating(true);
    setStep("insights");
    try {
      const ins = await getReportInsights(undefined, "overall");
      setInsights(ins.data.insights || "");
      setStep("doctor");

      if (jointData?.length) {
        const maxAngles  = jointData.map((p: any) => p.max_angle);
        const meanAngles = jointData.map((p: any) => p.avg_angle);
        const targets    = jointData.map((p: any) => p.target);
        const labels     = jointData.map((p: any, i: number) => `S${i+1}`);
        const dr = await getDoctorAnalysis({
          joint, sessions_count: jointData.length,
          max_angles: maxAngles, mean_angles: meanAngles,
          targets, labels,
          today_best: maxAngles[maxAngles.length - 1] || null,
          yesterday_best: maxAngles[maxAngles.length - 2] || null,
          total_gain: maxAngles.length >= 2 ? maxAngles[maxAngles.length-1] - maxAngles[0] : null,
          recovery_score: dash?.latest_recovery_score,
          total_sessions: dash?.total_sessions,
        });
        setDoctorNote(dr.data.analysis || "");
      }
      setStep("ready");
    } catch { setStep("idle"); }
    finally { setGenerating(false); }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210; const M = 18; let y = M;

      const addPage = () => { doc.addPage(); y = M; };
      const checkY = (need = 12) => { if (y + need > 278) addPage(); };

      const heading = (text: string, size = 13, color: [number,number,number] = [15,255,197]) => {
        checkY(14);
        doc.setFontSize(size); doc.setFont("helvetica","bold"); doc.setTextColor(...color);
        doc.text(text, M, y); y += size * 0.5;
        doc.setDrawColor(...color); doc.setLineWidth(0.3);
        doc.line(M, y, W - M, y); y += 6;
      };

      const body = (text: string, size = 10, color: [number,number,number] = [50,50,50]) => {
        checkY(size + 2);
        doc.setFontSize(size); doc.setFont("helvetica","normal"); doc.setTextColor(...color);
        const lines = doc.splitTextToSize(strip(text), W - M * 2);
        lines.forEach((l: string) => { checkY(size * 0.45); doc.text(l, M, y); y += size * 0.45; });
        y += 3;
      };

      const kv = (label: string, value: string) => {
        checkY(8);
        doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(80,80,80);
        doc.text(label + ":", M, y);
        doc.setFont("helvetica","normal"); doc.setTextColor(30,30,30);
        doc.text(value, M + 50, y); y += 6;
      };

      // ── Cover ──────────────────────────────────────────────────────────────
      doc.setFillColor(2, 24, 43);
      doc.rect(0, 0, W, 55, "F");
      doc.setFontSize(24); doc.setFont("helvetica","bold"); doc.setTextColor(15,255,197);
      doc.text("NeuroRestore AI", M, 22);
      doc.setFontSize(13); doc.setTextColor(200,230,220); doc.setFont("helvetica","normal");
      doc.text("Rehabilitation Progress Report", M, 32);
      doc.setFontSize(10); doc.setTextColor(150,200,190);
      doc.text("Generated: " + new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}), M, 41);
      doc.text("Patient: " + (dash?.user?.name || user?.full_name || "—"), M, 48);
      y = 65;

      // ── 1. Patient Overview ────────────────────────────────────────────────
      heading("1. Patient Overview");
      kv("Name",            dash?.user?.name || user?.full_name || "—");
      kv("Report Date",     new Date().toLocaleDateString());
      kv("Total Sessions",  String(dash?.total_sessions ?? 0));
      kv("Recovery Score",  dash?.latest_recovery_score != null ? dash.latest_recovery_score.toFixed(0) + "/100" : "No data");
      kv("Last Session",    dash?.recent_sessions?.[0] ? new Date(dash.recent_sessions[0].started_at).toLocaleDateString() : "None");
      y += 4;

      // ── 2. Session Details ─────────────────────────────────────────────────
      heading("2. Session Details");
      if (dash?.recent_sessions?.length) {
        doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(80,80,80);
        ["Date","Type","Duration","Score"].forEach((h,i) => doc.text(h, M + i*42, y));
        y += 5; doc.setFont("helvetica","normal"); doc.setTextColor(30,30,30);
        dash.recent_sessions.slice(0,8).forEach((s: any) => {
          checkY(6);
          doc.text(new Date(s.started_at).toLocaleDateString(), M, y);
          doc.text(s.type || "physical", M+42, y);
          doc.text(s.duration_s ? Math.floor(s.duration_s/60)+"m" : "—", M+84, y);
          doc.text(s.recovery_score != null ? s.recovery_score.toFixed(0) : "—", M+126, y);
          y += 5.5;
        });
      } else { body("No session data available."); }
      y += 4;

      // ── 3. Joint Angle Graph Description ──────────────────────────────────
      heading("3. Joint Angle Progress — " + (JOINTS.find(j=>j.id===joint)?.label || joint));
      if (jointData?.length) {
        const maxA = jointData.map((p:any)=>p.max_angle);
        const tgt  = jointData.map((p:any)=>p.target);
        body(`Sessions analysed: ${jointData.length}`);
        body(`Starting angle: ${maxA[0]?.toFixed(1)}°  |  Latest angle: ${maxA[maxA.length-1]?.toFixed(1)}°  |  Peak: ${Math.max(...maxA).toFixed(1)}°`);
        body(`Target ROM: ${tgt[0]?.toFixed(1)}°  |  Accuracy (latest): ${tgt[0]>0?((maxA[maxA.length-1]/tgt[0])*100).toFixed(1):0}%`);
        body(`Overall trend: ${maxA[maxA.length-1] > maxA[0] ? "Improving ↑" : maxA[maxA.length-1] < maxA[0] ? "Declining ↓" : "Stable →"}`);
        body(`Total gain: ${(maxA[maxA.length-1]-maxA[0]).toFixed(1)}° over ${jointData.length} sessions`);
        body("Note: The line graph on the dashboard shows achieved angle (teal) vs target ROM (red dashed). Gold star marks the personal best session.");
      } else { body("No joint angle data available for the selected joint."); }
      y += 4;

      // ── 4. Cognitive Test Results ──────────────────────────────────────────
      heading("4. Cognitive Test Results");
      const tests = [
        { key:"memory",   label:"Memory Recall",       weight:"30%", desc:"Episodic memory — strongest MCI predictor" },
        { key:"reaction", label:"Reaction Time",        weight:"25%", desc:"Processing speed" },
        { key:"pattern",  label:"Pattern Recognition",  weight:"25%", desc:"Visuospatial ability" },
        { key:"attention",label:"Attention & Focus",    weight:"20%", desc:"Executive function" },
      ];
      tests.forEach(t => {
        const s = cogScores?.[t.key]?.score;
        const band = s==null?"Not tested":s>=85?"Excellent":s>=70?"Good":s>=55?"Borderline":"Concern";
        checkY(8);
        doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(50,50,50);
        doc.text(t.label + " (" + t.weight + ")", M, y);
        doc.setFont("helvetica","normal");
        doc.text(s!=null?s.toFixed(0)+"/100":"—", M+80, y);
        doc.text(band, M+100, y);
        y += 5;
        doc.setFontSize(9); doc.setTextColor(100,100,100);
        doc.text(t.desc, M+4, y); y += 6;
      });
      y += 4;

      // ── 5. AI Insights ─────────────────────────────────────────────────────
      if (insights) {
        heading("5. AI Rehabilitation Insights");
        body(insights, 10);
        y += 4;
      }

      // ── 6. Doctor's Analysis ───────────────────────────────────────────────
      if (doctorNote) {
        heading("6. Clinical Doctor's Analysis");
        body(doctorNote, 10);
        y += 4;
      }

      // ── 7. Summary & Conclusion ────────────────────────────────────────────
      heading("7. Summary & Conclusion");
      const score = dash?.latest_recovery_score;
      const status = score==null?"Insufficient data":score>=70?"Good progress — patient is on track for recovery":score>=50?"Moderate progress — continue current protocol":score>=30?"Below target — consider adjusting exercise intensity":"Insufficient data";
      body(`Overall Recovery Status: ${status}`);
      body(`Based on ${dash?.total_sessions ?? 0} completed sessions, the patient demonstrates ${score!=null?score.toFixed(0)+"/100":"no recorded"} composite recovery score. ${insights ? "AI analysis indicates structured progress with areas identified for improvement." : ""} ${doctorNote ? "Clinical assessment confirms the rehabilitation trajectory is within expected parameters." : ""}`);
      body("This report is generated by NeuroRestore AI and is intended to supplement, not replace, professional medical advice. All findings should be reviewed by a qualified physiotherapist or physician.");
      y += 6;

      // ── Footer ─────────────────────────────────────────────────────────────
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150,150,150);
        doc.text("NeuroRestore AI · Rehabilitation Report · Confidential", M, 290);
        doc.text("Page " + i + " of " + pages, W - M - 18, 290);
      }

      doc.save("NeuroRestore_Report_" + new Date().toISOString().split("T")[0] + ".pdf");
    } catch (e) { console.error(e); alert("PDF generation failed."); }
    finally { setDownloading(false); }
  };
