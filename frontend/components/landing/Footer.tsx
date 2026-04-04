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
    <footer style={{ borderTop: "1px solid rgba(15,255,197,.07)", background: "#02182b", padding: "56px 0 40px" }}>
      <div className="W">
        {/* Top */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 52 }}>

          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(15,255,197,.09)", border: "1px solid rgba(15,255,197,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="2.2" fill="#0fffc5" style={{ filter: "drop-shadow(0 0 3px #0fffc5)" }} />
                  <path d="M6 1v1.8M6 9.2V11M1 6h1.8M9.2 6H11" stroke="#0fffc5" strokeWidth="1.1" strokeLinecap="round" opacity=".5"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0" }}>
                Neuro<span style={{ color: "#0fffc5" }}>Restore</span> AI
              </span>
            </Link>
            <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(232,244,240,.32)" }}>
              AI-powered rehabilitation for physical joint recovery and cognitive improvement. No hardware required.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(232,244,240,.28)", marginBottom: 16 }}>Navigation</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} style={{ fontSize: 14, color: "rgba(232,244,240,.42)", textDecoration: "none", transition: "color .18s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0fffc5")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(232,244,240,.42)")}
                >{l.label}</Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(232,244,240,.28)", marginBottom: 16 }}>Get started</p>
            <Link href="/auth" className="btn-solid" style={{ fontSize: 13, padding: "10px 22px", borderRadius: 9, display: "inline-flex" }}>
              Create free account
            </Link>
            <p style={{ fontSize: 12, color: "rgba(232,244,240,.25)", marginTop: 10 }}>No credit card required.</p>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid rgba(15,255,197,.06)", paddingTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <p style={{ fontSize: 12, color: "rgba(232,244,240,.2)" }}>© 2026 NeuroRestore AI · Nakshatra Hackathon · Healthcare Track</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="a-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#0fffc5" }} />
            <span style={{ fontSize: 12, color: "rgba(232,244,240,.25)" }}>Built in 24 hours · Team of 4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
