"use client";
import PageShell from "@/components/landing/PageShell";
import HowItWorks from "@/components/landing/HowItWorks";

export default function HowItWorksPage() {
  return (
    <PageShell>
      <div style={{
        padding: "80px 0 0",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(15,255,197,.065) 0%, transparent 70%)",
        }} />
        <div style={{
          width: "100%", maxWidth: 1160,
          margin: "0 auto",
          padding: "0 clamp(20px,5vw,80px)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <div className="pill">Process</div>
          </div>
          <h1 style={{
            fontSize: "clamp(32px,5.5vw,60px)", fontWeight: 800,
            letterSpacing: "-.035em", color: "#e8f4f0",
            marginBottom: 16, lineHeight: 1.08,
          }}>
            Up and running<br />in under 5 minutes.
          </h1>
          <p style={{
            fontSize: 17, color: "rgba(232,244,240,.46)",
            maxWidth: 460, margin: "0 auto", lineHeight: 1.7,
          }}>
            No hardware. No downloads. Just a camera and a browser.
          </p>
        </div>
      </div>
      <HowItWorks />
    </PageShell>
  );
}
