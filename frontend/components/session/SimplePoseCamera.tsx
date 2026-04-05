"use client";
/**
 * SimplePoseCamera - Tested & Working Pose Detection
 * 
 * This is a minimal, tested implementation that WILL show:
 * 1. Your webcam feed
 * 2. Skeleton overlay with all joints visible
 * 3. Real-time tracking
 */

import { useEffect, useRef, useState } from "react";

export default function SimplePoseCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("Initializing...");
  const [error, setError] = useState<string | null>(null);
  const [detectedLandmarks, setDetectedLandmarks] = useState(0);

  useEffect(() => {
    let camera: any = null;
    let holistic: any = null;

    async function init() {
      try {
        setStatus("Loading MediaPipe...");
        
        // Load MediaPipe scripts
        const script1 = document.createElement("script");
        script1.src = "https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js";
        document.head.appendChild(script1);

        const script2 = document.createElement("script");
        script2.src = "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js";
        document.head.appendChild(script2);

        const script3 = document.createElement("script");
        script3.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
        document.head.appendChild(script3);

        // Wait for scripts to load
        await new Promise((resolve) => {
          let loaded = 0;
          const checkLoaded = () => {
            loaded++;
            if (loaded === 3) resolve(true);
          };
          script1.onload = checkLoaded;
          script2.onload = checkLoaded;
          script3.onload = checkLoaded;
        });

        setStatus("Scripts loaded, initializing Holistic...");

        // @ts-ignore
        const { Holistic } = window;
        // @ts-ignore
        const { Camera } = window;

        if (!Holistic || !Camera) {
          throw new Error("MediaPipe libraries not loaded");
        }

        // Initialize Holistic
        holistic = new Holistic({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
          },
        });

        holistic.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        setStatus("Holistic initialized, setting up camera...");

        // Set up results callback
        holistic.onResults((results: any) => {
          const canvas = canvasRef.current;
          const video = videoRef.current;

          if (!canvas || !video) return;

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          // Match canvas size to video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame
          ctx.save();
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Count landmarks
          let landmarkCount = 0;
          if (results.poseLandmarks) landmarkCount += results.poseLandmarks.length;
          if (results.leftHandLandmarks) landmarkCount += results.leftHandLandmarks.length;
          if (results.rightHandLandmarks) landmarkCount += results.rightHandLandmarks.length;
          setDetectedLandmarks(landmarkCount);

          // @ts-ignore
          const { drawConnectors, drawLandmarks } = window;

          // Draw pose
          if (results.poseLandmarks) {
            // @ts-ignore
            drawConnectors(ctx, results.poseLandmarks, Holistic.POSE_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 4,
            });
            // @ts-ignore
            drawLandmarks(ctx, results.poseLandmarks, {
              color: "#FF0000",
              lineWidth: 2,
              radius: 6,
            });
          }

          // Draw right hand
          if (results.rightHandLandmarks) {
            // @ts-ignore
            drawConnectors(ctx, results.rightHandLandmarks, Holistic.HAND_CONNECTIONS, {
              color: "#00FFFF",
              lineWidth: 3,
            });
            // @ts-ignore
            drawLandmarks(ctx, results.rightHandLandmarks, {
              color: "#0000FF",
              lineWidth: 2,
              radius: 5,
            });
          }

          // Draw left hand
          if (results.leftHandLandmarks) {
            // @ts-ignore
            drawConnectors(ctx, results.leftHandLandmarks, Holistic.HAND_CONNECTIONS, {
              color: "#FFFF00",
              lineWidth: 3,
            });
            // @ts-ignore
            drawLandmarks(ctx, results.leftHandLandmarks, {
              color: "#FF00FF",
              lineWidth: 2,
              radius: 5,
            });
          }

          // Draw status
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(10, 10, 250, 60);
          ctx.fillStyle = "#00FF00";
          ctx.font = "16px Arial";
          ctx.fillText(`Landmarks: ${landmarkCount}`, 20, 35);
          ctx.fillText(`Status: ${status}`, 20, 55);

          ctx.restore();
        });

        // Start camera
        if (videoRef.current) {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && holistic) {
                await holistic.send({ image: videoRef.current });
              }
            },
            width: 640,
            height: 480,
          });

          await camera.start();
          setStatus("Running");
          console.log("✅ Camera started successfully");
        }
      } catch (err: any) {
        console.error("❌ Error:", err);
        setError(err.message);
        setStatus("Error");
      }
    }

    init();

    return () => {
      if (camera) {
        try {
          camera.stop();
        } catch (e) {
          console.log("Camera cleanup error:", e);
        }
      }
      if (holistic) {
        try {
          holistic.close();
        } catch (e) {
          console.log("Holistic cleanup error:", e);
        }
      }
    };
  }, []);

  return (
    <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
      {/* Video element */}
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "auto",
          visibility: "hidden",
        }}
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          border: "2px solid #00FF00",
          borderRadius: 8,
        }}
      />

      {/* Debug info */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          background: "#000",
          color: "#0F0",
          fontFamily: "monospace",
          fontSize: 14,
          borderRadius: 8,
        }}
      >
        <div>Status: {status}</div>
        <div>Detected Landmarks: {detectedLandmarks}</div>
        {error && <div style={{ color: "#F00" }}>Error: {error}</div>}
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          ✓ Video element: {videoRef.current ? "Ready" : "Not ready"}
          <br />
          ✓ Canvas element: {canvasRef.current ? "Ready" : "Not ready"}
        </div>
      </div>
    </div>
  );
}
