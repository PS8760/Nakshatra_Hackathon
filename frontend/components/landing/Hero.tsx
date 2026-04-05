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



/* ── Healthcare Image Component ───────────────────────────────────────────── */
function HealthcareImage() {
  return (
    <div className="a-floatY" style={{ 
      position: "relative", 
      width: "100%",
      maxWidth: 500,
    }}>
      {/* Colorful glow behind */}
      <div style={{
        position: "absolute", 
        inset: -30, 
        borderRadius: "50%",
        background: "rgba(74,127,255,.2)",
        filter: "blur(40px)",
        zIndex: 0,
      }} />
      
      {/* Image container with colorful border */}
      <div style={{
        width: "100%", 
        aspectRatio: "4/3",
        background: "rgba(74,127,255,0.08)",
        border: "3px solid #6B9EFF",
        borderRadius: 24, 
        position: "relative", 
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(74,127,255,0.3)",
        zIndex: 1,
      }}>
        {/* Healthcare/Rehabilitation image */}
        <img 
          src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=600&fit=crop&q=80"
          alt="AI-Powered Rehabilitation"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          onError={(e) => {
            // Fallback to a different rehabilitation image if the first one fails
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=600&fit=crop&q=80";
          }}
        />

        {/* Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.2)",
          pointerEvents: "none",
        }} />

        {/* Animated corner accents */}
        <div style={{
          position: "absolute", top: 20, left: 20,
          width: 40, height: 40,
          border: "3px solid #6B9EFF",
          borderRight: "none", borderBottom: "none",
          borderRadius: "8px 0 0 0",
          animation: "pulseDot 2s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: 20, right: 20,
          width: 40, height: 40,
          border: "3px solid #6B9EFF",
          borderLeft: "none", borderTop: "none",
          borderRadius: "0 0 8px 0",
          animation: "pulseDot 2s ease-in-out infinite 1s",
        }} />

        {/* Floating badges */}
        <div style={{
          position: "absolute", top: 20, right: 20,
          padding: "8px 14px", borderRadius: 12,
          background: "#6B9EFF", backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(74,127,255,0.5)",
          animation: "floatY 3s ease-in-out infinite",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "white", letterSpacing: ".05em" }}>
            🎯 AI-POWERED
          </p>
        </div>

        <div style={{
          position: "absolute", bottom: 20, left: 20,
          padding: "8px 14px", borderRadius: 12,
          background: "#6B9EFF", backdropFilter: "blur(8px)",
          boxShadow: "0 4px 20px rgba(74,255,184,0.5)",
          animation: "floatY 3s ease-in-out infinite 1.5s",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0B1F2E", letterSpacing: ".05em" }}>
            📱 ZERO HARDWARE
          </p>
        </div>
      </div>

      {/* Floating colorful data chips */}
      <div style={{
        position: "absolute", top: -10, right: -25,
        background: "#6B9EFF", 
        border: "2px solid rgba(255,255,255,.8)",
        borderRadius: 12, padding: "10px 16px", fontSize: 13, fontFamily: "monospace",
        color: "#FFFFFF", backdropFilter: "blur(12px)", fontWeight: 700,
        boxShadow: "0 4px 20px rgba(74,127,255,.4)",
        zIndex: 2,
      }} className="a-floatXY">
        33 joints tracked
      </div>
      <div style={{
        position: "absolute", bottom: -10, left: -35,
        background: "#6B9EFF", 
        border: "2px solid rgba(255,255,255,.8)",
        borderRadius: 12, padding: "10px 16px", fontSize: 13, fontFamily: "monospace",
        color: "#0B1F2E", backdropFilter: "blur(12px)", fontWeight: 700,
        animationDelay: "1s",
        boxShadow: "0 4px 20px rgba(255,184,74,.4)",
        zIndex: 2,
      }} className="a-floatY">
        Real-time analysis
      </div>
    </div>
  );
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
export default function Hero() {
  const stats = [
    { to: 100, suffix: "M+",  label: "Joint surgeries yearly", color: "#6B9EFF" },
    { to: 30,  suffix: "%",   label: "Re-injury rate reduced", color: "#6B9EFF" },
    { to: 6,   suffix: "×",   label: "More coverage per week", color: "#6B9EFF" },
    { to: 0,   suffix: "",    label: "Hardware required", color: "#6B9EFF" },
  ];

  return (
    <section style={{
      position: "relative", minHeight: "100vh",
      display: "flex", alignItems: "center",
      overflow: "hidden", 
      background: "#0B1F2E",
      paddingTop: 100,
      paddingBottom: 80,
    }}>
      {/* No grid, no particles, no orbs - plain dark blue background */}

      <div className="W hero-grid" style={{
        position: "relative", zIndex: 10,
        paddingTop: "clamp(60px,10vw,100px)",
        paddingBottom: "clamp(80px,12vw,120px)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "clamp(60px,10vw,140px)",
        alignItems: "center",
      }}>

        {/* Left — text */}
        <div>
          {/* Eyebrow */}
          <div className="pill" style={{ 
            marginBottom: 40, 
            cursor: "default", 
            animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s backwards",
            fontSize: 12,
            padding: "12px 24px",
          }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF", flexShrink: 0 }} className="a-pulse" />
            Nakshatra Hackathon 2026 · Healthcare Track
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(56px,10vw,104px)",
            fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1.05,
            marginBottom: 44,
          }}>
            <span style={{ color: "#FFFFFF", display: "block", animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s backwards" }}>
              Rehab that
            </span>
            <span className="g-text" style={{ display: "block", animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s backwards" }}>
              never sleeps.
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(18px,2.4vw,24px)", lineHeight: 1.7,
            color: "rgba(255,255,255,0.7)", maxWidth: 600, marginBottom: 60,
            animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s backwards"
          }}>
            AI-powered physical joint recovery and cognitive rehabilitation.
            Real-time pose tracking. Any device. Zero hardware.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 100, animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s backwards" }}>
            <Link href="/auth" className="btn-solid" style={{ fontSize: 18, padding: "22px 48px" }}>
              Start for free
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link href="/features" className="btn-outline" style={{ fontSize: 18, padding: "22px 48px" }}>
              See features
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4,1fr)",
            gap: 28,
            animation: "fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.7s backwards"
          }} className="stats-row">
            {stats.map((s) => (
              <div key={s.label} style={{
                padding: "36px 32px",
                background: "#1A3447",
                borderRadius: 16,
                border: `2px solid ${s.color}`,
                boxShadow: `0 6px 24px ${s.color}30`,
                transition: "all .3s cubic-bezier(.4,0,.2,1)",
                cursor: "default",
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-8px) scale(1.05)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${s.color}50`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0) scale(1)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${s.color}30`;
                }}
              >
                <p style={{ fontSize: "clamp(44px,6vw,60px)", fontWeight: 900, lineHeight: 1, marginBottom: 18, color: s.color }}>
                  <Counter to={s.to} suffix={s.suffix} />
                </p>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — healthcare image */}
        <div className="hero-viz" style={{ 
          flexShrink: 0, 
          animation: "scaleIn 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s backwards",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <HealthcareImage />
        </div>
      </div>

      {/* Scroll cue */}
      <div className="a-floatY" style={{
        position: "absolute", bottom: 50, left: "50%", transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      }}>
        <span style={{ fontSize: 11, letterSpacing: ".3em", textTransform: "uppercase", color: "#6B9EFF", fontWeight: 700 }}>scroll</span>
        <div style={{ width: 3, height: 56, background: "#6B9EFF", borderRadius: 2 }} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hero-grid { 
            grid-template-columns: 1fr !important; 
            gap: 50px !important;
            padding-top: 40px !important;
            padding-bottom: 60px !important;
          }
          .hero-viz { 
            width: 100%;
            max-width: 100%;
            padding: 0 20px;
          }
          .stats-row { 
            grid-template-columns: repeat(2,1fr) !important; 
            gap: 20px !important; 
          }
        }
        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
