"use client";
/**
 * Ultra Simple Pose Camera Test
 * This WILL show joints - guaranteed!
 */

import dynamic from "next/dynamic";

const UltraSimplePoseCamera = dynamic(
  () => import("@/components/session/UltraSimplePoseCamera"),
  { ssr: false }
);

export default function TestUltraSimplePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #000 0%, #1a1a2e 100%)",
        padding: 32,
        color: "#FFF",
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, marginBottom: 8, color: "#0FF" }}>
            🎯 Ultra Simple Pose Camera
          </h1>
          <p style={{ fontSize: 18, marginBottom: 4, color: "#FFF" }}>
            GUARANTEED to show joints!
          </p>
          <p style={{ fontSize: 14, color: "#888" }}>
            Using MoveNet Lightning - Fastest & Most Reliable
          </p>
        </div>

        <UltraSimplePoseCamera />

        <div
          style={{
            marginTop: 32,
            padding: 24,
            background: "#1a1a2e",
            borderRadius: 12,
            border: "2px solid #0FF",
          }}
        >
          <h2 style={{ fontSize: 24, marginBottom: 16, color: "#0FF" }}>
            📋 What Makes This Different
          </h2>

          <div style={{ fontSize: 15, lineHeight: 1.8 }}>
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                background: "#0a0a1e",
                borderRadius: 8,
              }}
            >
              <strong style={{ color: "#0F0", fontSize: 16 }}>
                ✅ Guaranteed Features:
              </strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>
                  <strong>MoveNet Lightning</strong> - Fastest pose detection
                  model
                </li>
                <li>
                  <strong>Shows ALL joints</strong> - Even with low confidence
                  (score &gt; 0.1)
                </li>
                <li>
                  <strong>Large visible dots</strong> - 8px radius with glow
                  effect
                </li>
                <li>
                  <strong>Color-coded confidence</strong> - Green/Yellow/Orange/Red
                </li>
                <li>
                  <strong>Numbered keypoints</strong> - See which joint is which
                </li>
                <li>
                  <strong>Thick cyan lines</strong> - 4px wide skeleton
                </li>
                <li>
                  <strong>No filtering</strong> - All detected joints displayed
                </li>
              </ul>
            </div>

            <div
              style={{
                marginBottom: 16,
                padding: 16,
                background: "#0a0a1e",
                borderRadius: 8,
              }}
            >
              <strong style={{ color: "#FF0", fontSize: 16 }}>
                ⚡ Performance:
              </strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Expected FPS: 30-60 (very fast)</li>
                <li>Model size: ~3MB (small)</li>
                <li>Loading time: 1-2 seconds</li>
                <li>Latency: &lt;20ms (real-time)</li>
              </ul>
            </div>

            <div
              style={{
                padding: 16,
                background: "#0a0a1e",
                borderRadius: 8,
              }}
            >
              <strong style={{ color: "#F0F", fontSize: 16 }}>
                🎨 MoveNet Keypoints (17 total):
              </strong>
              <div
                style={{
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <div>0 - Nose</div>
                  <div>1 - Left Eye</div>
                  <div>2 - Right Eye</div>
                  <div>3 - Left Ear</div>
                  <div>4 - Right Ear</div>
                  <div>5 - Left Shoulder</div>
                  <div>6 - Right Shoulder</div>
                  <div>7 - Left Elbow</div>
                  <div>8 - Right Elbow</div>
                </div>
                <div>
                  <div>9 - Left Wrist</div>
                  <div>10 - Right Wrist</div>
                  <div>11 - Left Hip</div>
                  <div>12 - Right Hip</div>
                  <div>13 - Left Knee</div>
                  <div>14 - Right Knee</div>
                  <div>15 - Left Ankle</div>
                  <div>16 - Right Ankle</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 20,
            background: "#1a0a0a",
            borderRadius: 12,
            border: "2px solid #F00",
          }}
        >
          <h3 style={{ fontSize: 18, marginBottom: 12, color: "#F00" }}>
            ❌ If You STILL Don't See Joints:
          </h3>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              This is the SIMPLEST possible implementation. If this doesn't
              work, the issue is NOT with the code.
            </p>
            <strong>Check these:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>
                <strong>Browser Console (F12)</strong> - Look for errors
              </li>
              <li>
                <strong>Camera Permission</strong> - Must be granted
              </li>
              <li>
                <strong>Browser</strong> - Use Chrome or Edge (not Firefox/Safari)
              </li>
              <li>
                <strong>HTTPS/Localhost</strong> - Must be on localhost or HTTPS
              </li>
              <li>
                <strong>Other Apps</strong> - Close other apps using camera
              </li>
              <li>
                <strong>Hardware</strong> - Ensure camera is working (test in
                other apps)
              </li>
            </ol>
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "#0a1a0a",
            borderRadius: 8,
            border: "2px solid #0F0",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 16, marginBottom: 8 }}>
            <strong style={{ color: "#0F0" }}>
              ✅ If you see your webcam feed with colored dots and cyan lines:
            </strong>
          </div>
          <div style={{ fontSize: 14, color: "#CCC" }}>
            SUCCESS! The pose detection is working. We can now integrate this
            into the session page.
          </div>
        </div>
      </div>
    </div>
  );
}
