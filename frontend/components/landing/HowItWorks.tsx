"use client";
import { useEffect, useRef } from "react";

const STEPS = [
  { n: "01", title: "Create your account",  desc: "Sign up with email or Google. Your clinician gets assigned and your exercise config is set up.", tech: "JWT · bcrypt · role-isolated" },
  { n: "02", title: "Start a session",       desc: "Allow camera access. MediaPipe Pose loads in-browser — no video ever leaves your device.",       tech: "33 landmarks · 30 FPS · WASM" },
  { n: "03", title: "Move. Get feedback.",   desc: "Skeleton overlay appears. Joint angles update in real time. Green = on target. Voice cues guide you.", tech: "Colour-coded · voice · rep counter" },
  { n: "04", title: "Track your progress",  desc: "Recovery Score updates after every session. Trend charts show your trajectory. PDF ready for your doctor.", tech: "0–100 composite · adaptive AI" },
];

function Step({ s, i }: { s: typeof STEPS[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: .1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      display: "flex", gap: 24, alignItems: "flex-start",
      opacity: 0, transform: "translateY(20px)",
      transition: `opacity .55s ease ${i * .12}s, transform .55s ease ${i * .12}s`,
    }}>
      {/* Step number + connector */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: "rgba(15,255,197,.08)", border: "1.5px solid rgba(15,255,197,.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "monospace", fontSize: 12, fontWeight: 700,
          color: "#0fffc5", letterSpacing: ".05em",
          boxShadow: "0 0 20px rgba(15,255,197,.1)",
        }}>{s.n}</div>
        {i < STEPS.length - 1 && (
          <div style={{ width: 1, flex: 1, minHeight: 40, marginTop: 8, background: "linear-gradient(to bottom, rgba(15,255,197,.25), rgba(15,255,197,.04))" }} />
        )}
      </div>

      {/* Content */}
      <div style={{ paddingBottom: i < STEPS.length - 1 ? 44 : 0, paddingTop: 10 }}>
        <h3 style={{ fontWeight: 700, fontSize: 17, color: "#e8f4f0", marginBottom: 10, lineHeight: 1.3 }}>{s.title}</h3>
        <p style={{ fontSize: 14, lineHeight: 1.72, color: "rgba(232,244,240,.46)", marginBottom: 14 }}>{s.desc}</p>
        <span style={{
          fontSize: 11, fontFamily: "monospace", color: "rgba(15,255,197,.4)",
          letterSpacing: ".04em", background: "rgba(15,255,197,.05)",
          padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(15,255,197,.1)",
        }}>{s.tech}</span>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how" className="section" style={{ borderTop: "1px solid rgba(15,255,197,.05)" }}>
      <div className="orb orb-r a-floatY" style={{ animationDelay: "1s" }} />

      <div style={{
        width: "100%", maxWidth: 1160,
        margin: "0 auto",
        padding: "0 clamp(20px,5vw,80px)",
      }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "clamp(48px,8vw,120px)", alignItems: "start",
        }} className="how-grid">

          {/* Left — sticky heading */}
          <div style={{ position: "sticky", top: 100 }}>
            <div className="pill" style={{ marginBottom: 20 }}>Process</div>
            <h2 style={{ fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", color: "#e8f4f0", lineHeight: 1.1, marginBottom: 20 }}>
              From zero to rehabbing in under 5 minutes.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.72, color: "rgba(232,244,240,.44)", marginBottom: 32 }}>
              No hardware. No downloads. Just a camera and a browser — and you're doing real physiotherapy.
            </p>
            <a href="/auth" className="btn-outline" style={{ display: "inline-flex", fontSize: 14 }}>
              Try it now →
            </a>
          </div>

          {/* Right — steps */}
          <div>
            {STEPS.map((s, i) => <Step key={s.n} s={s} i={i} />)}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .how-grid { grid-template-columns: 1fr !important; }
          .how-grid > div:first-child { position: static !important; }
        }
      `}</style>
    </section>
  );
}
