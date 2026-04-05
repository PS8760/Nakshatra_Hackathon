"use client";
/**
 * BasicWebcam - Just shows webcam with test overlay
 * NO pose detection - just proves webcam works
 */

import { useEffect, useRef, useState } from "react";

interface Props {
  sessionId?: number;
  token?: string;
  preset?: string;
  activeJoints?: any[];
  onRepComplete?: (joint: any, angle: number, repCount: number) => void;
  onFeedback?: (msg: string, status: string) => void;
  onFormScore?: (score: number) => void;
  onSessionData?: (data: any) => void;
}

export default function BasicWebcam(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Starting camera...");
  const [fps, setFps] = useState(0);
  const rafRef = useRef<number>(0);
  const fpsCountRef = useRef({ frames: 0, lastTime: Date.now() });

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        console.log("🚀 Starting basic webcam...");

        // Get camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
          audio: false,
        });

        console.log("✅ Camera stream obtained");

        if (!videoRef.current || !active) return;

        videoRef.current.srcObject = stream;

        // Wait for video to load
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            console.log(
              `✅ Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`
            );
            video.play().then(() => {
              console.log("✅ Video playing");
              resolve();
            });
          };
        });

        setStatus("Running");

        // Start draw loop
        drawLoop();
      } catch (err: any) {
        console.error("❌ Error:", err);
        setStatus(`Error: ${err.message}`);
      }
    }

    function drawLoop() {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(drawLoop);
        return;
      }

      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(drawLoop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(drawLoop);
        return;
      }

      // Set canvas size
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`✅ Canvas sized: ${canvas.width}x${canvas.height}`);
      }

      // Draw video
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw test circles to show it's working
      const w = canvas.width;
      const h = canvas.height;

      // Draw 17 test circles in body positions
      const testPoints = [
        { x: w * 0.5, y: h * 0.15, label: "Head" }, // Head
        { x: w * 0.4, y: h * 0.3, label: "L Shoulder" }, // Left shoulder
        { x: w * 0.6, y: h * 0.3, label: "R Shoulder" }, // Right shoulder
        { x: w * 0.35, y: h * 0.45, label: "L Elbow" }, // Left elbow
        { x: w * 0.65, y: h * 0.45, label: "R Elbow" }, // Right elbow
        { x: w * 0.3, y: h * 0.6, label: "L Wrist" }, // Left wrist
        { x: w * 0.7, y: h * 0.6, label: "R Wrist" }, // Right wrist
        { x: w * 0.42, y: h * 0.55, label: "L Hip" }, // Left hip
        { x: w * 0.58, y: h * 0.55, label: "R Hip" }, // Right hip
        { x: w * 0.4, y: h * 0.75, label: "L Knee" }, // Left knee
        { x: w * 0.6, y: h * 0.75, label: "R Knee" }, // Right knee
        { x: w * 0.38, y: h * 0.95, label: "L Ankle" }, // Left ankle
        { x: w * 0.62, y: h * 0.95, label: "R Ankle" }, // Right ankle
      ];

      // Draw skeleton lines
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3;
      const connections = [
        [0, 1], [0, 2], [1, 2], // Head to shoulders
        [1, 3], [3, 5], // Left arm
        [2, 4], [4, 6], // Right arm
        [1, 7], [2, 8], [7, 8], // Torso
        [7, 9], [9, 11], // Left leg
        [8, 10], [10, 12], // Right leg
      ];

      for (const [startIdx, endIdx] of connections) {
        if (testPoints[startIdx] && testPoints[endIdx]) {
          ctx.beginPath();
          ctx.moveTo(testPoints[startIdx].x, testPoints[startIdx].y);
          ctx.lineTo(testPoints[endIdx].x, testPoints[endIdx].y);
          ctx.stroke();
        }
      }

      // Draw test circles
      testPoints.forEach((point, i) => {
        // Outer glow
        ctx.fillStyle = "rgba(0, 255, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Main dot
        ctx.fillStyle = "#00FF00";
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(point.x - 35, point.y - 25, 70, 16);
        ctx.fillStyle = "#FFF";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(point.label, point.x, point.y - 13);
      });

      // Draw message
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 300, 80);
      ctx.fillStyle = "#00FF00";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText("✅ Webcam is working!", 20, 30);
      ctx.fillStyle = "#FFF";
      ctx.font = "12px Arial";
      ctx.fillText("These are TEST circles", 20, 50);
      ctx.fillText("Real pose detection needs", 20, 65);
      ctx.fillText("model files to download", 20, 80);

      // Update FPS
      const now = Date.now();
      fpsCountRef.current.frames++;
      if (now - fpsCountRef.current.lastTime >= 1000) {
        setFps(fpsCountRef.current.frames);
        fpsCountRef.current = { frames: 0, lastTime: now };
      }

      rafRef.current = requestAnimationFrame(drawLoop);
    }

    init();

    return () => {
      active = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Camera canvas */}
      <div
        style={{
          position: "relative",
          width: "100%",
          background: "#000",
          borderRadius: 16,
          overflow: "hidden",
          minHeight: 320,
          border: "1px solid rgba(15,255,197,0.15)",
        }}
      >
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "auto",
            visibility: "hidden",
          }}
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            maxHeight: "70vh",
          }}
        />

        {/* Loading overlay */}
        {status !== "Running" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(2,24,43,0.93)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 20,
            }}
          >
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid transparent",
                  borderTopColor: "#0fffc5",
                  animation: "spinCW 1s linear infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 8,
                  borderRadius: "50%",
                  border: "2px solid transparent",
                  borderBottomColor: "rgba(15,255,197,0.5)",
                  animation: "spinCW 1.5s linear infinite reverse",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                📷
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  color: "#0fffc5",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                {status}
              </p>
              <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12 }}>
                Basic webcam test
              </p>
            </div>
          </div>
        )}

        {/* FPS counter */}
        {status === "Running" && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0, 0, 0, 0.7)",
              padding: "4px 8px",
              borderRadius: 6,
              color: fps >= 20 ? "#0fffc5" : "#eab308",
              fontFamily: "monospace",
              fontSize: 10,
              border: "1px solid rgba(15,255,197,0.2)",
            }}
          >
            {fps} FPS
          </div>
        )}
      </div>

      {/* Info panel */}
      {status === "Running" && (
        <div
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#22c55e",
                }}
              />
              <span style={{ fontSize: 12, color: "#22c55e" }}>
                Webcam working - Test circles displayed
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                color: "rgba(232,244,240,0.3)",
                fontFamily: "monospace",
              }}
            >
              No pose detection (network issue)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
