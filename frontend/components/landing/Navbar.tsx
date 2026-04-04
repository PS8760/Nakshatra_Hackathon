"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const PUBLIC_LINKS = [
  { label: "Features",     href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Team",         href: "/team" },
  { label: "Contact",      href: "/contact" },
];

const APP_LINKS = [
  { label: "Dashboard",   href: "/dashboard" },
  { label: "Sessions",    href: "/session" },
  { label: "Cognitive",   href: "/cognitive-tests" },
  { label: "Chatbot",     href: "/chatbot" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuthStore();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isLoggedIn = !!token;
  const navLinks = isLoggedIn ? APP_LINKS : PUBLIC_LINKS;

  const handleLogout = () => {
    logout();
    setDropOpen(false);
    router.push("/");
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      height: 64,
      background: scrolled ? "rgba(2,24,43,.96)" : "rgba(2,24,43,.6)",
      backdropFilter: "blur(20px)",
      borderBottom: `1px solid ${scrolled ? "rgba(15,255,197,.1)" : "rgba(15,255,197,.05)"}`,
      transition: "background .3s, border-color .3s",
    }}>
      {/* Top accent line */}
      <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.35),transparent)" }} />

      <div className="W" style={{ height: "calc(100% - 1px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "rgba(15,255,197,.1)", border: "1px solid rgba(15,255,197,.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} className="a-border">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="2.5" fill="#0fffc5" style={{ filter: "drop-shadow(0 0 4px #0fffc5)" }} />
              <path d="M7 1.5v2M7 10.5v2M1.5 7h2M10.5 7h2" stroke="#0fffc5" strokeWidth="1.2" strokeLinecap="round" opacity=".5"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e8f4f0", letterSpacing: "-.015em" }}>
            Neuro<span style={{ color: "#0fffc5" }}>Restore</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 2 }}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} style={{
              fontSize: 14, fontWeight: 500, padding: "6px 13px", borderRadius: 8,
              textDecoration: "none",
              color: isActive(l.href) ? "#0fffc5" : "rgba(232,244,240,.55)",
              background: isActive(l.href) ? "rgba(15,255,197,.08)" : "transparent",
              transition: "all .18s",
            }}
              onMouseEnter={(e) => { if (!isActive(l.href)) { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(232,244,240,.9)"; el.style.background = "rgba(255,255,255,.04)"; } }}
              onMouseLeave={(e) => { if (!isActive(l.href)) { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(232,244,240,.55)"; el.style.background = "transparent"; } }}
            >{l.label}</Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 8 }}>
          {isLoggedIn ? (
            /* ── Profile dropdown ── */
            <div ref={dropRef} style={{ position: "relative" }}>
              <button onClick={() => setDropOpen(!dropOpen)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px 6px 6px", borderRadius: 10,
                background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
                cursor: "pointer", transition: "all .2s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(15,255,197,.3)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,.1)"; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "rgba(15,255,197,.15)", border: "1.5px solid rgba(15,255,197,.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#0fffc5",
                }}>{initials}</div>
                <span style={{ fontSize: 13, color: "rgba(232,244,240,.8)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name?.split(" ")[0] ?? "User"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform .2s", transform: dropOpen ? "rotate(180deg)" : "none" }}>
                  <path d="M2 4l4 4 4-4" stroke="rgba(232,244,240,.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  width: 200, background: "#031e35",
                  border: "1px solid rgba(15,255,197,.15)", borderRadius: 14,
                  boxShadow: "0 20px 60px rgba(0,0,0,.5)",
                  overflow: "hidden", zIndex: 200,
                }}>
                  {/* User info */}
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e8f4f0" }}>{user?.full_name}</p>
                    <p style={{ fontSize: 11, color: "rgba(232,244,240,.4)", marginTop: 2 }}>{user?.email}</p>
                  </div>

                  {[
                    { icon: "👤", label: "Profile",          href: "/profile" },
                    { icon: "📊", label: "Progress Tracking", href: "/dashboard" },
                    { icon: "📋", label: "History",           href: "/history" },
                    { icon: "📄", label: "Reports",           href: "/reports" },
                    { icon: "💬", label: "AI Chatbot",        href: "/chatbot" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setDropOpen(false)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px", fontSize: 13,
                      color: "rgba(232,244,240,.65)", textDecoration: "none",
                      transition: "background .15s, color .15s",
                    }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,.05)"; el.style.color = "#e8f4f0"; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "rgba(232,244,240,.65)"; }}
                    >
                      <span style={{ fontSize: 15 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}

                  <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "4px 0" }} />
                  <button onClick={handleLogout} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", fontSize: 13, color: "#ef4444",
                    background: "none", border: "none", cursor: "pointer",
                    transition: "background .15s",
                  }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,.08)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 15 }}>🚪</span> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Auth buttons ── */
            <>
              <Link href="/auth" style={{
                fontSize: 13, fontWeight: 500, padding: "7px 16px", borderRadius: 8,
                color: "rgba(232,244,240,.6)", textDecoration: "none",
                border: "1px solid rgba(15,255,197,.12)", transition: "all .18s",
              }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#0fffc5"; el.style.borderColor = "rgba(15,255,197,.35)"; el.style.background = "rgba(15,255,197,.04)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(232,244,240,.6)"; el.style.borderColor = "rgba(15,255,197,.12)"; el.style.background = "transparent"; }}
              >Sign in</Link>
              <Link href="/auth" className="btn-solid" style={{ padding: "8px 18px", fontSize: 13, borderRadius: 8 }}>
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden" style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
          <div style={{ width: 22, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                display: "block", height: 1.5, background: "#0fffc5", borderRadius: 1,
                transition: "all .25s",
                transform: mobileOpen ? (i === 0 ? "rotate(45deg) translateY(6.5px)" : i === 2 ? "rotate(-45deg) translateY(-6.5px)" : "scaleX(0)") : "none",
                opacity: mobileOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ background: "rgba(2,24,43,.98)", borderBottom: "1px solid rgba(15,255,197,.08)", padding: "8px 0 20px" }}>
          <div className="W" style={{ display: "flex", flexDirection: "column" }}>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{
                fontSize: 15, fontWeight: 500, padding: "12px 0",
                color: isActive(l.href) ? "#0fffc5" : "rgba(232,244,240,.65)",
                textDecoration: "none", borderBottom: "1px solid rgba(15,255,197,.05)",
              }}>{l.label}</Link>
            ))}
            {isLoggedIn ? (
              <>
                {["/profile", "/history", "/reports"].map((href) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    fontSize: 14, padding: "10px 0", color: "rgba(232,244,240,.5)",
                    textDecoration: "none", borderBottom: "1px solid rgba(15,255,197,.04)",
                  }}>{href.replace("/", "").replace("-", " ")}</Link>
                ))}
                <button onClick={handleLogout} style={{
                  marginTop: 12, padding: "11px 0", borderRadius: 10, fontSize: 14,
                  background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
                  color: "#ef4444", cursor: "pointer",
                }}>Sign out</button>
              </>
            ) : (
              <Link href="/auth" className="btn-solid" style={{ marginTop: 14, borderRadius: 10, justifyContent: "center" }}>
                Get started
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
