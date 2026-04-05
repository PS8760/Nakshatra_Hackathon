"use client";
/**
 * Pose Detection Test Page
 * 
 * Professional demonstration of the optimized PoseCamera component
 */

import dynamic from "next/dynamic";

const PoseCameraOptimized = dynamic(
  () => import("@/components/session/PoseCameraOptimized"),
  { ssr: false }
);

export default function PoseTestPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 800, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32, color: "#fff" }}>
          <h1 style={{ fontSize: 36, fontWeight: "bold", marginBottom: 8 }}>
            🦴 Professional Pose Detection
          </h1>
          <p style={{ fontSize: 16, opacity: 0.9 }}>
            Real-time BlazePose Heavy • 33 Keypoints • Smart Rep Counting
          </p>
        </div>

        {/* Camera Component */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <PoseCameraOptimized />
        </div>

        {/* Instructions */}
        <div
          style={{
            marginTop: 32,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            padding: 24,
            color: "#fff",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
            📋 Instructions
          </h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>
              <strong>Yellow</strong> = Left side joints
            </li>
            <li>
              <strong>Green</strong> = Right side joints
            </li>
            <li>Major joints have a glowing ring effect</li>
            <li>Bone thickness indicates depth (closer = thicker)</li>
            <li>
              <strong>Rep Counting:</strong> Perform bicep curls with your right
              arm
            </li>
            <li>Extend arm fully (angle &gt; 160°) then flex (angle &lt; 45°)</li>
            <li>FPS counter shows real-time performance</li>
          </ul>
        </div>

        {/* Technical Specs */}
        <div
          style={{
            marginTop: 16,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            padding: 16,
            color: "#fff",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <strong>Model:</strong> BlazePose Heavy
            </div>
            <div>
              <strong>Keypoints:</strong> 33 (3D coordinates)
            </div>
            <div>
              <strong>Resolution:</strong> 640x480
            </div>
            <div>
              <strong>Backend:</strong> TensorFlow.js WebGL
            </div>
            <div>
              <strong>Smoothing:</strong> Enabled
            </div>
            <div>
              <strong>Confidence:</strong> &gt; 0.3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
