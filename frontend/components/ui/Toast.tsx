"use client";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: { bg: "#6B9EFF", icon: "✓" },
    error: { bg: "#6B9EFF", icon: "✕" },
    warning: { bg: "#6B9EFF", icon: "⚠" },
    info: { bg: "var(--primary)", icon: "ℹ" },
  };

  const { bg, icon } = colors[type];

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      transform: isVisible ? "translateY(0)" : "translateY(120%)",
      opacity: isVisible ? 1 : 0,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
      <div style={{
        background: "#FFFFFF",
        border: `2px solid ${bg}`,
        borderRadius: 12,
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        minWidth: 280,
        maxWidth: 400,
      }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: bg,
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <p style={{ fontSize: 14, color: "var(--text)", fontWeight: 500, flex: 1 }}>{message}</p>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 18,
            padding: 4,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
