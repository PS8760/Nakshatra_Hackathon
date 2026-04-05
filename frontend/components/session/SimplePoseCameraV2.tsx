"use client";
/**
 * SimplePoseCameraV2 - Guaranteed Working Implementation
 * 
 * This is the SIMPLEST possible implementation that WILL work:
 * 1. Shows webcam feed
 * 2. Draws skeleton overlay
 * 3. No complex analysis, just basic tracking
 */

import { useEffect, useRef, useState } from "react";

export default function SimplePoseCameraV2() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Initializing...");
  const [fps, setFps] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);
  const animationRef = useRef<number>(0);
  const detectorRef = useRef<any>(null);
  const fpsRef = useRef({ frames: 0, lastTime: Date.now() });

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        setStatus("Loading TensorFlow.js...");
        
        // Import TensorFlow
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        await tf.setBackend("webgl");
        await tf.ready();
        
        setStatus("Loading BlazePose Lite...");
        
        // Import pose detection
        const poseDetection = await import("@tensorflow-models/pose-detection");
        
        // Use LITE model for better performance
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: "tfjs",
            modelType: "lite", // LITE is much faster than heavy
            enableSmoothing: false, // Disable for better performance
            enableSegmentation: false,
          }
        );
        
        detectorRef.current = detector;
        setStatus("Starting camera...");
        
        // Get camera with lower resolution for better performance
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user"
          },
          audio: false
        });
        
        if (!videoRef.current || !active) return;
        
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play().then(() => {
              console.log("✅ Video ready:", video.videoWidth, "x", video.videoHeight);
              resolve();
            });
          };
        });
        
        setStatus("Running");
        
        // Start detection loop
        detectLoop();
        
      } catch (err: any) {
        console.error("❌ Init error:", err);
        setStatus(`Error: ${err.message}`);
      }
    }

    function detectLoop() {
      if (!active) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas || !detectorRef.current) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      
      if (video.readyState < 2) {
        animationRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      // Set canvas size to match video
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        console.log("Canvas sized:", canvas.width, "x", canvas.height);
      }
      
      // Draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Run pose detection asynchronously
      detectorRef.current.estimatePoses(video, {
        maxPoses: 1,
        flipHorizontal: false,
      }).then((poses: any[]) => {
        if (!active || poses.length === 0) return;
        
        const pose = poses[0];
        const keypoints = pose.keypoints || [];
        
        setLandmarkCount(keypoints.length);
        
        // Draw skeleton
        drawSkeleton(ctx, keypoints, canvas.width, canvas.height);
        
        // Update FPS
        const now = Date.now();
        fpsRef.current.frames++;
        if (now - fpsRef.current.lastTime >= 1000) {
          setFps(fpsRef.current.frames);
          fpsRef.current = { frames: 0, lastTime: now };
        }
      }).catch((err: any) => {
        console.error("Detection error:", err);
      });
      
      // Continue loop
      animationRef.current = requestAnimationFrame(detectLoop);
    }

    function drawSkeleton(
      ctx: CanvasRenderingContext2D,
      keypoints: any[],
      width: number,
      height: number
    ) {
      // BlazePose connections (simplified)
      const connections = [
        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], // Arms
        [11, 23], [12, 24], [23, 24], // Torso
        [23, 25], [25, 27], [24, 26], [26, 28], // Legs
      ];
      
      // Draw connections (bones)
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3;
      
      for (const [startIdx, endIdx] of connections) {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];
        
        if (start && end && start.score > 0.3 && end.score > 0.3) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
        }
      }
      
      // Draw keypoints (joints)
      for (const kp of keypoints) {
        if (kp.score > 0.3) {
          // Outer glow
          ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 10, 0, Math.PI * 2);
          ctx.fill();
          
          // Main dot
          ctx.fillStyle = "#00FF00";
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
          ctx.fill();
          
          // Border
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    init();

    return () => {
      active = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", maxWidth: 800, margin: "0 auto" }}>
      {/* Canvas */}
      <div style={{ position: "relative", background: "#000", borderRadius: 12, overflow: "hidden" }}>
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "auto",
            visibility: "hidden"
          }}
          playsInline
          muted
        />
        
        <canvas
          ref={canvasRef}
          style={{
            width: "100%",
            height: "auto",
            display: "block"
          }}
        />
        
        {/* Status overlay */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          right: 10,
          background: "rgba(0, 0, 0, 0.8)",
          padding: 12,
          borderRadius: 8,
          color: "#0F0",
          fontFamily: "monospace",
          fontSize: 14
        }}>
          <div>Status: {status}</div>
          <div>FPS: {fps}</div>
          <div>Keypoints: {landmarkCount}</div>
        </div>
      </div>
      
      {/* Instructions */}
      <div style={{
        marginTop: 16,
        padding: 16,
        background: "#111",
        borderRadius: 8,
        color: "#FFF",
        fontSize: 14
      }}>
        <div style={{ marginBottom: 8, fontWeight: "bold" }}>✅ What you should see:</div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Your webcam feed on the canvas</li>
          <li>Cyan lines connecting your joints (skeleton)</li>
          <li>Green dots at each joint</li>
          <li>FPS counter showing 15-30</li>
          <li>Keypoints showing 33 when you're in frame</li>
        </ul>
      </div>
    </div>
  );
}
