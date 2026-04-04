"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Animated counter ─────────────────────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let v = 0; const step = to / 50;
      const t = setInterval(() => { v += step; if (v >= to) { setN(to); clearInterval(t); } else setN(Math.floor(v)); }, 24);
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

/* ── Particle canvas ──────────────────────────────────────────────────────── */
function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    let W = c.width = window.innerWidth, H = c.height = window.innerHeight;
    window.addEventListener("resize", () => { W = c.width = window.innerWidth; H = c.height = window.innerHeight; }, { passive: true });
    const pts = Array.from({ length: 45 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
      r: Math.random() * 1.2 + .3, a: Math.random() * .4 + .08,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x = (p.x + p.vx + W) % W; p.y = (p.y + p.vy + H) % H;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15,255,197,${p.a})`; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(15,255,197,${(1 - d / 100) * .055})`; ctx.lineWidth = .5; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

/* ── Floating skeleton SVG ────────────────────────────────────────────────── */
function SkeletonViz() {
  return (
      <div className="a-floatY" style={{ position: "relative", width: 280, height: 340 }}>
      {/* Glow behind */}
      <div style={{
        position: "absolute", inset: -40, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(15,255,197,.12) 0%, transparent 70%)",
        filter: "blur(20px)",
      }} />
      <svg width="280" height="340" viewBox="0 0 280 340" fill="none" style={{ position: "relative", zIndex: 1 }}>
        {/* Body skeleton */}
        <circle cx="140" cy="40" r="22" stroke="#0fffc5" strokeWidth="1.5" opacity=".7" style={{ filter: "drop-shadow(0 0 6px #0fffc5)" }} />
        {/* Spine */}
        <line x1="140" y1="62" x2="140" y2="160" stroke="#0fffc5" strokeWidth="1.5" opacity=".5" />
        {/* Shoulders */}
        <line x1="80" y1="90" x2="200" y2="90" stroke="#0fffc5" strokeWidth="1.5" opacity=".6" />
        {/* Left arm */}
        <line x1="80" y1="90" x2="55" y2="155" stroke="#0fffc5" strokeWidth="1.5" opacity=".5" />
        <line x1="55" y1="155" x2="40" y2="210" stroke="#0fffc5" strokeWidth="1.5" opacity=".4" />
        {/* Right arm */}
        <line x1="200" y1="90" x2="225" y2="155" stroke="#0fffc5" strokeWidth="1.5" opacity=".5" />
        <line x1="225" y1="155" x2="240" y2="210" stroke="#0fffc5" strokeWidth="1.5" opacity=".4" />
        {/* Hips */}
        <line x1="100" y1="160" x2="180" y2="160" stroke="#0fffc5" strokeWidth="1.5" opacity=".6" />
        {/* Left leg */}
        <line x1="110" y1="160" x2="100" y2="245" stroke="#0fffc5" strokeWidth="1.5" opacity=".5" />
        <line x1="100" y1="245" x2="95" y2="320" stroke="#0fffc5" strokeWidth="1.5" opacity=".4" />
        {/* Right leg */}
        <line x1="170" y1="160" x2="180" y2="245" stroke="#0fffc5" strokeWidth="1.5" opacity=".5" />
        <line x1="180" y1="245" x2="185" y2="320" stroke="#0fffc5" strokeWidth="1.5" opacity=".4" />

        {/* Joint dots */}
        {[
          [140, 40], [80, 90], [200, 90], [55, 155], [225, 155],
          [40, 210], [240, 210], [140, 160], [100, 245], [180, 245],
          [95, 320], [185, 320],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 0 ? 0 : 5} fill="#0fffc5" opacity={.8}
            style={{ filter: "drop-shadow(0 0 4px #0fffc5)" }} />
        ))}

        {/* Angle arc on knee */}
        <path d="M 100 245 A 30 30 0 0 1 130 230" stroke="#0fffc5" strokeWidth="1.5" fill="none" opacity=".6" strokeDasharray="4 2" />
        <text x="115" y="222" fill="#0fffc5" fontSize="11" fontFamily="monospace" opacity=".8">124°</text>

        {/* Status indicator */}
        <circle cx="100" cy="245" r="8" fill="none" stroke="#0fffc5" strokeWidth="2" opacity=".9" style={{ filter: "drop-shadow(0 0 6px #0fffc5)" }} />
      </svg>

      {/* Floating data chips */}
      <div style={{
        position: "absolute", top: 60, right: -20,
        background: "rgba(2,24,43,.9)", border: "1px solid rgba(15,255,197,.3)",
        borderRadius: 8, padding: "6px 10px", fontSize: 11, fontFamily: "monospace",
        color: "#0fffc5", backdropFilter: "blur(8px)",
        boxShadow: "0 0 16px rgba(15,255,197,.15)",
      }} className="a-floatXY">
        knee: 124°
      </div>
      <div style={{
        position: "absolute", bottom: 80, left: -30,
        background: "rgba(2,24,43,.9)", border: "1px solid rgba(15,255,197,.2)",
        borderRadius: 8, padding: "6px 10px", fontSize: 11, fontFamily: "monospace",
        color: "#22c55e", backdropFilter: "blur(8px)",
        animationDelay: "1s",
      }} className="a-floatY">
        ✓ on target
      </div>
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
export default function Hero() {
  const stats = [
    { to: 100, suffix: "M+",  label: "Joint surgeries yearly" },
    { to: 30,  suffix: "%",   label: "Re-injury rate reduced" },
    { to: 6,   suffix: "×",   label: "More coverage per week" },
    { to: 0,   suffix: "",    label: "Hardware required" },
  ];

  return (
    <section style={{
      position: "relative", minHeight: "100vh",
      display: "flex", alignItems: "center",
      overflow: "hidden", background: "#02182b",
    }}>
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: .55 }} />
      <Particles />

      {/* Spotlight */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 60% at 50% 38%, rgba(15,255,197,.07) 0%, transparent 65%)",
      }} />

      {/* Orbs */}
      <div className="orb orb-l a-floatXY" />
      <div className="orb orb-r a-floatY" style={{ animationDelay: "2s" }} />

      <div className="W hero-grid" style={{
        position: "relative", zIndex: 10,
        paddingTop: "clamp(110px,15vw,180px)",
        paddingBottom: "clamp(80px,10vw,130px)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "clamp(40px,6vw,100px)",
        alignItems: "center",
      }}>

        {/* Left — text */}
        <div>
          {/* Eyebrow */}
          <div className="pill a-border" style={{ marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0fffc5", flexShrink: 0 }} className="a-pulse" />
            Nakshatra Hackathon 2026 · Healthcare Track
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(44px,7.5vw,88px)",
            fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1.0,
            marginBottom: 28,
          }}>
            <span style={{ color: "#e8f4f0", display: "block" }}>Rehab that</span>
            <span className="g-text" style={{ display: "block" }}>never sleeps.</span>
          </h1>

          <p style={{
            fontSize: "clamp(15px,1.8vw,18px)", lineHeight: 1.75,
            color: "rgba(232,244,240,.5)", maxWidth: 480, marginBottom: 44,
          }}>
            AI-powered physical joint recovery and cognitive rehabilitation.
            Real-time. Any device. Zero hardware.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 64 }}>
            <Link href="/auth" className="btn-solid" style={{ fontSize: 15, padding: "14px 32px" }}>
              Start for free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#02182b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/features" className="btn-outline" style={{ fontSize: 15, padding: "14px 32px" }}>
              See features
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            borderTop: "1px solid rgba(15,255,197,.08)",
            paddingTop: 28,
          }} className="stats-row">
            {stats.map((s, i) => (
              <div key={s.label} style={{
                paddingRight: 20,
                borderRight: i < 3 ? "1px solid rgba(15,255,197,.07)" : "none",
                paddingLeft: i > 0 ? 20 : 0,
              }}>
                <p className="g-text" style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 800, lineHeight: 1, marginBottom: 5 }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p style={{ fontSize: 11, color: "rgba(232,244,240,.36)", lineHeight: 1.4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — skeleton viz */}
        <div className="hero-viz" style={{ flexShrink: 0 }}>
          <SkeletonViz />
        </div>
      </div>

      {/* Scroll cue */}
      <div className="a-floatY" style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: .45,
      }}>
        <span style={{ fontSize: 9, letterSpacing: ".3em", textTransform: "uppercase", color: "#0fffc5" }}>scroll</span>
        <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #0fffc5, transparent)" }} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-viz { display: none; }
          .stats-row { grid-template-columns: repeat(2,1fr) !important; gap: 16px; }
          .stats-row > div { border-right: none !important; padding-left: 0 !important; }
        }
      `}</style>
    </section>
  );
}
