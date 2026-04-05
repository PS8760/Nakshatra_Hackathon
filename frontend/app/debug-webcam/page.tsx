"use client";
/**
 * Debug Webcam - Find out EXACTLY what's wrong
 * This will show us step-by-step what's failing
 */

import { useEffect, useRef, useState } from "react";

export default function DebugWebcamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState({
    cameraAccess: false,
    videoPlaying: false,
    canvasDrawing: false,
    tfLoaded: false,
    modelLoaded: false,
    detectionWorking: false,
  });

  const addLog = (msg: string, isError = false) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    setLogs((prev) => [...prev, logMsg]);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: any = null;
    let animationId: number;

    async function runTests() {
      try {
        // TEST 1: Camera Access
        addLog("🧪 TEST 1: Requesting camera access...");
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          addLog("✅ TEST 1 PASSED: Camera access granted");
          setTestResults((prev) => ({ ...prev, cameraAccess: true }));
        } catch (err: any) {
          addLog(`❌ TEST 1 FAILED: ${err.message}`, true);
          return;
        }

        // TEST 2: Video Playing
        addLog("🧪 TEST 2: Starting video playback...");
        try {
          if (!videoRef.current) throw new Error("Video element not found");
          videoRef.current.srcObject = stream;

          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current!;
            video.onloadedmetadata = () => {
              addLog(
                `   Video size: ${video.videoWidth}x${video.videoHeight}`
              );
              video
                .play()
                .then(() => {
                  addLog("✅ TEST 2 PASSED: Video is playing");
                  setTestResults((prev) => ({ ...prev, videoPlaying: true }));
                  resolve();
                })
                .catch(reject);
            };
            setTimeout(() => reject(new Error("Video timeout")), 5000);
          });
        } catch (err: any) {
          addLog(`❌ TEST 2 FAILED: ${err.message}`, true);
          return;
        }

        // TEST 3: Canvas Drawing
        addLog("🧪 TEST 3: Testing canvas drawing...");
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (!canvas || !video) throw new Error("Canvas or video not found");

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Cannot get 2D context");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          addLog(`   Canvas size: ${canvas.width}x${canvas.height}`);

          // Try to draw video frame
          ctx.drawImage(video, 0, 0);

          // Draw test circle
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(100, 100, 50, 0, Math.PI * 2);
          ctx.fill();

          addLog("✅ TEST 3 PASSED: Canvas drawing works");
          setTestResults((prev) => ({ ...prev, canvasDrawing: true }));
        } catch (err: any) {
          addLog(`❌ TEST 3 FAILED: ${err.message}`, true);
          return;
        }

        // TEST 4: TensorFlow Loading
        addLog("🧪 TEST 4: Loading TensorFlow.js...");
        try {
          const tf = await import("@tensorflow/tfjs-core");
          await import("@tensorflow/tfjs-backend-webgl");
          await tf.setBackend("webgl");
          await tf.ready();
          addLog("✅ TEST 4 PASSED: TensorFlow.js loaded");
          setTestResults((prev) => ({ ...prev, tfLoaded: true }));
        } catch (err: any) {
          addLog(`❌ TEST 4 FAILED: ${err.message}`, true);
          return;
        }

        // TEST 5: Model Loading
        addLog("🧪 TEST 5: Loading MoveNet model...");
        try {
          const poseDetection = await import("@tensorflow-models/pose-detection");
          detector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
              modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            }
          );
          addLog("✅ TEST 5 PASSED: MoveNet model loaded");
          setTestResults((prev) => ({ ...prev, modelLoaded: true }));
        } catch (err: any) {
          addLog(`❌ TEST 5 FAILED: ${err.message}`, true);
          return;
        }

        // TEST 6: Pose Detection
        addLog("🧪 TEST 6: Running pose detection...");
        try {
          const video = videoRef.current!;
          const poses = await detector.estimatePoses(video);
          addLog(`   Detected ${poses.length} pose(s)`);

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            addLog(`   Found ${keypoints.length} keypoints`);

            // Count high confidence keypoints
            const highConf = keypoints.filter((kp: any) => kp.score > 0.5).length;
            addLog(`   High confidence keypoints: ${highConf}`);

            addLog("✅ TEST 6 PASSED: Pose detection working");
            setTestResults((prev) => ({ ...prev, detectionWorking: true }));

            // Start continuous detection
            startDetectionLoop(detector);
          } else {
            addLog("⚠️ TEST 6 WARNING: No poses detected (move into frame)");
          }
        } catch (err: any) {
          addLog(`❌ TEST 6 FAILED: ${err.message}`, true);
          return;
        }

        addLog("🎉 ALL TESTS PASSED! Pose detection should be working.");
      } catch (err: any) {
        addLog(`❌ UNEXPECTED ERROR: ${err.message}`, true);
      }
    }

    function startDetectionLoop(detector: any) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video || !detector) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let frameCount = 0;

      function loop() {
        if (!video || !canvas || !ctx) return;

        // Draw video
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0);

        // Run detection
        detector
          .estimatePoses(video)
          .then((poses: any[]) => {
            if (poses.length > 0) {
              const keypoints = poses[0].keypoints;

              // Draw ALL keypoints
              keypoints.forEach((kp: any, i: number) => {
                if (kp.score > 0.1) {
                  // Very low threshold
                  // Large red circle
                  ctx.fillStyle = `rgba(255, 0, 0, ${kp.score})`;
                  ctx.beginPath();
                  ctx.arc(kp.x, kp.y, 20, 0, Math.PI * 2);
                  ctx.fill();

                  // White border
                  ctx.strokeStyle = "#FFF";
                  ctx.lineWidth = 3;
                  ctx.beginPath();
                  ctx.arc(kp.x, kp.y, 20, 0, Math.PI * 2);
                  ctx.stroke();

                  // Keypoint number
                  ctx.fillStyle = "#FFF";
                  ctx.font = "bold 16px Arial";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(i.toString(), kp.x, kp.y);
                }
              });

              // Draw frame count
              ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
              ctx.fillRect(10, 10, 200, 60);
              ctx.fillStyle = "#0F0";
              ctx.font = "20px monospace";
              ctx.textAlign = "left";
              ctx.fillText(`Frame: ${frameCount}`, 20, 35);
              ctx.fillText(`Joints: ${keypoints.length}`, 20, 55);

              frameCount++;
            }
          })
          .catch((err: any) => {
            addLog(`Detection error: ${err.message}`, true);
          });

        animationId = requestAnimationFrame(loop);
      }

      loop();
    }

    runTests();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (detector) detector.dispose();
    };
  }, []);

  const allPassed = Object.values(testResults).every((v) => v);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B1F2E",
        color: "#0F0",
        padding: 32,
        fontFamily: "monospace",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: "#0FF" }}>
          🔍 Webcam Debug Tool
        </h1>
        <p style={{ fontSize: 14, marginBottom: 32, color: "#888" }}>
          This will tell us EXACTLY what's wrong
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Video + Canvas */}
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16, color: "#0FF" }}>
              📹 Webcam Feed
            </h2>

            <div
              style={{
                position: "relative",
                background: "#111",
                border: "3px solid #0FF",
                borderRadius: 8,
                marginBottom: 16,
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
                }}
              />
            </div>

            {/* Test Results */}
            <div
              style={{
                background: "#111",
                border: "2px solid #333",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3 style={{ fontSize: 16, marginBottom: 12, color: "#0FF" }}>
                Test Results
              </h3>
              {Object.entries(testResults).map(([test, passed]) => (
                <div
                  key={test}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                    padding: 8,
                    background: passed ? "#001100" : "#110000",
                    borderRadius: 4,
                  }}
                >
                  <span style={{ fontSize: 20 }}>{passed ? "✅" : "❌"}</span>
                  <span style={{ color: passed ? "#0F0" : "#F00" }}>
                    {test.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </div>
              ))}

              {allPassed && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    background: "#001100",
                    border: "2px solid #0F0",
                    borderRadius: 8,
                    textAlign: "center",
                  }}
                >
                  <strong style={{ color: "#0F0", fontSize: 16 }}>
                    🎉 ALL TESTS PASSED!
                  </strong>
                  <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
                    If you see red circles with numbers on your body, it's
                    working!
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Logs */}
          <div>
            <h2 style={{ fontSize: 18, marginBottom: 16, color: "#0FF" }}>
              📋 Debug Log
            </h2>
            <div
              style={{
                background: "#111",
                border: "2px solid #333",
                borderRadius: 8,
                padding: 16,
                height: 600,
                overflowY: "auto",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              {logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 4,
                    color: log.includes("❌")
                      ? "#F00"
                      : log.includes("✅")
                      ? "#0F0"
                      : log.includes("⚠️")
                      ? "#FF0"
                      : "#0FF",
                  }}
                >
                  {log}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ color: "#888" }}>Running tests...</div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div
          style={{
            marginTop: 32,
            padding: 24,
            background: "#111",
            border: "2px solid #333",
            borderRadius: 8,
          }}
        >
          <h3 style={{ fontSize: 18, marginBottom: 16, color: "#0FF" }}>
            📖 What to Look For
          </h3>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 16 }}>
              <strong style={{ color: "#0F0" }}>✅ If ALL tests pass:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>You should see your webcam feed</li>
                <li>
                  You should see LARGE RED CIRCLES with WHITE BORDERS on your
                  body
                </li>
                <li>Each circle should have a NUMBER inside it (0-16)</li>
                <li>Frame counter should be incrementing</li>
                <li>Joints counter should show 17</li>
              </ul>
            </div>

            <div style={{ marginBottom: 16 }}>
              <strong style={{ color: "#F00" }}>❌ If any test fails:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>Check the debug log for the exact error message</li>
                <li>The first failed test tells us where the problem is</li>
                <li>
                  Copy the error message and share it so we can fix the specific
                  issue
                </li>
              </ul>
            </div>

            <div>
              <strong style={{ color: "#FF0" }}>⚠️ Common Issues:</strong>
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                <li>
                  <strong>Camera Access Failed:</strong> Grant camera permission
                  in browser
                </li>
                <li>
                  <strong>Video Not Playing:</strong> Try refreshing the page
                </li>
                <li>
                  <strong>Canvas Drawing Failed:</strong> Browser compatibility
                  issue
                </li>
                <li>
                  <strong>TensorFlow Failed:</strong> Network issue or browser
                  doesn't support WebGL
                </li>
                <li>
                  <strong>Model Loading Failed:</strong> Network issue
                  downloading model
                </li>
                <li>
                  <strong>Detection Failed:</strong> Move into camera frame
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
