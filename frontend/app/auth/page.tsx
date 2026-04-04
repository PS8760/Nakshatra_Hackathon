"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { login, register } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

type Mode = "login" | "register";

function Field({ label, type = "text", value, onChange, required, autoComplete }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const active = focused || value.length > 0;
  const isPw = type === "password";

  return (
    <div style={{ position: "relative" }}>
      <input
        type={isPw ? (showPw ? "text" : "password") : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={autoComplete}
        placeholder=""
        style={{
          width: "100%",
          background: focused ? "rgba(2,24,43,0.9)" : "rgba(2,24,43,0.55)",
          border: `1px solid ${focused ? "rgba(15,255,197,0.5)" : value ? "rgba(15,255,197,0.22)" : "rgba(15,255,197,0.1)"}`,
          color: "#e8f4f0", borderRadius: 12,
          padding: isPw ? "22px 44px 10px 16px" : "22px 16px 10px",
          outline: "none", fontSize: 14, fontFamily: "inherit",
          transition: "all .2s",
          boxShadow: focused ? "0 0 0 3px rgba(15,255,197,0.07)" : "none",
        }}
      />
      <label style={{
        position: "absolute", left: 16,
        top: active ? 8 : 16,
        fontSize: active ? 10 : 14,
        color: focused ? "#0fffc5" : active ? "rgba(15,255,197,0.55)" : "rgba(232,244,240,0.3)",
        pointerEvents: "none", transition: "all .18s",
        letterSpacing: active ? ".07em" : "0",
        textTransform: active ? "uppercase" : "none",
        fontWeight: active ? 600 : 400,
      }}>{label}</label>

      {isPw && (
        <button type="button" onClick={() => setShowPw(!showPw)} style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(232,244,240,0.3)", padding: 4, transition: "color .2s",
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#0fffc5"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "rgba(232,244,240,0.3)"; }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {showPw
              ? <><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3 3l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>
              : <><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2"/><circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/></>
            }
          </svg>
        </button>
      )}

      {/* Focus line */}
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: focused ? "translateX(-50%) scaleX(1)" : "translateX(-50%) scaleX(0)",
        width: "calc(100% - 24px)", height: 1,
        background: "linear-gradient(90deg, transparent, #0fffc5, transparent)",
        transition: "transform .3s", borderRadius: 1,
      }} />
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, hydrate, token } = useAuthStore();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    hydrate();
    // Handle Google OAuth error redirect
    const err = searchParams?.get("error");
    if (err === "google_not_configured") {
      setError("Google sign-in is not yet configured. Please use email & password.");
    }
    setTimeout(() => {
      if (cardRef.current) { cardRef.current.style.opacity = "1"; cardRef.current.style.transform = "translateY(0)"; }
    }, 60);
  }, [hydrate, searchParams]);

  useEffect(() => {
    if (mounted && token) router.replace("/dashboard");
  }, [mounted, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const res = await login(form.email, form.password);
        setAuth(res.data.user, res.data.access_token);
        router.push("/dashboard");
      } else {
        await register(form.email, form.name, form.password);
        const res = await login(form.email, form.password);
        setAuth(res.data.user, res.data.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogle = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${apiUrl}/auth/google`;
  };

  const fillDemo = (type: "patient" | "doctor") => {
    setMode("login"); setError("");
    setForm({
      name: "",
      email: type === "patient" ? "demo@neurorestore.ai" : "doctor@neurorestore.ai",
      password: type === "patient" ? "Demo@1234" : "Doctor@1234",
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#02182b",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "80px 16px 24px", position: "relative", overflow: "hidden",
    }}>
      {/* Grid */}
      <div className="grid-bg" style={{ position: "absolute", inset: 0, opacity: .3 }} />

      {/* Ambient orbs */}
      <div className="a-floatXY" style={{ position: "absolute", top: "15%", left: "10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,255,197,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div className="a-floatY" style={{ position: "absolute", bottom: "15%", right: "8%", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,255,197,0.03) 0%, transparent 70%)", pointerEvents: "none", animationDelay: "1.5s" }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 420 }}>

        <div ref={cardRef} style={{
          opacity: 0, transform: "translateY(20px)",
          transition: "opacity .5s ease, transform .5s ease",
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(15,255,197,0.1)",
          borderRadius: 20, backdropFilter: "blur(20px)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          overflow: "hidden", position: "relative",
        }}>
          {/* Top glow */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "70%", height: 1, background: "linear-gradient(90deg, transparent, rgba(15,255,197,0.35), transparent)" }} />

          <div style={{ padding: "32px 32px 28px" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(15,255,197,0.1)", border: "1px solid rgba(15,255,197,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div className="a-pulse" style={{ width: 12, height: 12, borderRadius: "50%", background: "#0fffc5" }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#e8f4f0" }}>
                Neuro<span style={{ color: "#0fffc5" }}>Restore</span> AI
              </span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#e8f4f0", marginBottom: 6 }}>
              {mode === "login" ? "Welcome back." : "Create account."}
            </h1>
            <p style={{ fontSize: 13, color: "rgba(232,244,240,0.38)", marginBottom: 24, lineHeight: 1.5 }}>
              {mode === "login" ? "Sign in to continue your recovery journey." : "Start your AI-powered rehabilitation today."}
            </p>

            {/* Mode toggle */}
            <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", padding: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(15,255,197,0.08)", marginBottom: 20 }}>
              {(["login", "register"] as Mode[]).map((m) => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                  flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600, borderRadius: 9,
                  border: "none", cursor: "pointer", transition: "all .2s",
                  background: mode === m ? "rgba(15,255,197,0.12)" : "transparent",
                  color: mode === m ? "#0fffc5" : "rgba(232,244,240,0.35)",
                  outline: mode === m ? "1px solid rgba(15,255,197,0.2)" : "1px solid transparent",
                }}>{m === "login" ? "Sign in" : "Sign up"}</button>
              ))}
            </div>

            {/* Google */}
            <button onClick={handleGoogle} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "12px 0", borderRadius: 12, fontSize: 13, fontWeight: 500,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              color: "#e8f4f0", cursor: "pointer", transition: "all .2s", marginBottom: 18,
            }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.08)"; el.style.borderColor = "rgba(255,255,255,0.18)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = "rgba(255,255,255,0.04)"; el.style.borderColor = "rgba(255,255,255,0.09)"; }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(15,255,197,0.08)" }} />
              <span style={{ fontSize: 11, color: "rgba(232,244,240,0.25)", letterSpacing: ".05em" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(15,255,197,0.08)" }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {error && (
                <div style={{
                  background: "rgba(255,80,80,0.07)", border: "1px solid rgba(255,80,80,0.2)",
                  borderRadius: 10, padding: "10px 14px", color: "#ff8a8a", fontSize: 12,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#ff8a8a" strokeWidth="1.2"/>
                    <path d="M7 4v4M7 10v.5" stroke="#ff8a8a" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  {error}
                </div>
              )}

              {mode === "register" && (
                <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required autoComplete="name" />
              )}
              <Field label="Email address" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required autoComplete="email" />
              <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required autoComplete={mode === "login" ? "current-password" : "new-password"} />

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                background: "#0fffc5", color: "#02182b", border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? .7 : 1,
                boxShadow: "0 0 20px rgba(15,255,197,0.28)",
                transition: "all .2s", marginTop: 4,
              }}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(2,24,43,0.3)", borderTopColor: "#02182b", display: "inline-block", animation: "spinCW .8s linear infinite" }} />
                    {mode === "login" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : (mode === "login" ? "Sign in →" : "Create account →")}
              </button>
            </form>

            {/* Demo shortcuts */}
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid rgba(15,255,197,0.07)" }}>
              <p style={{ fontSize: 11, textAlign: "center", color: "rgba(232,244,240,0.25)", marginBottom: 10, letterSpacing: ".05em", textTransform: "uppercase" }}>Demo credentials</p>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ label: "Patient demo", type: "patient" as const }, { label: "Clinician demo", type: "doctor" as const }].map(({ label, type }) => (
                  <button key={type} onClick={() => fillDemo(type)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 12,
                    background: "rgba(15,255,197,0.04)", border: "1px solid rgba(15,255,197,0.1)",
                    color: "rgba(232,244,240,0.45)", cursor: "pointer", transition: "all .2s",
                  }}
                    onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#0fffc5"; el.style.borderColor = "rgba(15,255,197,0.3)"; el.style.background = "rgba(15,255,197,0.07)"; }}
                    onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "rgba(232,244,240,0.45)"; el.style.borderColor = "rgba(15,255,197,0.1)"; el.style.background = "rgba(15,255,197,0.04)"; }}
                  >{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
