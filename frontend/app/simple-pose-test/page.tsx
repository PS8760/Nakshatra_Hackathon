"use client";
/**
 * Simple Pose Camera Test Page
 * 
 * Tests the SimplePoseCamera component which uses CDN-loaded MediaPipe
 */

import dynamic from "next/dynamic";

const SimplePoseCamera = dynamic(
  () => import("@/components/session/SimplePoseCamera"),
  { ssr: false }
);

export default function SimplePoseTestPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32, color: "#fff" }}>
          <h1
            style={{
              fontSize: 42,
              fontWeight: "bold",
              marginBottom: 12,
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
            }}
          >
            🧪 Simple Pose Camera Test
          </h1>
          <p style={{ fontSize: 18, opacity: 0.95, marginBottom: 8 }}>
            MediaPipe Holistic via CDN Scripts
          </p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            Minimal implementation for debugging
          </p>
        </div>

        {/* Main Camera Component */}
        <div
          style={{
            background: "#000",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            marginBottom: 32,
          }}
        >
          <SimplePoseCamera />
        </div>

        {/* Information */}
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            padding: 24,
            color: "#fff",
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            📋 What This Tests
          </h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Loads MediaPipe Holistic from CDN (jsdelivr)</li>
            <li>Uses MediaPipe Camera Utils for webcam access</li>
            <li>Uses MediaPipe Drawing Utils for skeleton rendering</li>
            <li>Shows debug info: status, landmark count, element readiness</li>
            <li>Minimal code - easier to debug than full implementations</li>
          </ul>

          <div style={{ marginTop: 20, padding: 16, background: "rgba(0,0,0,0.3)", borderRadius: 8 }}>
            <h4 style={{ fontSize: 16, marginBottom: 12, color: "#00FF00" }}>
              ✅ Expected Behavior:
            </h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: "rgba(255,255,255,0.9)" }}>
              <li>Status should progress: Initializing → Loading → Scripts loaded → Running</li>
              <li>Video feed should be visible in the canvas</li>
              <li>Skeleton overlay should appear when you're in frame</li>
              <li>Landmark count should show 33+ when body is detected</li>
              <li>Hands should add 21 landmarks each when visible</li>
            </ul>
          </div>

          <div style={{ marginTop: 16, padding: 16, background: "rgba(139,0,0,0.3)", borderRadius: 8 }}>
            <h4 style={{ fontSize: 16, marginBottom: 12, color: "#FF6B6B" }}>
              ❌ If It Doesn't Work:
            </h4>
            <ul style={{ fontSize: 13, lineHeight: 1.8, paddingLeft: 20, color: "rgba(255,255,255,0.9)" }}>
              <li>Check browser console for script loading errors</li>
              <li>Verify camera permissions are granted</li>
              <li>Try refreshing the page</li>
              <li>Test in Chrome/Edge (best MediaPipe support)</li>
              <li>Ensure you're on HTTPS or localhost</li>
            </ul>
          </div>
        </div>

        {/* Technical Details */}
        <div
          style={{
            marginTop: 20,
            background: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            padding: 20,
            color: "#fff",
            fontSize: 13,
          }}
        >
          <h4 style={{ fontSize: 16, marginBottom: 12 }}>🔧 Technical Details</h4>
          <div style={{ fontFamily: "monospace", lineHeight: 1.8 }}>
            <div><strong>Library:</strong> @mediapipe/holistic (CDN)</div>
            <div><strong>Camera:</strong> @mediapipe/camera_utils (CDN)</div>
            <div><strong>Drawing:</strong> @mediapipe/drawing_utils (CDN)</div>
            <div><strong>Model Complexity:</strong> 1 (Full)</div>
            <div><strong>Detection Confidence:</strong> 0.5</div>
            <div><strong>Tracking Confidence:</strong> 0.5</div>
            <div><strong>Resolution:</strong> 640x480</div>
          </div>
        </div>
      </div>
    </div>
  );
}
