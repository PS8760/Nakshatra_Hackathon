"use client";
import { motion } from "framer-motion";

export default function PageLoader() {
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "#0B1F2E",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    }}>
      {/* Logo with pulse animation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: "rgba(107,158,255,0.15)",
          border: "3px solid rgba(107,158,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <motion.circle
            cx="16"
            cy="16"
            r="6"
            fill="#6B9EFF"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "drop-shadow(0 0 8px #6B9EFF)" }}
          />
          <motion.path
            d="M16 4v4M16 24v4M4 16h4M24 16h4"
            stroke="#6B9EFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            animate={{
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </svg>

        {/* Pulsing ring */}
        <motion.div
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: 24,
            border: "2px solid #6B9EFF",
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      </motion.div>

      {/* Brand name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ textAlign: "center" }}
      >
        <h1 style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#FFFFFF",
          letterSpacing: "-.02em",
          marginBottom: 8,
        }}>
          Neuro<span style={{ color: "#6B9EFF" }}>Restore</span>
        </h1>
        <p style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}>
          AI-Powered Rehabilitation
        </p>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          width: 200,
          height: 4,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: "40%",
            background: "linear-gradient(90deg, transparent, #6B9EFF, transparent)",
            borderRadius: 2,
          }}
          animate={{
            x: ["-100%", "350%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#6B9EFF",
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
