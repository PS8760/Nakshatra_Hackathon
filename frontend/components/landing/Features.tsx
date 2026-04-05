"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="4" stroke="#6B9EFF" strokeWidth="1.5"/><path d="M11 2v3M11 17v3M2 11h3M17 11h3" stroke="#6B9EFF" strokeWidth="1.5" strokeLinecap="round"/><path d="M5.5 5.5l2 2M14.5 14.5l2 2M5.5 16.5l2-2M14.5 7.5l2-2" stroke="#6B9EFF" strokeWidth="1" strokeLinecap="round" opacity=".4"/></svg>,
    tag: "Track A", title: "Real-Time Pose Tracking",
    desc: "MediaPipe Pose at 30 FPS. 33 body landmarks. Joint angles via dot-product trigonometry with 0.65 visibility gating.",
    color: "#6B9EFF",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="2" width="8" height="8" rx="1.5" stroke="#6B9EFF" strokeWidth="1.5"/><rect x="12" y="2" width="8" height="8" rx="1.5" stroke="#6B9EFF" strokeWidth="1.5" opacity=".4"/><rect x="2" y="12" width="8" height="8" rx="1.5" stroke="#6B9EFF" strokeWidth="1.5" opacity=".4"/><rect x="12" y="12" width="8" height="8" rx="1.5" stroke="#6B9EFF" strokeWidth="1.5"/></svg>,
    tag: "Track B", title: "Cognitive Mini-Games",
    desc: "5 evidence-based games — Pattern Recall, Word Chain, Dual N-Back, Color-Shape Match, Narrative Recall.",
    color: "#6B9EFF",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M2 17L6 10l4 3 4-7 4 3" stroke="#6B9EFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="20" cy="9" r="2" fill="#6B9EFF" opacity=".8"/></svg>,
    tag: "Analytics", title: "Recovery Score",
    desc: "Unified 0–100 composite: 60% physical ROM + 40% cognitive. Updated every session with milestone markers.",
    color: "#6B9EFF",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C7.7 2 5 4.7 5 8c0 4.5 3.5 8 6 9 2.5-1 6-4.5 6-9 0-3.3-2.7-6-6-6z" stroke="#6B9EFF" strokeWidth="1.5"/><path d="M8 9l2.5 2.5L14 7" stroke="#6B9EFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    tag: "AI", title: "Adaptive Difficulty",
    desc: "3-session rolling window. 85% threshold → ROM +5°. Below 50% → supportive mode. Clinician-configurable.",
    color: "#6B9EFF",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="2" y="4" width="18" height="14" rx="2" stroke="#6B9EFF" strokeWidth="1.5"/><path d="M7 9h8M7 13h5" stroke="#6B9EFF" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    tag: "Export", title: "PDF Reports",
    desc: "Auto-generated session breakdown. Patients share with their surgeon at the next appointment.",
    color: "#6B9EFF",
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2L3 6.5v9L11 20l8-4.5v-9z" stroke="#6B9EFF" strokeWidth="1.5" strokeLinejoin="round"/><path d="M11 2v18M3 6.5l8 4.5 8-4.5" stroke="#6B9EFF" strokeWidth="1" opacity=".3"/></svg>,
    tag: "Privacy", title: "Zero Hardware",
    desc: "Any smartphone or laptop. All pose inference runs client-side — zero video data ever sent to the server.",
    color: "#6B9EFF",
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
      padding: "32px 28px",
      opacity: 0, transform: "translateY(40px)",
      transition: `opacity .7s cubic-bezier(.22,1,.36,1) ${i * .08}s, transform .7s cubic-bezier(.22,1,.36,1) ${i * .08}s`,
      display: "flex", flexDirection: "column", gap: 24,
      position: "relative", overflow: "hidden",
    }}>
      {/* Top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${f.color}, transparent)`,
        opacity: 0, transition: "opacity .3s",
      }} className="card-line" />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${f.color}15`,
          border: `2px solid ${f.color}30`,
          transition: "all .3s",
        }} className="icon-box">{f.icon}</div>
        <span style={{
          fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700,
          color: f.color, border: `1px solid ${f.color}40`,
          letterSpacing: ".08em", textTransform: "uppercase",
          background: `${f.color}10`,
        }}>{f.tag}</span>
      </div>
      <div>
        <h3 style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 12, lineHeight: 1.3 }}>{f.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text-light)" }}>{f.desc}</p>
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="section" style={{ borderTop: "2px solid #1A3447", background: "#0B1F2E" }}>
      <div className="orb orb-l a-floatXY" />
      <div className="orb orb-r a-floatY" style={{ animationDelay: "2s" }} />

      <div style={{
        width: "100%", maxWidth: 1160,
        margin: "0 auto",
        padding: "0 clamp(20px,5vw,80px)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 80 }}>
          <div className="pill" style={{ marginBottom: 24 }}>Capabilities</div>
          <h2 style={{ fontSize: "clamp(32px,5vw,56px)", fontWeight: 900, letterSpacing: "-.03em", color: "var(--text)", marginBottom: 20, lineHeight: 1.1 }}>
            Built for real recovery.
          </h2>
          <p style={{ fontSize: 18, color: "var(--text-light)", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Every feature covers the 6 days a week that traditional physiotherapy cannot.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }} className="feat-grid">
          {FEATURES.map((f, i) => <Card key={f.title} f={f} i={i} />)}
        </div>

        <div style={{ textAlign: "center", marginTop: 64 }}>
          <Link href="/auth" className="btn-solid" style={{ display: "inline-flex", fontSize: 16, padding: "18px 40px" }}>
            Start your recovery
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M3 9h12M10 4l5 5-5 5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .feat-grid { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 560px) { .feat-grid { grid-template-columns: 1fr !important; } }
        .card:hover .card-line { opacity: 1 !important; }
        .card:hover .icon-box { transform: scale(1.1) rotate(5deg); }
      `}</style>
    </section>
  );
}
