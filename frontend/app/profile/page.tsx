"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout } = useAuthStore();

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (!token) router.push("/auth");
  }, [token, router]);

  if (!token || !user) return null;

  const initials = user.full_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) ?? "U";

  return (
    <div style={{ minHeight: "100vh", background: "#02182b", color: "#e8f4f0", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 40, paddingBottom: 56, maxWidth: 640 }}>

        <div className="pill" style={{ marginBottom: 20 }}>👤 Profile</div>

        {/* Avatar card */}
        <div style={{
          background: "rgba(255,255,255,0.025)", border: "1px solid rgba(15,255,197,0.12)",
          borderRadius: 20, padding: "32px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg,transparent,rgba(15,255,197,.25),transparent)" }} />
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(15,255,197,0.12)", border: "2px solid rgba(15,255,197,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 800, color: "#0fffc5",
          }}>{initials}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e8f4f0", marginBottom: 4 }}>{user.full_name}</h1>
            <p style={{ fontSize: 14, color: "rgba(232,244,240,0.5)", marginBottom: 6 }}>{user.email}</p>
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600,
              background: user.role === "clinician" ? "rgba(99,102,241,0.12)" : "rgba(15,255,197,0.08)",
              border: user.role === "clinician" ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(15,255,197,0.2)",
              color: user.role === "clinician" ? "#818cf8" : "#0fffc5",
              textTransform: "capitalize",
            }}>{user.role}</span>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "📊", label: "Progress Tracking",  href: "/dashboard",        color: "#0fffc5" },
            { icon: "📋", label: "Session History",     href: "/history",          color: "#60a5fa" },
            { icon: "🧠", label: "Cognitive Tests",     href: "/cognitive-tests",  color: "#818cf8" },
            { icon: "📄", label: "Download Reports",    href: "/reports",          color: "#34d399" },
            { icon: "💬", label: "AI Chatbot",          href: "/chatbot",          color: "#f59e0b" },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 14, textDecoration: "none",
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
              transition: "all .2s",
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = `${item.color}10`; el.style.borderColor = `${item.color}30`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.025)"; el.style.borderColor = "rgba(255,255,255,0.07)"; }}
            >
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(232,244,240,0.75)" }}>{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginLeft: "auto", opacity: .35 }}>
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          ))}

          <button onClick={() => { logout(); router.push("/"); }} style={{
            padding: "14px 18px", borderRadius: 14, fontSize: 14, fontWeight: 600,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", cursor: "pointer", transition: "all .2s", marginTop: 4,
            display: "flex", alignItems: "center", gap: 14,
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.14)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"; }}
          >
            <span style={{ fontSize: 20 }}>🚪</span> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
