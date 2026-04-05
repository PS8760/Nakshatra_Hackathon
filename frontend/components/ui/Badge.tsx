"use client";

type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
}

export default function Badge({ children, variant = "primary", size = "md", dot = false }: BadgeProps) {
  const variants = {
    primary: { bg: "rgba(0,94,184,0.1)", color: "var(--primary)", border: "rgba(0,94,184,0.2)" },
    secondary: { bg: "rgba(96,125,139,0.1)", color: "var(--secondary)", border: "rgba(96,125,139,0.2)" },
    success: { bg: "rgba(34,197,94,0.1)", color: "#6B9EFF", border: "rgba(34,197,94,0.2)" },
    warning: { bg: "rgba(234,179,8,0.1)", color: "#6B9EFF", border: "rgba(234,179,8,0.2)" },
    error: { bg: "rgba(239,68,68,0.1)", color: "#6B9EFF", border: "rgba(239,68,68,0.2)" },
    info: { bg: "rgba(0,191,165,0.1)", color: "var(--tertiary)", border: "rgba(0,191,165,0.2)" },
  };

  const sizes = {
    sm: { padding: "3px 8px", fontSize: 10 },
    md: { padding: "5px 12px", fontSize: 11 },
    lg: { padding: "7px 16px", fontSize: 12 },
  };

  const { bg, color, border } = variants[variant];
  const { padding, fontSize } = sizes[size];

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding,
      borderRadius: 100,
      fontSize,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      background: bg,
      color,
      border: `1px solid ${border}`,
      transition: "all 0.2s",
    }}>
      {dot && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          animation: "pulseDot 2s ease-in-out infinite",
        }} />
      )}
      {children}
    </span>
  );
}
