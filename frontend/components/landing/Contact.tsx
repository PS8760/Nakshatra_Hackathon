"use client";
import { useState, useRef, useEffect } from "react";

function Field({ label, type = "text", value, onChange, required, rows }: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; required?: boolean; rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: focused ? "rgba(2,24,43,.85)" : "rgba(2,24,43,.5)",
    border: `1px solid ${focused ? "rgba(15,255,197,.5)" : value ? "rgba(15,255,197,.25)" : "rgba(15,255,197,.12)"}`,
    color: "#e8f4f0", borderRadius: 12,
    padding: "22px 16px 10px", outline: "none",
    fontSize: 14, fontFamily: "inherit",
    transition: "all .2s",
    boxShadow: focused ? "0 0 0 3px rgba(15,255,197,.07)" : "none",
    resize: "none" as const, lineHeight: 1.6,
  };

  return (
    <div style={{ position: "relative" }}>
      {rows
        ? <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} required={required} style={inputStyle} placeholder="" />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} required={required} style={inputStyle} placeholder="" />
      }
      <label style={{
        position: "absolute", left: 16,
        top: active ? 8 : 16,
        fontSize: active ? 10 : 14,
        color: focused ? "#6B9EFF" : active ? "rgba(15,255,197,.6)" : "rgba(232,244,240,.3)",
        pointerEvents: "none", transition: "all .18s",
        letterSpacing: active ? ".06em" : "0",
        textTransform: active ? "uppercase" : "none",
        fontWeight: active ? 600 : 400,
      }}>{label}</label>
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: focused ? "translateX(-50%) scaleX(1)" : "translateX(-50%) scaleX(0)",
        width: "calc(100% - 24px)", height: 1,
        background: "linear-gradient(90deg, transparent, #6B9EFF, transparent)",
        transition: "transform .3s", borderRadius: 1,
      }} />
    </div>
  );
}

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; obs.disconnect(); }
    }, { threshold: .1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      setStatus("sent"); setForm({ name: "", email: "", message: "" });
    } catch { setStatus("error"); }
  };

  return (
    <section id="contact" className="section" style={{ borderTop: "1px solid rgba(15,255,197,.05)" }}>
      <div className="orb orb-l a-floatXY" />
      <div className="orb orb-r a-floatY" style={{ animationDelay: "1.5s" }} />

      <div style={{
        width: "100%", maxWidth: 1160,
        margin: "0 auto",
        padding: "0 clamp(20px,5vw,80px)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div className="pill" style={{ marginBottom: 20 }}>Get in touch</div>
          <h2 style={{ fontSize: "clamp(28px,4.5vw,48px)", fontWeight: 800, letterSpacing: "-.03em", color: "#e8f4f0", marginBottom: 14, lineHeight: 1.1 }}>
            Let's <span className="g-text">talk.</span>
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(232,244,240,.42)" }}>
            Questions, feedback, or partnership inquiries — we read every message.
          </p>
        </div>

        <div ref={cardRef} style={{
          maxWidth: 580, margin: "0 auto",
          opacity: 0, transform: "translateY(32px)",
          transition: "opacity .7s ease, transform .7s ease",
          background: "rgba(255,255,255,.025)",
          border: "1px solid rgba(15,255,197,.1)",
          borderRadius: 20, padding: "40px 36px",
          backdropFilter: "blur(16px)",
          boxShadow: "0 24px 80px rgba(0,0,0,.4)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Top glow line */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "60%", height: 1, background: "linear-gradient(90deg, transparent, rgba(15,255,197,.3), transparent)" }} />

          {status === "sent" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 16 }}>
              <div className="a-pulse" style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(15,255,197,.1)", border: "2px solid rgba(15,255,197,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14L11 19L22 9" stroke="#6B9EFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e8f4f0" }}>Message sent.</h3>
              <p style={{ fontSize: 14, color: "rgba(232,244,240,.45)", textAlign: "center" }}>We'll get back to you within 24 hours.</p>
              <button onClick={() => setStatus("idle")} style={{ marginTop: 8, fontSize: 12, padding: "8px 16px", borderRadius: 8, color: "#6B9EFF", border: "1px solid rgba(15,255,197,.2)", background: "transparent", cursor: "pointer", transition: "background .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(15,255,197,.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >Send another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="contact-row">
                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
              </div>
              <Field label="Message" value={form.message} rows={5} onChange={(v) => setForm({ ...form, message: v })} required />

              {status === "error" && (
                <div style={{ background: "rgba(255,80,80,.07)", border: "1px solid rgba(255,80,80,.2)", borderRadius: 10, padding: "10px 14px", color: "#ff8a8a", fontSize: 13 }}>
                  Something went wrong. Please try again.
                </div>
              )}

              <button type="submit" disabled={status === "sending"} className="btn-solid" style={{ width: "100%", padding: "14px 0", opacity: status === "sending" ? .7 : 1, cursor: status === "sending" ? "not-allowed" : "pointer" }}>
                {status === "sending" ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(2,24,43,.3)", borderTopColor: "#0B1F2E", display: "inline-block", animation: "spinCW .8s linear infinite" }} />
                    Sending…
                  </span>
                ) : "Send message →"}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 480px) { .contact-row { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
