"use client";
/**
 * BlazePose 33 Keypoint Detection Demo
 * Simple demonstration of webcam + BlazePose skeleton overlay
 */
import { useEffect, useRef, useState } from "react";

// BlazePose keypoint indices
const BP = {
  NOSE: 0,
  LEFT_EYE: 2, RIGHT_EYE: 5,
  LEFT_EAR: 7, RIGHT_EAR: 8,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT: 31, RIGHT_FOOT: 32,
} as const;

// Skeleton connections for drawing
const CONNECTIONS: [number, number][] = [
  // Face
  [BP.LEFT_EAR, BP.LEFT_EYE], [BP.RIGHT_EAR, BP.RIGHT_EYE],
  [BP.LEFT_EYE, BP.NOSE], [BP.RIGHT_EYE, BP.NOSE],
  // Torso
  [BP.LEFT_SHOULDER, BP.RIGHT_SHOULDER],
  [BP.LEFT_SHOULDER, BP.LEFT_HIP], [BP.RIGHT_SHOULDER, BP.RIGHT_HIP],
  [BP.LEFT_HIP, BP.RIGHT_HIP],
  // Left arm
  [BP.LEFT_SHOULDER, BP.LEFT_ELBOW], [BP.LEFT_ELBOW, BP.LEFT_WRIST],
  // Right arm
  [BP.RIGHT_SHOULDER, BP.RIGHT_ELBOW], [BP.RIGHT_ELBOW, BP.RIGHT_WRIST],
  // Left leg
  [BP.LEFT_HIP, BP.LEFT_KNEE], [BP.LEFT_KNEE, BP.LEFT_ANKLE],
  [BP.LEFT_ANKLE, BP.LEFT_HEEL], [BP.LEFT_HEEL, BP.LEFT_FOOT],
  // Right leg
  [BP.RIGHT_HIP, BP.RIGHT_KNEE], [BP.RIGHT_KNEE, BP.RIGHT_ANKLE],
  [BP.RIGHT_ANKLE, BP.RIGHT_HEEL], [BP.RIGHT_HEEL, BP.RIGHT_FOOT],
];

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

