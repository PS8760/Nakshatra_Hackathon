"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="#0fffc5" strokeWidth="1.5"/><path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="#0fffc5" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.5 5.5l2 2M14.5 14.5l2 2M5.5 16.5l2-2M14.5 7.5l2-2" stroke="#0fffc5" strokeWidth="1" strokeLinecap="round" opacity=".4"/></svg>,
    tag: "Track A", title: "Real-Time Pose Tracking",
    desc: "MediaPipe Pose at 30 FPS. 33 body landmarks. Joint angles via dot-product trigonometry with 0.65 visibility gating.",
    color: "#0fffc5",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="#0fffc5" strokeWidth="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5" stroke="#0fffc5" strokeWidth="1.5" opacity=".4"/><rect x="2" y="12" width="8" height="8" rx="1.5" stroke="#0fffc5" strokeWidth="1.5" opacity=".4"/><rect x="12" y="12" width="8" height="8" rx="1.5" stroke="#0fffc5" strokeWidth="1.5"/></svg>,
    tag: "Track B", title: "Cognitive Mini-Games",
    desc: "5 evidence-based games — Pattern Recall, Word Chain, Dual N-Back, Color-Shape Match, Narrative Recall.",
    color: "#0fffc5",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 17L6 10l4 3 4-7 4 3" stroke="#0fffc5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="9" r="2" fill="#0fffc5" opacity=".8"/></svg>,
    tag: "Analytics", title: "Recovery Score",
    desc: "Unified 0–100 composite: 60% physical ROM + 40% cognitive. Updated every session with milestone markers.",
    color: "#0fffc5",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C7.7 2 5 4.7 5 8c0 4.5 3.5 8 6 9 2.5-1 6-4.5 6-9 0-3.3-2.7-6-6-6z" stroke="#0fffc5" strokeWidth="1.5"/><path d="M8 9l2.5 2.5L14 7" stroke="#0fffc5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    tag: "AI", title: "Adaptive Difficulty",
    desc: "3-session rolling window. 85% threshold → ROM +5°. Below 50% → supportive mode. Clinician-configurable.",
    color: "#0fffc5",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="#0fffc5" strokeWidth="1.5"/><path d="M7 9h8M7 13h5" stroke="#0fffc5" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    tag: "Export", title: "PDF Reports",
    desc: "Auto-generated session breakdown. Patients share with their surgeon at the next appointment.",
    color: "#0fffc5",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6.5v9L11 20l8-4.5v-9z" stroke="#0fffc5" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 2v18M3 6.5l8 4.5 8-4.5" stroke="#0fffc5" strokeWidth="1" opacity=".3"/></svg>,
    tag: "Privacy", title: "Zero Hardware",
    desc: "Any smartphone or laptop. All pose inference runs client-side — zero video data ever sent to the server.",
    color: "#0fffc5",
  },
];

function Card({ f, i }: { f: typeof FEATURES[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: .08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="card" style={{
      padding: "28px 24px",
      opacity: 0, transform: "translateY(28px)",
      transition: `opacity .6s ease ${i * .07}s, transform .6s ease ${i * .07}s`,
      display: "flex", flexDirection: "column", gap: 20,
      position: "relative", overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(15,255,197,.3), transparent)`,
        opacity: 0, transition: "opacity .3s",
      }} className="card-line" />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,255,197,.07)", border: "1px solid rgba(15,255,197,.13)",
        }}>{f.icon}</div>
        <span style={{
          fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
          color: "#0fffc5", border: "1px solid rgba(15,255,197,.15)",
          letterSpacing: ".08em", textTransform: "uppercase",
          background: "rgba(15,255,197,.05)",
        }}>{f.tag}</span>
      </div>
      <div>
        <h3 style={{ fontWeight: 600, fontSize: 15, color: "#e8f4f0", marginBottom: 10, lineHeight: 1.3 }}>{f.title}</h3>
        <p style={{ fontSize: 13, lineHeight: 1.72, color: "rgba(232,244,240,.44)" }}>{f.desc}</p>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="section" style={{ borderTop: "1px solid rgba(15,255,197,.05)" }}>
      <div className="orb orb-l a-floatXY" />
      <div className="orb orb-r a-floatY" style={{ animationDelay: "2s" }} />

      <div style={{
        width: "100%", maxWidth: 1160,
        margin: "0 auto",
        padding: "0 clamp(20px,5vw,80px)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div className="pill" style={{ marginBottom: 20 }}>Capabilities</div>
          <h2 style={{ fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", color: "#e8f4f0", marginBottom: 16, lineHeight: 1.1 }}>
            Built for real recovery.
          </h2>
          <p style={{ fontSize: 16, color: "rgba(232,244,240,.42)", maxWidth: 440, margin: "0 auto", lineHeight: 1.7 }}>
            Every feature covers the 6 days a week that traditional physiotherapy cannot.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} className="feat-grid">
          {FEATURES.map((f, i) => <Card key={f.title} f={f} i={i} />)}
        </div>

        <div style={{ textAlign: "center", marginTop: 56 }}>
          <Link href="/auth" className="btn-solid" style={{ display: "inline-flex", fontSize: 14 }}>
            Start your recovery →
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 560px) { .feat-grid { grid-template-columns: 1fr !important; } }
        .card:hover .card-line { opacity: 1 !important; }
      `}</style>
    </section>
  );
}
