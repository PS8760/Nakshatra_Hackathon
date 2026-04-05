"use client";
/**
 * Webcam Diagnostic Tool
 * 
 * This page tests the most basic webcam functionality to identify
 * why joints are not visible across all implementations.
 */

import { useEffect, useRef, useState } from "react";

export default function WebcamDiagnosticPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoReady, setVideoReady] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [drawingActive, setDrawingActive] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationId: number;
    let active = true;

    async function init() {
      try {
        addLog("🚀 Starting webcam diagnostic...");

        // Step 1: Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          addLog("❌ getUserMedia not available in this browser");
          return;
        }
        addLog("✅ getUserMedia API available");

        // Step 2: Request camera access
        addLog("📷 Requesting camera access...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        });
        addLog("✅ Camera access granted");
        setStreamActive(true);

        // Step 3: Get video track settings
        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        addLog(`📹 Video track: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);

        // Step 4: Attach stream to video element
        if (!videoRef.current) {
          addLog("❌ Video element not found");
          return;
        }
        videoRef.current.srcObject = stream;
        addLog("✅ Stream attached to video element");

        // Step 5: Wait for video metadata
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          
          video.onloadedmetadata = () => {
            addLog(`✅ Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
            setVideoReady(true);
            resolve();
          };

          video.onerror = (e) => {
            addLog(`❌ Video error: ${e}`);
            reject(e);
          };

          // Timeout after 5 seconds
          setTimeout(() => reject(new Error("Video metadata timeout")), 5000);
        });

        // Step 6: Play video
        addLog("▶️ Playing video...");
        await videoRef.current.play();
        addLog("✅ Video playing");

        // Step 7: Setup canvas
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (!canvas) {
          addLog("❌ Canvas element not found");
          return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          addLog("❌ Could not get 2D context from canvas");
          return;
        }
        addLog("✅ Canvas 2D context obtained");
        setCanvasReady(true);

        // Step 8: Set canvas size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        addLog(`✅ Canvas sized to ${canvas.width}x${canvas.height}`);

        // Step 9: Start drawing loop
        addLog("🎨 Starting draw loop...");
        setDrawingActive(true);

        let frameCount = 0;
        let lastFpsUpdate = Date.now();
        let fps = 0;

        function drawLoop() {
          if (!active || !video || !canvas || !ctx) return;

          // Check if video is actually playing
          if (video.readyState < 2) {
            addLog("⚠️ Video not ready yet, readyState: " + video.readyState);
            animationId = requestAnimationFrame(drawLoop);
            return;
          }

          try {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw test overlay - green circle in center
            ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
            ctx.fill();

            // Draw frame counter
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(10, 10, 150, 60);
            ctx.fillStyle = "#00FF00";
            ctx.font = "16px monospace";
            ctx.fillText(`Frame: ${frameCount}`, 20, 35);
            ctx.fillText(`FPS: ${fps}`, 20, 55);

            // Calculate FPS
            frameCount++;
            const now = Date.now();
            if (now - lastFpsUpdate >= 1000) {
              fps = frameCount;
              frameCount = 0;
              lastFpsUpdate = now;
              
              if (fps > 0 && logs.length < 50) {
                addLog(`✅ Drawing at ${fps} FPS`);
              }
            }

          } catch (err) {
            addLog(`❌ Draw error: ${err}`);
          }

          animationId = requestAnimationFrame(drawLoop);
        }

        drawLoop();
        addLog("✅ Diagnostic complete - webcam should be visible");

      } catch (err: any) {
        addLog(`❌ Error: ${err.message}`);
        console.error(err);
      }
    }

    init();

    return () => {
      active = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        addLog("🛑 Stream stopped");
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B1F2E",
      color: "#0F0",
      padding: 32,
      fontFamily: "monospace"
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: "#0FF" }}>
          🔍 Webcam Diagnostic Tool
        </h1>
        <p style={{ fontSize: 14, marginBottom: 32, color: "#888" }}>
          Testing basic webcam functionality to identify issues
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Video + Canvas */}
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16, color: "#0FF" }}>
              📹 Webcam Feed
            </h2>
            
            {/* Hidden video element */}
            <video
              ref={videoRef}
              style={{
                display: "block",
                width: "100%",
                marginBottom: 16,
                border: "2px solid #0F0",
                borderRadius: 8
              }}
              playsInline
              muted
            />

            {/* Canvas overlay */}
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                width: "100%",
                border: "2px solid #0FF",
                borderRadius: 8
              }}
            />

            {/* Status indicators */}
            <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{
                padding: "8px 16px",
                background: streamActive ? "#004400" : "#440000",
                border: `2px solid ${streamActive ? "#0F0" : "#F00"}`,
                borderRadius: 8
              }}>
                {streamActive ? "✅" : "❌"} Stream
              </div>
              <div style={{
                padding: "8px 16px",
                background: videoReady ? "#004400" : "#440000",
                border: `2px solid ${videoReady ? "#0F0" : "#F00"}`,
                borderRadius: 8
              }}>
                {videoReady ? "✅" : "❌"} Video
              </div>
              <div style={{
                padding: "8px 16px",
                background: canvasReady ? "#004400" : "#440000",
                border: `2px solid ${canvasReady ? "#0F0" : "#F00"}`,
                borderRadius: 8
              }}>
                {canvasReady ? "✅" : "❌"} Canvas
              </div>
              <div style={{
                padding: "8px 16px",
                background: drawingActive ? "#004400" : "#440000",
                border: `2px solid ${drawingActive ? "#0F0" : "#F00"}`,
                borderRadius: 8
              }}>
                {drawingActive ? "✅" : "❌"} Drawing
              </div>
            </div>
          </div>

          {/* Logs */}
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16, color: "#0FF" }}>
              📋 Diagnostic Log
            </h2>
            <div style={{
              background: "#111",
              border: "2px solid #333",
              borderRadius: 8,
              padding: 16,
              height: 600,
              overflowY: "auto",
              fontSize: 12,
              lineHeight: 1.6
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  marginBottom: 4,
                  color: log.includes("❌") ? "#F00" :
                         log.includes("✅") ? "#0F0" :
                         log.includes("⚠️") ? "#FF0" : "#0FF"
                }}>
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ color: "#888" }}>Waiting for logs...</div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: 32,
          padding: 24,
          background: "#111",
          border: "2px solid #333",
          borderRadius: 8
        }}>
          <h3 style={{ fontSize: 16, marginBottom: 12, color: "#0FF" }}>
            📖 What to look for:
          </h3>
          <ul style={{ fontSize: 14, lineHeight: 1.8, color: "#888" }}>
            <li>✅ All status indicators should be green</li>
            <li>📹 You should see yourself in BOTH the video element AND the canvas</li>
            <li>🟢 A green circle should be visible in the center of the canvas</li>
            <li>📊 Frame counter and FPS should be updating</li>
            <li>📋 Log should show "Drawing at X FPS" messages</li>
            <li>⚠️ If video shows but canvas is black, there's a drawing issue</li>
            <li>⚠️ If both are black, there's a camera permission or stream issue</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