export default function DemoPosePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const activeRef = useRef(true);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");
  const [loadingPct, setLoadingPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [keypointCount, setKeypointCount] = useState(0);
  
  const fpsRef = useRef({ frames: 0, lastTime: Date.now() });

  // Draw skeleton on canvas
  const drawSkeleton = (keypoints: Keypoint[], ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);

    // Draw bones (connections)
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0fffc5";
    for (const [ai, bi] of CONNECTIONS) {
      const a = keypoints[ai];
      const b = keypoints[bi];
      if (!a || !b || (a.score ?? 0) < 0.3 || (b.score ?? 0) < 0.3) continue;
      
      ctx.beginPath();
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
      ctx.stroke();
    }

    // Draw keypoints (joints)
    for (let i = 0; i < keypoints.length; i++) {
      const kp = keypoints[i];
      if (!kp || (kp.score ?? 0) < 0.3) continue;

      const x = kp.x * w;
      const y = kp.y * h;
      const radius = 6;

      // Color based on body part
      let color = "#ffffff";
      if (i >= BP.LEFT_SHOULDER && i <= BP.RIGHT_WRIST) color = "#60a5fa"; // Arms - blue
      else if (i >= BP.LEFT_HIP && i <= BP.RIGHT_FOOT) color = "#f472b6"; // Legs - pink
      else if (i <= BP.RIGHT_EAR) color = "#fbbf24"; // Face - yellow

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Main detection loop
  const runDetection = async () => {
    if (!activeRef.current || !detectorRef.current || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    canvas.width = w;
    canvas.height = h;

    try {
      // Estimate poses
      const poses = await detectorRef.current.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
        scoreThreshold: 0.3,
      });

      // Draw video frame
      ctx.save();
      ctx.drawImage(video, 0, 0, w, h);

      if (poses.length > 0) {
        // Get keypoints (BlazePose returns 33 keypoints)
        const rawKp = poses[0].keypoints3D ?? poses[0].keypoints;
        const keypoints: Keypoint[] = [];

        for (let i = 0; i < Math.min(rawKp.length, 33); i++) {
          const k = rawKp[i];
          keypoints.push({
            x: k.x,
            y: k.y,
            z: (k as any).z ?? 0,
            score: k.score ?? 0,
          });
        }

        setKeypointCount(keypoints.filter(k => (k.score ?? 0) >= 0.3).length);
        drawSkeleton(keypoints, ctx, w, h);
      } else {
        setKeypointCount(0);
      }

      ctx.restore();
    } catch (err) {
      console.error("Detection error:", err);
    }

    // Calculate FPS
    const now = Date.now();
    fpsRef.current.frames++;
    if (now - fpsRef.current.lastTime >= 1000) {
      setFps(fpsRef.current.frames);
      fpsRef.current = { frames: 0, lastTime: now };
    }

    if (activeRef.current) {
      rafRef.current = requestAnimationFrame(runDetection);
    }
  };

  // Initialize BlazePose
  useEffect(() => {
    activeRef.current = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        setLoadingMsg("Loading TensorFlow.js...");
        setLoadingPct(15);
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        setLoadingMsg("Setting up WebGL backend...");
        setLoadingPct(30);
        await tf.setBackend("webgl");
        await tf.ready();

        setLoadingMsg("Loading BlazePose Heavy model...");
        setLoadingPct(55);

        // Create BlazePose detector
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: "tfjs" as const,
            modelType: "heavy",
            enableSmoothing: true,
            enableSegmentation: false,
          }
        );

        detectorRef.current = detector;
        setLoadingMsg("Starting camera...");
        setLoadingPct(75);

        // Get webcam stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 }, 
            facingMode: "user" 
          },
          audio: false,
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const v = videoRef.current!;
          v.onloadedmetadata = () => {
            v.play().then(resolve).catch(reject);
          };
          v.onerror = reject;
        });

        setLoadingPct(100);
        setIsLoading(false);
        rafRef.current = requestAnimationFrame(runDetection);
      } catch (err: any) {
        setError(err?.message || "Failed to initialize");
        setIsLoading(false);
      }
    }

    init();

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      detectorRef.current?.dispose?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #02182b 0%, #0a3a5c 100%)",
      padding: "40px 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "30px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", maxWidth: "800px" }}>
        <h1 style={{
          fontSize: "42px",
          fontWeight: "800",
          background: "linear-gradient(135deg, #0fffc5 0%, #60a5fa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "12px",
        }}>
          BlazePose 33 Keypoint Detection
        </h1>
        <p style={{ color: "rgba(232,244,240,0.6)", fontSize: "16px", lineHeight: "1.6" }}>
          Real-time pose estimation using Google's BlazePose Heavy model.
          Detects 33 body landmarks with 3D coordinates and depth information.
        </p>
      </div>

      {/* Main camera view */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "1000px",
        background: "#000",
        borderRadius: "20px",
        overflow: "hidden",
        border: "2px solid rgba(15,255,197,0.2)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <video 
          ref={videoRef} 
          style={{ display: "none" }} 
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
        {isLoading && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2,24,43,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
          }}>
            <div style={{ position: "relative", width: "80px", height: "80px" }}>
              <div style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: "3px solid transparent",
                borderTopColor: "#0fffc5",
                animation: "spin 1s linear infinite",
              }} />
              <div style={{
                position: "absolute",
                inset: "10px",
                borderRadius: "50%",
                border: "3px solid transparent",
                borderBottomColor: "rgba(15,255,197,0.5)",
                animation: "spin 1.5s linear infinite reverse",
              }} />
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}>
                🦴
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#0fffc5", fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>
                {loadingMsg}
              </p>
              <p style={{ color: "rgba(232,244,240,0.4)", fontSize: "13px" }}>
                BlazePose Heavy · 33 keypoints · 3D depth · 95% accuracy
              </p>
            </div>
            <div style={{
              width: "240px",
              height: "4px",
              background: "rgba(15,255,197,0.1)",
              borderRadius: "2px",
            }}>
              <div style={{
                height: "100%",
                borderRadius: "2px",
                background: "linear-gradient(90deg, rgba(15,255,197,0.5), #0fffc5)",
                width: `${loadingPct}%`,
                transition: "width 0.4s ease",
                boxShadow: "0 0 10px rgba(15,255,197,0.6)",
              }} />
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div style={{
            position: "absolute",
            inset: 0,
            background: "rgba(2,24,43,0.95)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            textAlign: "center",
            gap: "20px",
          }}>
            <div style={{ fontSize: "48px" }}>⚠️</div>
            <div>
              <p style={{ color: "#ff6b6b", fontWeight: "700", fontSize: "18px", marginBottom: "10px" }}>
                Camera Error
              </p>
              <p style={{ color: "rgba(232,244,240,0.6)", fontSize: "14px", marginBottom: "16px", maxWidth: "400px" }}>
                {error}
              </p>
              <p style={{ color: "rgba(232,244,240,0.35)", fontSize: "12px" }}>
                Please allow camera access and use HTTPS or localhost
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setLoadingPct(0);
                window.location.reload();
              }}
              style={{
                padding: "12px 28px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: "600",
                background: "#0fffc5",
                color: "#02182b",
                border: "none",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats overlay */}
        {!isLoading && !error && (
          <>
            {/* Top-left: FPS */}
            <div style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              background: "rgba(0,0,0,0.75)",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(15,255,197,0.3)",
            }}>
              <p style={{
                color: fps >= 20 ? "#0fffc5" : "#eab308",
                fontSize: "24px",
                fontWeight: "800",
                fontFamily: "monospace",
                lineHeight: 1,
              }}>
                {fps} FPS
              </p>
              <p style={{
                color: "rgba(232,244,240,0.4)",
                fontSize: "10px",
                marginTop: "4px",
              }}>
                BlazePose Heavy
              </p>
            </div>

            {/* Top-right: Keypoint count */}
            <div style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(0,0,0,0.75)",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(15,255,197,0.3)",
            }}>
              <p style={{
                color: keypointCount >= 25 ? "#0fffc5" : keypointCount >= 15 ? "#eab308" : "#ef4444",
                fontSize: "24px",
                fontWeight: "800",
                fontFamily: "monospace",
                lineHeight: 1,
              }}>
                {keypointCount}/33
              </p>
              <p style={{
                color: "rgba(232,244,240,0.4)",
                fontSize: "10px",
                marginTop: "4px",
              }}>
                Keypoints Detected
              </p>
            </div>
          </>
        )}
      </div>

      {/* Info cards */}
      {!isLoading && !error && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
          width: "100%",
          maxWidth: "1000px",
        }}>
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🎯</div>
            <h3 style={{ color: "#0fffc5", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
              33 Keypoints
            </h3>
            <p style={{ color: "rgba(232,244,240,0.6)", fontSize: "13px", lineHeight: "1.6" }}>
              Full body tracking including face, torso, arms, hands, legs, and feet landmarks
            </p>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📐</div>
            <h3 style={{ color: "#60a5fa", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
              3D Coordinates
            </h3>
            <p style={{ color: "rgba(232,244,240,0.6)", fontSize: "13px", lineHeight: "1.6" }}>
              X, Y positions plus Z depth for accurate 3D pose estimation
            </p>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "20px",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</div>
            <h3 style={{ color: "#f472b6", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
              Real-time
            </h3>
            <p style={{ color: "rgba(232,244,240,0.6)", fontSize: "13px", lineHeight: "1.6" }}>
              Runs at 20-30 FPS on modern devices with WebGL acceleration
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
