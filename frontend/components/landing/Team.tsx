"use client";
import { useEffect, useRef } from "react";

const MEMBERS = [
  { name: "Pranav Ghodke",  role: "ML Engineer",           focus: "Pose estimation · Joint angle math · Rep counter · Anomaly detection", initials: "PG" },
  { name: "Jui Katkade",    role: "Backend Engineer",       focus: "FastAPI · WebSocket handler · REST endpoints · DB schema · Scoring",   initials: "JK" },
  { name: "Gauri Borse",    role: "Frontend Engineer",      focus: "Next.js dashboard · Canvas overlay · Real-time charts · Patient UI",   initials: "GB" },
  { name: "Aditya Chavan",  role: "Full-Stack / Cognitive", focus: "Cognitive games · Spaced repetition · PDF export · Integration",       initials: "AC" },
];

export default function Team() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    refs.current.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
      }, { threshold: .1 });
      obs.observe(el);
    });
  }, []);

  return (
    <section id="team" className="section" style={{ borderTop: "1px solid rgba(15,255,197,.05)" }}>
      <div className="orb orb-l a-floatXY" style={{ animationDelay: ".5s" }} />

      <div style={{
        width: "100%", maxWidth: 1160,
        margin: "0 auto",
        padding: "0 clamp(20px,5vw,80px)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <div className="pill" style={{ marginBottom: 20 }}>The team</div>
          <h2 style={{ fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", color: "#e8f4f0", marginBottom: 12, lineHeight: 1.1 }}>
            Built by four, for millions.
          </h2>
          <p style={{ fontSize: 14, color: "rgba(232,244,240,.36)" }}>
            Nakshatra Hackathon 2026 · Healthcare Track · 24 hours
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16, maxWidth: 820, margin: "0 auto" }} className="team-grid">
          {MEMBERS.map((m, i) => (
            <div key={m.name} ref={(el) => { refs.current[i] = el; }} className="card" style={{
              padding: "24px", display: "flex", gap: 18, alignItems: "flex-start",
              opacity: 0, transform: "translateY(20px)",
              transition: `opacity .55s ease ${i * .1}s, transform .55s ease ${i * .1}s`,
            }}>
              <div className="a-border" style={{
                width: 50, height: 50, borderRadius: 13, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(15,255,197,.08)", border: "1px solid rgba(15,255,197,.2)",
                color: "#6B9EFF", fontWeight: 700, fontSize: 14, letterSpacing: ".02em",
              }}>{m.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "#e8f4f0", marginBottom: 3 }}>{m.name}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6B9EFF", marginBottom: 9 }}>{m.role}</p>
                <p style={{ fontSize: 12, lineHeight: 1.65, color: "rgba(232,244,240,.36)" }}>{m.focus}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 52, display: "flex", justifyContent: "center" }}>
          <div className="a-border" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "12px 24px", borderRadius: 14,
            background: "rgba(15,255,197,.04)", border: "1px solid rgba(15,255,197,.1)",
          }}>
            <div className="a-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#6B9EFF" }} />
            <span style={{ fontSize: 13, color: "rgba(232,244,240,.5)" }}>Built in 24 hours · Nakshatra Tech Hackathon 2026</span>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 560px) { .team-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
