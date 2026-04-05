"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function PhysioLabPage() {
  // Phase state
  const [phase, setPhase] = useState<"intake" | "session" | "report">("intake");

  // Intake data
  const [painArea, setPainArea] = useState<string>("");
  const [painIntensity, setPainIntensity] = useState<number>(5);

  // Session data
  const [score, setScore] = useState<number>(0);
  const [repCount, setRepCount] = useState<number>(0);
  const [sessionTime, setSessionTime] = useState<number>(0);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const userCanvasRef = useRef<HTMLCanvasElement>(null);
  const mannequinCanvasRef = useRef<HTMLCanvasElement>(null);
  const poseDetectorRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);
  const sessionStartRef = useRef<number>(0);
  const lastSpeakRef = useRef<number>(0);
  const mannequinFrameRef = useRef<number>(0);
  const totalScoreRef = useRef<number>(0);
  const scoreCountRef = useRef<number>(0);

  // Initialize audio on button click
  const initializeSession = useCallback(() => {
    if (!painArea) {
      alert("Please select a pain area");
      return;
    }

    // CRITICAL: Unlock browser audio
    const utterance = new SpeechSynthesisUtterance(
      "Physiotherapy session initiated. Let's begin your personalized rehabilitation program."
    );
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    // Transition to session
    setPhase("session");
    setIsSessionActive(true);
    sessionStartRef.current = Date.now();
  }, [painArea]);

  // Voice function with cooldown
  const speak = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastSpeakRef.current < 5000) return; // 5s cooldown

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
    lastSpeakRef.current = now;
  }, []);

  // Session timer
  useEffect(() => {
    if (!isSessionActive) return;

    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive]);

  // Mannequin animation
  useEffect(() => {
    if (phase !== "session") return;

    const canvas = mannequinCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 500;

    let frame = 0;
    const cycleFrames = 120; // 2 seconds at 60fps

    function drawMannequin() {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = "#0a0e1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate animation progress (0 to 1)
      const progress = (frame % cycleFrames) / cycleFrames;
      mannequinFrameRef.current = frame;

      // Squat animation (for knee pain)
      const squatDepth = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5; // 0 to 1
      const yOffset = squatDepth * 80; // 0 to 80px down

      // Mannequin body parts
      const centerX = canvas.width / 2;
      const baseY = 150;

      // Head
      ctx.beginPath();
      ctx.arc(centerX, baseY + yOffset - 100, 25, 0, Math.PI * 2);
      ctx.fillStyle = "#4ade80";
      ctx.fill();
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Torso
      ctx.beginPath();
      ctx.moveTo(centerX, baseY + yOffset - 75);
      ctx.lineTo(centerX, baseY + yOffset + 50);
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Arms
      const armAngle = Math.sin(progress * Math.PI * 2) * 0.3;
      
      // Left arm
      ctx.beginPath();
      ctx.moveTo(centerX, baseY + yOffset - 60);
      ctx.lineTo(centerX - 40 + Math.cos(armAngle) * 20, baseY + yOffset - 20);
      ctx.lineTo(centerX - 50 + Math.cos(armAngle) * 30, baseY + yOffset + 20);
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 6;
      ctx.stroke();

      // Right arm
      ctx.beginPath();
      ctx.moveTo(centerX, baseY + yOffset - 60);
      ctx.lineTo(centerX + 40 - Math.cos(armAngle) * 20, baseY + yOffset - 20);
      ctx.lineTo(centerX + 50 - Math.cos(armAngle) * 30, baseY + yOffset + 20);
      ctx.stroke();

      // Legs (bent during squat)
      const kneeAngle = squatDepth * 1.2;
      
      // Left leg
      ctx.beginPath();
      ctx.moveTo(centerX, baseY + yOffset + 50);
      ctx.lineTo(centerX - 30, baseY + yOffset + 120 + kneeAngle * 30);
      ctx.lineTo(centerX - 35, baseY + yOffset + 200);
      ctx.strokeStyle = "#4ade80";
      ctx.lineWidth = 7;
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(centerX, baseY + yOffset + 50);
      ctx.lineTo(centerX + 30, baseY + yOffset + 120 + kneeAngle * 30);
      ctx.lineTo(centerX + 35, baseY + yOffset + 200);
      ctx.stroke();

      // Joint highlights
      const joints = [
        { x: centerX, y: baseY + yOffset - 75 }, // neck
        { x: centerX, y: baseY + yOffset + 50 }, // hips
        { x: centerX - 30, y: baseY + yOffset + 120 + kneeAngle * 30 }, // left knee
        { x: centerX + 30, y: baseY + yOffset + 120 + kneeAngle * 30 }, // right knee
      ];

      joints.forEach(joint => {
        ctx.beginPath();
        ctx.arc(joint.x, joint.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Voice coaching based on animation frame
      if (frame % cycleFrames === 10) {
        speak("Bend your knees slowly");
      } else if (frame % cycleFrames === 60) {
        speak("Stand tall, push through your heels");
      }

      frame++;
      animationFrameRef.current = requestAnimationFrame(drawMannequin);
    }

    drawMannequin();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [phase, speak]);

  // MediaPipe Pose detection
  useEffect(() => {
    if (phase !== "session") return;

    let stream: MediaStream;
    let isActive = true;

    async function initPose() {
      try {
        // Get camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        });

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();

        // Load TensorFlow and Pose Detection
        const tf = await import("@tensorflow/tfjs-core");
        await import("@tensorflow/tfjs-backend-webgl");
        const poseDetection = await import("@tensorflow-models/pose-detection");

        await tf.setBackend("webgl");
        await tf.ready();

        // Create detector with high accuracy
        poseDetectorRef.current = await poseDetection.createDetector(
          poseDetection.SupportedModels.BlazePose,
          {
            runtime: "tfjs",
            modelType: "heavy", // Highest accuracy
            enableSmoothing: true,
            enableSegmentation: false
          }
        );

        detectPose();
      } catch (error) {
        console.error("Pose init error:", error);
      }
    }

    async function detectPose() {
      if (!isActive || !poseDetectorRef.current) return;

      const video = videoRef.current;
      const canvas = userCanvasRef.current;

      if (!video || !canvas || video.readyState < 2) {
        requestAnimationFrame(detectPose);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      try {
        // Detect poses
        const poses = await poseDetectorRef.current.estimatePoses(video, {
          maxPoses: 1,
          flipHorizontal: false
        });

        // Draw video
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if (poses.length > 0) {
          const keypoints = poses[0].keypoints;

          // Draw skeleton
          const connections = [
            [11, 13], [13, 15], // left arm
            [12, 14], [14, 16], // right arm
            [11, 12], // shoulders
            [11, 23], [12, 24], // torso
            [23, 24], // hips
            [23, 25], [25, 27], [27, 29], [27, 31], // left leg
            [24, 26], [26, 28], [28, 30], [28, 32], // right leg
          ];

          // Draw bones
          ctx.strokeStyle = "#00ff00";
          ctx.lineWidth = 4;
          ctx.shadowColor = "#00ff00";
          ctx.shadowBlur = 10;

          connections.forEach(([i, j]) => {
            const kp1 = keypoints[i];
            const kp2 = keypoints[j];

            if (kp1.score && kp2.score && kp1.score > 0.3 && kp2.score > 0.3) {
              ctx.beginPath();
              ctx.moveTo(kp1.x, kp1.y);
              ctx.lineTo(kp2.x, kp2.y);
              ctx.stroke();
            }
          });

          // Draw joints
          ctx.shadowBlur = 15;
          keypoints.forEach((kp: any) => {
            if (kp.score && kp.score > 0.3) {
              ctx.beginPath();
              ctx.arc(kp.x, kp.y, 6, 0, Math.PI * 2);
              ctx.fillStyle = "#ffff00";
              ctx.fill();
            }
          });

          ctx.shadowBlur = 0;

          // Calculate score (simplified)
          const validKeypoints = keypoints.filter((kp: any) => kp.score && kp.score > 0.5);
          const currentScore = Math.min(100, (validKeypoints.length / 33) * 100);
          setScore(Math.round(currentScore));

          totalScoreRef.current += currentScore;
          scoreCountRef.current += 1;

          // Rep detection (simplified - based on hip height)
          const leftHip = keypoints[23];
          const rightHip = keypoints[24];
          if (leftHip.score && rightHip.score && leftHip.score > 0.5 && rightHip.score > 0.5) {
            const hipY = (leftHip.y + rightHip.y) / 2;
            const normalized = hipY / canvas.height;

            // Simple rep counter (when hips go down and up)
            if (normalized > 0.6 && mannequinFrameRef.current % 120 < 10) {
              setRepCount(prev => prev + 1);
              
              if (currentScore > 90) {
                speak("Perfect alignment, repeat");
              } else if (currentScore < 50) {
                speak("Focus on the lab mannequin's form, adjust your posture");
              }
            }
          }
        }
      } catch (error) {
        console.error("Pose detection error:", error);
      }

      requestAnimationFrame(detectPose);
    }

    initPose();

    return () => {
      isActive = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [phase, speak]);

  // End session
  const endSession = useCallback(() => {
    setIsSessionActive(false);
    setPhase("report");
  }, []);

  // Reset
  const resetSession = useCallback(() => {
    setPhase("intake");
    setPainArea("");
    setPainIntensity(5);
    setScore(0);
    setRepCount(0);
    setSessionTime(0);
    totalScoreRef.current = 0;
    scoreCountRef.current = 0;
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Phase 1: Intake */}
      {phase === "intake" && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-2xl w-full border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-8 text-center">
              NeuroRestore Physiotherapy Lab
            </h1>
            
            <div className="space-y-8">
              <div>
                <label className="block text-white text-lg mb-4 font-medium">
                  Where are you experiencing pain today?
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {["Knee", "Shoulder", "Lower Back"].map(area => (
                    <button
                      key={area}
                      onClick={() => setPainArea(area)}
                      className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                        painArea === area
                          ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-105"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white text-lg mb-4 font-medium">
                  Pain Intensity: {painIntensity}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={painIntensity}
                  onChange={(e) => setPainIntensity(Number(e.target.value))}
                  className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-white/60 text-sm mt-2">
                  <span>Mild</span>
                  <span>Severe</span>
                </div>
              </div>

              <button
                onClick={initializeSession}
                className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xl font-bold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all hover:scale-105"
              >
                Initialize Physiotherapy Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 2: Session */}
      {phase === "session" && (
        <div className="min-h-screen p-6">
          <div className="grid grid-cols-3 gap-6 h-[calc(100vh-3rem)]">
            {/* Column 1: AI Mannequin */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">
                AI Guide
              </h2>
              <div className="flex items-center justify-center h-[calc(100%-4rem)]">
                <canvas
                  ref={mannequinCanvasRef}
                  className="rounded-xl border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20"
                />
              </div>
            </div>

            {/* Column 2: User Mirror */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-4 text-center">
                Live Mirror
              </h2>
              <div className="relative h-[calc(100%-4rem)]">
                <video
                  ref={videoRef}
                  className="hidden"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={userCanvasRef}
                  className="w-full h-full object-contain rounded-xl border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
                />
              </div>
            </div>

            {/* Column 3: Clinical HUD */}
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Clinical HUD
              </h2>
              
              <div className="space-y-6 flex-1">
                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <div className="text-white/60 text-sm mb-2">Accuracy Score</div>
                  <div className="text-5xl font-bold text-emerald-400">{score}%</div>
                </div>

                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <div className="text-white/60 text-sm mb-2">Repetitions</div>
                  <div className="text-5xl font-bold text-blue-400">{repCount}</div>
                </div>

                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <div className="text-white/60 text-sm mb-2">Session Time</div>
                  <div className="text-5xl font-bold text-purple-400">{formatTime(sessionTime)}</div>
                </div>

                <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                  <div className="text-white/60 text-sm mb-2">Pain Area</div>
                  <div className="text-2xl font-semibold text-white">{painArea}</div>
                </div>
              </div>

              <button
                onClick={endSession}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white text-lg font-bold rounded-xl hover:shadow-xl hover:shadow-red-500/50 transition-all mt-6"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3: Report */}
      {phase === "report" && (
        <div className="flex items-center justify-center min-h-screen p-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 max-w-4xl w-full border border-white/20 shadow-2xl">
            <h1 className="text-4xl font-bold text-white mb-8 text-center border-b border-white/20 pb-6">
              Session Summary Dashboard
            </h1>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-white/60 text-sm mb-2">Pain Area</div>
                <div className="text-2xl font-bold text-white">{painArea}</div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-white/60 text-sm mb-2">Pain Intensity</div>
                <div className="text-2xl font-bold text-white">{painIntensity}/10</div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-white/60 text-sm mb-2">Session Duration</div>
                <div className="text-2xl font-bold text-white">{formatTime(sessionTime)}</div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="text-white/60 text-sm mb-2">Total Repetitions</div>
                <div className="text-2xl font-bold text-white">{repCount}</div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10 col-span-2">
                <div className="text-white/60 text-sm mb-2">Average Accuracy</div>
                <div className="text-4xl font-bold text-emerald-400">
                  {scoreCountRef.current > 0 
                    ? Math.round(totalScoreRef.current / scoreCountRef.current)
                    : 0}%
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-8 border border-white/10 mb-8">
              <h2 className="text-xl font-bold text-white mb-4">AI Medical Recommendations</h2>
              <div className="text-white/80 leading-relaxed space-y-3">
                <p>
                  <strong>Clinical Assessment:</strong> Patient presented with {painArea.toLowerCase()} pain 
                  at intensity level {painIntensity}/10. Completed {repCount} repetitions over {formatTime(sessionTime)} 
                  with an average accuracy of {scoreCountRef.current > 0 
                    ? Math.round(totalScoreRef.current / scoreCountRef.current)
                    : 0}%.
                </p>
                <p>
                  {scoreCountRef.current > 0 && totalScoreRef.current / scoreCountRef.current < 60 ? (
                    <>
                      <strong>Recommendation:</strong> Your accuracy score was {Math.round(totalScoreRef.current / scoreCountRef.current)}%. 
                      Next session, focus on precise joint alignment to prevent further strain. Consider scheduling 
                      a follow-up consultation to review form and technique.
                    </>
                  ) : (
                    <>
                      <strong>Recommendation:</strong> Excellent form demonstrated throughout the session. 
                      Continue with current exercise protocol. Gradually increase repetitions as pain decreases. 
                      Monitor for any increase in discomfort.
                    </>
                  )}
                </p>
                <p>
                  <strong>Next Steps:</strong> Schedule follow-up assessment in 7 days. Continue daily exercises 
                  as prescribed. Contact clinic if pain intensity increases beyond current levels.
                </p>
              </div>
            </div>

            <button
              onClick={resetSession}
              className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xl font-bold rounded-xl hover:shadow-2xl hover:shadow-emerald-500/50 transition-all hover:scale-105"
            >
              New Patient Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
