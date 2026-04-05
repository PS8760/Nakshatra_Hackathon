"use client";
/**
 * MediaPipe Holistic Test Page
 * 
 * Professional demonstration of full body + hand tracking
 * for physical therapy applications
 */

import dynamic from "next/dynamic";

const HolisticCamera = dynamic(
  () => import("@/components/session/HolisticCamera"),
  { ssr: false }
);

export default function HolisticTestPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1F2E",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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
            🦴 MediaPipe Holistic Tracking
          </h1>
          <p style={{ fontSize: 18, opacity: 0.95, marginBottom: 8 }}>
            Extreme High-Definition Full Body + Hand Tracking
          </p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>
            33 Body Landmarks • 21 Left Hand Joints • 21 Right Hand Joints
          </p>
        </div>

        {/* Main Camera Component */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            marginBottom: 32,
          }}
        >
          <HolisticCamera />
        </div>

        {/* Information Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {/* Color Legend */}
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
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              🎨 Color Legend
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: "#0000FF",
                    borderRadius: 4,
                    border: "2px solid #fff",
                  }}
                />
                <span style={{ fontSize: 14 }}>
                  <strong>Blue</strong> - Body Skeleton (33 landmarks)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: "#00FF00",
                    borderRadius: 4,
                    border: "2px solid #fff",
                  }}
                />
                <span style={{ fontSize: 14 }}>
                  <strong>Green</strong> - Right Hand (21 joints)
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    background: "#FF0000",
                    borderRadius: 4,
                    border: "2px solid #fff",
                  }}
                />
                <span style={{ fontSize: 14 }}>
                  <strong>Red</strong> - Left Hand (21 joints)
                </span>
              </div>
            </div>
          </div>

          {/* Rep Counter Instructions */}
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
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              💪 Rep Counter
            </h3>
            <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20 }}>
              <li>Tracks right elbow angle in real-time</li>
              <li>
                <strong>Extension:</strong> Angle &gt; 160° (arm straight)
              </li>
              <li>
                <strong>Contraction:</strong> Angle &lt; 45° (arm bent)
              </li>
              <li>Rep counted on full range of motion</li>
              <li>
                <strong>Confidence gate:</strong> Must be ≥ 65%
              </li>
            </ul>
          </div>

          {/* Technical Specifications */}
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
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              ⚙️ Configuration
            </h3>
            <div
              style={{
                fontSize: 13,
                fontFamily: "monospace",
                lineHeight: 1.8,
              }}
            >
              <div>
                <strong>Detection Confidence:</strong> 0.65
              </div>
              <div>
                <strong>Tracking Confidence:</strong> 0.65
              </div>
              <div>
                <strong>Model Complexity:</strong> Full (1)
              </div>
              <div>
                <strong>Smooth Landmarks:</strong> Enabled
              </div>
              <div>
                <strong>Resolution:</strong> 1280x720
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div
          style={{
            marginTop: 32,
            background: "rgba(0,0,0,0.3)",
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
              textAlign: "center",
            }}
          >
            ✨ Key Features
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 16,
              fontSize: 14,
            }}
          >
            <div>
              ✓ <strong>75 Total Landmarks</strong> - Full body + both hands
            </div>
            <div>
              ✓ <strong>Every Finger Joint</strong> - All knuckles, palm joints
            </div>
            <div>
              ✓ <strong>Real-Time FPS</strong> - Performance monitoring
            </div>
            <div>
              ✓ <strong>3D Angle Calculation</strong> - Dot product formula
            </div>
            <div>
              ✓ <strong>State Machine Rep Counter</strong> - No false counts
            </div>
            <div>
              ✓ <strong>Confidence Gating</strong> - Filter bad data
            </div>
            <div>
              ✓ <strong>Threshold-Based Logic</strong> - Full ROM required
            </div>
            <div>
              ✓ <strong>Professional Drawing</strong> - MediaPipe utilities
            </div>
          </div>
        </div>

        {/* Usage Instructions */}
        <div
          style={{
            marginTop: 20,
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            padding: 20,
            color: "#fff",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          <strong>💡 Pro Tip:</strong> Stand 1.5-2 meters from camera with good
          lighting. Keep hands visible for full tracking. Perform bicep curls
          with your right arm to test rep counting.
        </div>
      </div>
    </div>
  );
}
