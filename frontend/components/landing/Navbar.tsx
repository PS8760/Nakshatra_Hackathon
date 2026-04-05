"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { LangSwitcher, useLang } from "@/context/LangContext";

const NAV_LINKS_PLACEHOLDER = []; // navLinks built dynamically via useLang()

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
  const { t } = useLang();

  const navLinks = isLoggedIn ? [
    { label: t("nav.dashboard"),  href: "/dashboard" },
    { label: t("nav.sessions"),   href: "/session" },
    { label: "Exercises",         href: "/exercises" },
    { label: t("nav.cognitive"),  href: "/cognitive-tests" },
    { label: t("nav.chatbot"),    href: "/chatbot" },
  ] : [
    { label: t("nav.features"),   href: "/features" },
    { label: t("nav.how"),        href: "/how-it-works" },
    { label: t("nav.team"),       href: "/team" },
    { label: t("nav.contact"),    href: "/contact" },
  ];

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
      height: 72,
      background: scrolled ? "rgba(11,31,46,.98)" : "rgba(11,31,46,.92)",
      backdropFilter: "blur(24px)",
      borderBottom: `1px solid ${scrolled ? "#1A3447" : "rgba(26,52,71,.5)"}`,
      transition: "all .3s cubic-bezier(.4,0,.2,1)",
      boxShadow: scrolled ? "0 4px 20px rgba(0,0,0,.3)" : "none",
    }}>
      {/* Top accent line */}
      <div style={{ height: 2, background: "#6B9EFF", opacity: scrolled ? .6 : .4, transition: "opacity .3s" }} />

      <div className="W" style={{ height: "calc(100% - 2px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "#6B9EFF15",
            border: "2px solid #6B9EFF40",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .3s",
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1) rotate(5deg)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1) rotate(0deg)"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#6B9EFF" style={{ filter: "drop-shadow(0 0 4px #6B9EFF)" }} />
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#6B9EFF" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: "#FFFFFF", letterSpacing: "-.02em" }}>
            Neuro<span style={{ color: "#6B9EFF" }}>Restore</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 4 }}>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} style={{
              fontSize: 15, fontWeight: 600, padding: "10px 18px", borderRadius: 10,
              textDecoration: "none",
              color: isActive(l.href) ? "#6B9EFF" : "rgba(255,255,255,0.7)",
              background: isActive(l.href) ? "rgba(107,158,255,.1)" : "transparent",
              transition: "all .3s cubic-bezier(.4,0,.2,1)",
              position: "relative",
            }}
              onMouseEnter={(e) => { 
                if (!isActive(l.href)) { 
                  const el = e.currentTarget as HTMLElement; 
                  el.style.color = "#FFFFFF"; 
                  el.style.background = "#1A3447"; 
                  el.style.transform = "translateY(-2px)";
                } 
              }}
              onMouseLeave={(e) => { 
                if (!isActive(l.href)) { 
                  const el = e.currentTarget as HTMLElement; 
                  el.style.color = "rgba(255,255,255,0.7)"; 
                  el.style.background = "transparent"; 
                  el.style.transform = "translateY(0)";
                } 
              }}
            >{l.label}</Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 8 }}>
          <LangSwitcher />
          {isLoggedIn ? (
            /* ── Profile dropdown ── */
            <div ref={dropRef} style={{ position: "relative" }}>
              <button onClick={() => setDropOpen(!dropOpen)} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px 6px 6px", borderRadius: 10,
                background: "#1A3447", border: "1px solid #243B4E",
                cursor: "pointer", transition: "all .2s",
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#6B9EFF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#1A3447"; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: "#6B9EFF20", border: "1.5px solid #6B9EFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#6B9EFF",
                }}>{initials}</div>
                <span style={{ fontSize: 13, color: "#FFFFFF", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.full_name?.split(" ")[0] ?? "User"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transition: "transform .2s", transform: dropOpen ? "rotate(180deg)" : "none" }}>
                  <path d="M2 4l4 4 4-4" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropOpen && (
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 8px)",
                  width: 200, background: "#1A3447",
                  border: "1px solid #243B4E", borderRadius: 14,
                  boxShadow: "0 20px 60px rgba(0,0,0,.3)",
                  overflow: "hidden", zIndex: 200,
                }}>
                  {/* User info */}
                  <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid #1A3447" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{user?.full_name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{user?.email}</p>
                  </div>

                  {[
                    { icon: "👤", label: "Profile",          href: "/profile" },
                    { icon: "📊", label: "Progress Tracking", href: "/dashboard" },
                    { icon: "🏋️", label: "Exercises",        href: "/exercises" },
                    { icon: "📋", label: "History",           href: "/history" },
                    { icon: "📄", label: "Reports",           href: "/reports" },
                    { icon: "💬", label: "AI Chatbot",        href: "/chatbot" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setDropOpen(false)} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 16px", fontSize: 13,
                      color: "rgba(255,255,255,0.7)", textDecoration: "none",
                      transition: "background .15s, color .15s",
                    }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "#1A3447"; el.style.color = "#FFFFFF"; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.color = "rgba(255,255,255,0.7)"; }}
                    >
                      <span style={{ fontSize: 15 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}

                  <div style={{ height: 1, background: "#243B4E", margin: "4px 0" }} />
                  <button onClick={handleLogout} style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 16px", fontSize: 13, color: "#6B9EFF",
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
                color: "rgba(255,255,255,0.7)", textDecoration: "none",
                border: "1px solid #1A3447", transition: "all .18s",
              }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#6B9EFF"; el.style.borderColor = "#6B9EFF"; el.style.background = "rgba(0,94,184,.04)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(255,255,255,0.7)"; el.style.borderColor = "#1A3447"; el.style.background = "transparent"; }}
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
                display: "block", height: 1.5, background: "#6B9EFF", borderRadius: 1,
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
        <div style={{ background: "#1A3447", borderBottom: "1px solid #243B4E", padding: "8px 0 20px" }}>
          <div className="W" style={{ display: "flex", flexDirection: "column" }}>
            {navLinks.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)} style={{
                fontSize: 15, fontWeight: 500, padding: "12px 0",
                color: isActive(l.href) ? "#6B9EFF" : "rgba(255,255,255,0.7)",
                textDecoration: "none", borderBottom: "1px solid #243B4E",
              }}>{l.label}</Link>
            ))}
            {isLoggedIn ? (
              <>
                {["/profile", "/history", "/reports"].map((href) => (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    fontSize: 14, padding: "10px 0", color: "rgba(255,255,255,0.7)",
                    textDecoration: "none", borderBottom: "1px solid #243B4E",
                  }}>{href.replace("/", "").replace("-", " ")}</Link>
                ))}
                <button onClick={handleLogout} style={{
                  marginTop: 12, padding: "11px 0", borderRadius: 10, fontSize: 14,
                  background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)",
                  color: "#6B9EFF", cursor: "pointer",
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
