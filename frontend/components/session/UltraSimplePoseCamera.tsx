"use client";
/**
 * UltraSimplePoseCamera - Simple joint detection and display
 * Uses MoveNet Lightning for fast, reliable joint detection
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

export default function UltraSimplePoseCamera(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Starting...");
  const [fps, setFps] = useState(0);
  const [jointCount, setJointCount] = useState(0);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const fpsCountRef = useRef({ frames: 0, lastTime: Date.now() });

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        console.log("🚀 Starting ultra simple pose camera...");
        setStatus("Loading TensorFlow...");

        // Load TensorFlow
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("✅ TensorFlow ready");

        setStatus("Loading MoveNet Lightning...");

        // Load pose detection
        const poseDetection = await import("@tensorflow-models/pose-detection");

        // MoveNet Lightning - FASTEST model, most reliable
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          }
        );

        detectorRef.current = detector;
        console.log("✅ MoveNet loaded");

        setStatus("Starting camera...");

        // Get camera - low resolution for speed
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

        setStatus("Running - Move into frame!");

        // Start detection loop
        detectLoop();
      } catch (err: any) {
        console.error("❌ Error:", err);
        setStatus(`Error: ${err.message}`);
      }
    }

    function detectLoop() {
      if (!active) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || !detectorRef.current) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Set canvas size
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log(`✅ Canvas sized: ${canvas.width}x${canvas.height}`);
      }

      // ALWAYS draw video first
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run detection
      detectorRef.current
        .estimatePoses(video)
        .then((poses: any[]) => {
          if (!active || !poses || poses.length === 0) return;

          const pose = poses[0];
          const keypoints = pose.keypoints || [];

          setJointCount(keypoints.length);

          // Draw ALL keypoints - no filtering
          drawAllKeypoints(ctx, keypoints);

          // Update FPS
          const now = Date.now();
          fpsCountRef.current.frames++;
          if (now - fpsCountRef.current.lastTime >= 1000) {
            setFps(fpsCountRef.current.frames);
            fpsCountRef.current = { frames: 0, lastTime: now };
          }
        })
        .catch((err: any) => {
          console.error("Detection error:", err);
        });

      rafRef.current = requestAnimationFrame(detectLoop);
    }

    function drawAllKeypoints(ctx: CanvasRenderingContext2D, keypoints: any[]) {
      // MoveNet connections (17 keypoints)
      const connections = [
        [0, 1], [0, 2], [1, 3], [2, 4], // Head
        [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // Arms
        [5, 11], [6, 12], [11, 12], // Torso
        [11, 13], [13, 15], [12, 14], [14, 16], // Legs
      ];

      // Draw connections FIRST (so they appear behind joints)
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";

      for (const [startIdx, endIdx] of connections) {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        // Draw even with low confidence - we want to see SOMETHING
        if (start && end && start.score > 0.1 && end.score > 0.1) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }

      // Draw ALL keypoints - even low confidence ones
      for (let i = 0; i < keypoints.length; i++) {
        const kp = keypoints[i];
        if (!kp) continue;

        // Color based on confidence
        let color;
        if (kp.score > 0.7) {
          color = "#00FF00"; // Green - high confidence
        } else if (kp.score > 0.4) {
          color = "#FFFF00"; // Yellow - medium confidence
        } else if (kp.score > 0.1) {
          color = "#FF8800"; // Orange - low confidence
        } else {
          color = "#FF0000"; // Red - very low confidence
        }

        // Draw large, visible dot
        // Outer glow
        ctx.fillStyle = color + "40";
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 15, 0, Math.PI * 2);
        ctx.fill();

        // Main dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Black border
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Draw keypoint number
        ctx.fillStyle = "#000";
        ctx.font = "bold 12px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.toString(), kp.x, kp.y);
      }

      // Draw info overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(10, 10, 250, 80);

      ctx.fillStyle = "#00FF00";
      ctx.font = "16px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Joints: ${keypoints.length}`, 20, 35);
      ctx.fillText(`FPS: ${fps}`, 20, 55);
      ctx.fillText(`Status: ${status}`, 20, 75);
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
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, [fps, status]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Camera canvas */}
      <div style={{
        position: "relative", width: "100%", background: "#000",
        borderRadius: 16, overflow: "hidden", minHeight: 320,
        border: "1px solid rgba(15,255,197,0.15)",
      }}>
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
            maxHeight: "70vh"
          }}
        />

        {/* Minimal status - only when loading */}
        {status !== "Running - Move into frame!" && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2,24,43,0.93)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#0fffc5", animation: "spinCW 1s linear infinite" }} />
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "rgba(15,255,197,0.5)", animation: "spinCW 1.5s linear infinite reverse" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🦴</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#0fffc5", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{status}</p>
              <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12 }}>MoveNet Lightning · 17 keypoints</p>
            </div>
          </div>
        )}

        {/* Minimal HUD - only FPS */}
        {status === "Running - Move into frame!" && (
          <div style={{
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
          }}>
            {fps} FPS
          </div>
        )}
      </div>

      {/* Live info panel - minimal */}
      {status === "Running - Move into frame!" && (
        <div style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: jointCount > 0 ? "#22c55e" : "#888" }} />
              <span style={{ fontSize: 12, color: jointCount > 0 ? "#22c55e" : "rgba(232,244,240,0.5)" }}>
                {jointCount > 0 ? `${jointCount} joints detected` : "Move into frame"}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "rgba(232,244,240,0.3)", fontFamily: "monospace" }}>
              MoveNet Lightning
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
