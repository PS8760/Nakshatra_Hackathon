"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
}

export default function ProgressBar({
  value,
  max = 100,
  color = "var(--primary)",
  height = 8,
  showLabel = false,
  animated = true,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div style={{ width: "100%" }}>
      {showLabel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 600, color }}>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div style={{
        width: "100%",
        height,
        background: "var(--neutral-dark)",
        borderRadius: height / 2,
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          width: `${percentage}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
          borderRadius: height / 2,
          transition: animated ? "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
          position: "relative",
          overflow: "hidden",
        }}>
          {animated && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
              animation: "shimmer 2s infinite",
            }} />
          )}
        </div>
      </div>
    </div>
  );
}
