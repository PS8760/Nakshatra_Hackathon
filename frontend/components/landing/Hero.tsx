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
        ctx.fillStyle = `rgba(255,255,255,${p.a})`; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) { ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.strokeStyle = `rgba(255,255,255,${(1 - d / 100) * .055})`; ctx.lineWidth = .5; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />;
}

/* ── 3D Human Model ────────────────────────────────────────────────────────── */
function HumanModel3D() {
  return (
    <div className="a-floatY" style={{ 
      position: "relative", 
      width: 320, 
      height: 400,
      perspective: "1000px",
    }}>
      {/* Glow behind */}
      <div style={{
        position: "absolute", 
        inset: -60, 
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,255,255,.15) 0%, transparent 70%)",
        filter: "blur(30px)",
        animation: "glowPulse 4s ease-in-out infinite",
      }} />

      {/* 3D Human Figure */}
      <div style={{
        position: "relative",
        width: "100%",
        height: "100%",
        transformStyle: "preserve-3d",
        animation: "rotate3D 20s linear infinite",
      }}>
        {/* Head */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "15%",
          transform: "translateX(-50%)",
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(255,255,255,.15) 0%, rgba(255,255,255,.05) 100%)",
          border: "2px solid rgba(255,255,255,.4)",
          boxShadow: "0 0 30px rgba(255,255,255,.3), inset 0 0 20px rgba(255,255,255,.1)",
          backdropFilter: "blur(10px)",
        }}>
          {/* Face details */}
          <div style={{ position: "absolute", top: "35%", left: "30%", width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.6)" }} />
          <div style={{ position: "absolute", top: "35%", right: "30%", width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.6)" }} />
          <div style={{ position: "absolute", bottom: "25%", left: "50%", transform: "translateX(-50%)", width: 20, height: 2, borderRadius: 2, background: "rgba(255,255,255,.4)" }} />
        </div>

        {/* Torso */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "30%",
          transform: "translateX(-50%)",
          width: 80,
          height: 120,
          borderRadius: "20px 20px 10px 10px",
          background: "linear-gradient(180deg, rgba(255,255,255,.12) 0%, rgba(255,255,255,.06) 100%)",
          border: "2px solid rgba(255,255,255,.35)",
          boxShadow: "0 0 25px rgba(255,255,255,.25), inset 0 0 15px rgba(255,255,255,.08)",
          backdropFilter: "blur(10px)",
        }}>
          {/* Chest indicator */}
          <div style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,.3)",
            animation: "pulseDot 2s ease-in-out infinite",
          }} />
        </div>

        {/* Left Arm */}
        <div style={{
          position: "absolute",
          left: "20%",
          top: "35%",
          width: 20,
          height: 80,
          borderRadius: 10,
          background: "linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.05) 100%)",
          border: "2px solid rgba(255,255,255,.3)",
          boxShadow: "0 0 20px rgba(255,255,255,.2)",
          transformOrigin: "top center",
          animation: "swingArm 3s ease-in-out infinite",
        }}>
          {/* Elbow joint */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "rgba(255,255,255,.5)",
            boxShadow: "0 0 10px rgba(255,255,255,.5)",
          }} />
        </div>

        {/* Right Arm */}
        <div style={{
          position: "absolute",
          right: "20%",
          top: "35%",
          width: 20,
          height: 80,
          borderRadius: 10,
          background: "linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.05) 100%)",
          border: "2px solid rgba(255,255,255,.3)",
          boxShadow: "0 0 20px rgba(255,255,255,.2)",
          transformOrigin: "top center",
          animation: "swingArm 3s ease-in-out infinite reverse",
        }}>
          {/* Elbow joint */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "rgba(255,255,255,.5)",
            boxShadow: "0 0 10px rgba(255,255,255,.5)",
          }} />
        </div>

        {/* Left Leg */}
        <div style={{
          position: "absolute",
          left: "35%",
          top: "60%",
          width: 22,
          height: 100,
          borderRadius: 11,
          background: "linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.05) 100%)",
          border: "2px solid rgba(255,255,255,.3)",
          boxShadow: "0 0 20px rgba(255,255,255,.2)",
          transformOrigin: "top center",
          animation: "swingLeg 3s ease-in-out infinite",
        }}>
          {/* Knee joint with angle indicator */}
          <div style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(255,255,255,.6)",
            boxShadow: "0 0 15px rgba(255,255,255,.6)",
            border: "2px solid rgba(255,255,255,.8)",
          }} />
          {/* Angle label */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "-40px",
            background: "rgba(0,0,0,.85)",
            border: "1px solid rgba(255,255,255,.3)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontFamily: "monospace",
            color: "#ffffff",
            fontWeight: 600,
            boxShadow: "0 0 15px rgba(255,255,255,.2)",
          }}>124°</div>
        </div>

        {/* Right Leg */}
        <div style={{
          position: "absolute",
          right: "35%",
          top: "60%",
          width: 22,
          height: 100,
          borderRadius: 11,
          background: "linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.05) 100%)",
          border: "2px solid rgba(255,255,255,.3)",
          boxShadow: "0 0 20px rgba(255,255,255,.2)",
          transformOrigin: "top center",
          animation: "swingLeg 3s ease-in-out infinite reverse",
        }}>
          {/* Knee joint */}
          <div style={{
            position: "absolute",
            top: "55%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "rgba(255,255,255,.6)",
            boxShadow: "0 0 15px rgba(255,255,255,.6)",
            border: "2px solid rgba(255,255,255,.8)",
          }} />
        </div>

        {/* Floating status indicators */}
        <div style={{
          position: "absolute",
          top: "10%",
          right: "-60px",
          background: "rgba(0,0,0,.9)",
          border: "1px solid rgba(255,255,255,.3)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          fontFamily: "monospace",
          color: "#ffffff",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 20px rgba(255,255,255,.2)",
          animation: "floatXY 4s ease-in-out infinite",
        }}>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 2 }}>POSTURE</div>
          <div style={{ fontWeight: 700 }}>✓ Optimal</div>
        </div>

        <div style={{
          position: "absolute",
          bottom: "15%",
          left: "-70px",
          background: "rgba(0,0,0,.9)",
          border: "1px solid rgba(255,255,255,.25)",
          borderRadius: 10,
          padding: "8px 12px",
          fontSize: 12,
          fontFamily: "monospace",
          color: "#ffffff",
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 20px rgba(255,255,255,.15)",
          animation: "floatY 5s ease-in-out infinite",
          animationDelay: "1s",
        }}>
          <div style={{ fontSize: 10, opacity: .6, marginBottom: 2 }}>TRACKING</div>
          <div style={{ fontWeight: 700 }}>33 Points</div>
        </div>
      </div>

      {/* Interaction hint */}
      <div style={{
        position: "absolute",
        bottom: -40,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 11,
        color: "rgba(255,255,255,.4)",
        textAlign: "center",
        animation: "fadeIn 2s ease-in-out",
      }}>
        Real-time motion tracking
      </div>

      <style>{`
        @keyframes rotate3D {
          0%, 100% { transform: rotateY(-8deg) rotateX(2deg); }
          50% { transform: rotateY(8deg) rotateX(-2deg); }
        }
        @keyframes swingArm {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes swingLeg {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
      `}</style>
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
      overflow: "hidden", background: "#000000",
    }}>
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: .55 }} />
      <Particles />

      {/* Spotlight */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 60% at 50% 38%, rgba(255,255,255,.07) 0%, transparent 65%)",
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
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} className="a-pulse" />
            Nakshatra Hackathon 2026 · Healthcare Track
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(48px,8vw,96px)",
            fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1.05,
            marginBottom: 32,
          }}>
            <span style={{ color: "#ffffff", display: "block" }}>Rehab that</span>
            <span className="g-text" style={{ display: "block" }}>never sleeps.</span>
          </h1>

          <p style={{
            fontSize: "clamp(16px,2vw,20px)", lineHeight: 1.7,
            color: "rgba(255,255,255,.65)", maxWidth: 520, marginBottom: 48,
            fontWeight: 400,
          }}>
            AI-powered physical joint recovery and cognitive rehabilitation.
            Real-time motion tracking. Any device. Zero hardware required.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 68 }}>
            <Link href="/auth" className="btn-solid" style={{ fontSize: 16, padding: "16px 36px", borderRadius: 12 }}>
              Start for free
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/features" className="btn-outline" style={{ fontSize: 16, padding: "16px 36px", borderRadius: 12 }}>
              See features
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            borderTop: "1px solid rgba(255,255,255,.12)",
            paddingTop: 32,
            gap: 24,
          }} className="stats-row">
            {stats.map((s, i) => (
              <div key={s.label} style={{
                paddingRight: i < 3 ? 24 : 0,
                borderRight: i < 3 ? "1px solid rgba(255,255,255,.1)" : "none",
              }}>
                <p className="g-text" style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.5, fontWeight: 500 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — 3D human model */}
        <div className="hero-viz" style={{ flexShrink: 0 }}>
          <HumanModel3D />
        </div>
      </div>

      {/* Scroll cue */}
      <div className="a-floatY" style={{
        position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: .45,
      }}>
        <span style={{ fontSize: 9, letterSpacing: ".3em", textTransform: "uppercase", color: "#ffffff" }}>scroll</span>
        <div style={{ width: 1, height: 32, background: "linear-gradient(to bottom, #ffffff, transparent)" }} />
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
