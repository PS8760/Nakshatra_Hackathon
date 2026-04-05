"use client";
import Link from "next/link";

const LINKS = [
  { label: "Features",     href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Team",         href: "/team" },
  { label: "Contact",      href: "/contact" },
];

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #1A3447", background: "#0B1F2E", padding: "56px 0 40px" }}>
      <div className="W">
        {/* Top */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 52 }}>

          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(0,94,184,.09)", border: "1px solid rgba(0,94,184,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="2.2" fill="#6B9EFF" style={{ filter: "drop-shadow(0 0 3px #6B9EFF)" }} />
                  <path d="M6 1v1.8M6 9.2V11M1 6h1.8M9.2 6H11" stroke="#6B9EFF" strokeWidth="1.1" strokeLinecap="round" opacity=".5"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#FFFFFF" }}>
                Neuro<span style={{ color: "#6B9EFF" }}>Restore</span> AI
              </span>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.5)" }}>
              AI-powered rehabilitation for physical joint recovery and cognitive improvement. No hardware required.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Navigation</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textDecoration: "none", transition: "color .18s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#6B9EFF")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>Get started</p>
            <Link href="/auth" className="btn-solid" style={{ fontSize: 13, padding: "10px 22px", borderRadius: 9, display: "inline-flex" }}>
              Create free account
            </Link>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>No credit card required.</p>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid #1A3447", paddingTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>© 2026 NeuroRestore AI · Nakshatra Hackathon · Healthcare Track</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="a-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--tertiary)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Built in 24 hours · Team of 4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
