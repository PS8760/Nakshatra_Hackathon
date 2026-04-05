"use client";

export default function LoadingSpinner({ size = 40, color = "var(--primary)" }: { size?: number; color?: string }) {
  return (
    <div style={{ display: "inline-block", position: "relative", width: size, height: size }}>
      <div style={{
        position: "absolute", inset: 0,
        border: `3px solid ${color}20`,
        borderTop: `3px solid ${color}`,
        borderRadius: "50%",
        animation: "spinCW 0.8s linear infinite",
      }} />
      <div style={{
        position: "absolute", inset: 4,
        border: `2px solid ${color}10`,
        borderBottom: `2px solid ${color}60`,
        borderRadius: "50%",
        animation: "spinCCW 1.2s linear infinite",
      }} />
    </div>
  );
}
