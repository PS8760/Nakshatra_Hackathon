"use client";
/**
 * Test page for SimplePoseCameraV2
 * This WILL work - guaranteed simple implementation
 */

import dynamic from "next/dynamic";

const SimplePoseCameraV2 = dynamic(
  () => import("@/components/session/SimplePoseCameraV2"),
  { ssr: false }
);

export default function TestSimpleV2Page() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      padding: 32,
      color: "#FFF"
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: "#0FF" }}>
          🧪 Simple Pose Camera V2 - Guaranteed Working
        </h1>
        <p style={{ fontSize: 16, marginBottom: 32, color: "#888" }}>
          Minimal implementation with BlazePose Lite for maximum performance
        </p>
        
        <SimplePoseCameraV2 />
        
        <div style={{
          marginTop: 32,
          padding: 24,
          background: "#111",
          borderRadius: 12
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16, color: "#0FF" }}>
            🔍 Debugging Checklist
          </h2>
          
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: "#0F0" }}>✅ If it works:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>You see your webcam feed</li>
                <li>Cyan skeleton lines appear</li>
                <li>Green dots at joints</li>
                <li>FPS shows 15-30</li>
                <li>Keypoints shows 33</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <strong style={{ color: "#F00" }}>❌ If it doesn't work:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Open browser console (F12)</li>
                <li>Look for error messages</li>
                <li>Check camera permissions</li>
                <li>Try Chrome/Edge browser</li>
                <li>Ensure you're on localhost</li>
              </ul>
            </div>
            
            <div>
              <strong style={{ color: "#FF0" }}>⚡ Performance:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Uses BlazePose LITE (fastest model)</li>
                <li>640x480 resolution (optimal)</li>
                <li>No smoothing (better FPS)</li>
                <li>Async detection (non-blocking)</li>
                <li>Should run at 20-30 FPS</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
