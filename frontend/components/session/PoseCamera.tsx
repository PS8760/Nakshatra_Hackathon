"use client";
/**
 * PoseCamera — MediaPipe Pose with Native Rendering
 *
 * Uses MediaPipe Pose library with built-in drawing utilities:
 * - 33 keypoints with 3D coordinates
 * - MediaPipe's native rendering for professional visualization
 * - Fast and highly accurate tracking
 * - Detects wrong posture, form faults, asymmetry in real time
 * - Exercise classifier identifies squat/lunge/shoulder press/curl etc.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  analyzePosture, classifyExercise,
  createRepPhaseState, JOINT_KP_MAP,
  type ExerciseType, type RepPhaseState, type PostureFault, type Keypoint3D,
} from "@/lib/postureEngine";
import type { JointName } from "@/types";

// Declare MediaPipe globals
declare global {
  interface Window {
    Pose: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
  }
}

interface Props {
  sessionId: number;
  token: string;
  preset?: string;
  activeJoints?: JointName[];
  onRepComplete?: (joint: JointName, angle: number, repCount: number) => void;
  onFeedback?: (msg: string, status: string) => void;
  onFormScore?: (score: number) => void;
  onPainLog?: () => void;
  onEndSession?: () => void;
  onSessionData?: (data: {
    repCount: number;
    avgFormScore: number | null;
    sessionTime: number;
    exercise: string;
    formScore: number | null;
  }) => void;
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

// Fault severity → colour
const FAULT_COLOR: Record<string, string> = {
  error: "#6B9EFF",
  warning: "#6B9EFF",
  info: "#6B9EFF",
};

export default function PoseCamera({
  sessionId, token, preset = "full",
  onRepComplete, onFeedback, onFormScore, onSessionData,
}: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const wsRef       = useRef<WebSocket | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef      = useRef<number>(0);
  const activeRef   = useRef(true);
  const repStateRef = useRef<RepPhaseState>(createRepPhaseState());
  const exerciseRef = useRef<ExerciseType>("unknown");
  const fpsRef      = useRef({ frames: 0, lastTime: Date.now() });
  const lastFaultRef = useRef<string>("");
  const lastFaultTime = useRef<number>(0);

  const [isLoading,   setIsLoading]   = useState(true);
  const [loadingMsg,  setLoadingMsg]  = useState("Initialising…");
  const [loadingPct,  setLoadingPct]  = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps,         setFps]         = useState(0);
  const [formScore,   setFormScore]   = useState<number | null>(null);
  const [faults,      setFaults]      = useState<PostureFault[]>([]);
  const [exercise,    setExercise]    = useState<string>("Detecting…");
  const [phase,       setPhase]       = useState<string>("");
  const [repCount,    setRepCount]    = useState(0);
  const [angles,      setAngles]      = useState<Record<string, number>>({});
  const [avgFormScore, setAvgFormScore] = useState<number | null>(null);
  const sessionStartRef = useRef<number>(0);
  const formScoresRef = useRef<number[]>([]);

  // ── Voice ──────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1;
    window.speechSynthesis.speak(u);
  }, []);

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const wsToken = token || (typeof window !== "undefined" ? localStorage.getItem("nr_token") : null);
    if (!wsToken) return;
    const ws = new WebSocket(`${WS_URL}/ws/session/${sessionId}?token=${wsToken}`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.event === "feedback") onFeedback?.(d.message, d.status);
      } catch {}
    };
    ws.onerror = () => {};
    return () => { try { ws.close(); } catch {} };
  }, [sessionId, token, onFeedback]);

  const sendRepEvent = useCallback((angle: number, target: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        event: "rep_complete",
        joint: exerciseRef.current,
        angle, target,
        timestamp: Math.floor(Date.now() / 1000),
        session_id: sessionId,
      }));
    }
  }, [sessionId]);

  // ── Draw skeleton with color-coded body parts ──────────────────────────────
  const drawSkeleton = useCallback((
    results: any,
    faultList: PostureFault[],
    ctx: CanvasRenderingContext2D,
    w: number, h: number
  ) => {
    if (!results.poseLandmarks) return;

    const { drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window;
    
    if (drawConnectors && drawLandmarks && POSE_CONNECTIONS) {
      // Define ALL body part groups with colors - COMPLETE 33 KEYPOINTS
      const bodyParts = {
        // Face connections (0-10) - 11 keypoints
        face: {
          connections: [
            [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10]
          ],
          color: '#FF6B9D', // Pink
          landmarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Nose, eyes, ears, mouth
          label: 'Face'
        },
        // Left arm (11, 13, 15, 17, 19, 21) - 6 keypoints
        leftArm: {
          connections: [
            [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19]
          ],
          color: '#4ECDC4', // Turquoise
          landmarks: [11, 13, 15, 17, 19, 21], // Shoulder, elbow, wrist, pinky, index, thumb
          label: 'Left Arm & Hand'
        },
        // Right arm (12, 14, 16, 18, 20, 22) - 6 keypoints
        rightArm: {
          connections: [
            [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20]
          ],
          color: '#95E1D3', // Light turquoise
          landmarks: [12, 14, 16, 18, 20, 22], // Shoulder, elbow, wrist, pinky, index, thumb
          label: 'Right Arm & Hand'
        },
        // Torso (11, 12, 23, 24) - 4 keypoints
        torso: {
          connections: [
            [11, 12], [11, 23], [12, 24], [23, 24]
          ],
          color: '#FFE66D', // Yellow
          landmarks: [11, 12, 23, 24], // Shoulders and hips
          label: 'Torso'
        },
        // Left leg (23, 25, 27, 29, 31) - 5 keypoints
        leftLeg: {
          connections: [
            [23, 25], [25, 27], [27, 29], [27, 31], [29, 31]
          ],
          color: '#FF6B6B', // Red
          landmarks: [23, 25, 27, 29, 31], // Hip, knee, ankle, heel, foot index
          label: 'Left Leg & Foot'
        },
        // Right leg (24, 26, 28, 30, 32) - 5 keypoints
        rightLeg: {
          connections: [
            [24, 26], [26, 28], [28, 30], [28, 32], [30, 32]
          ],
          color:   '#C44569', // Dark red
          landmarks: [24, 26, 28, 30, 32], // Hip, knee, ankle, heel, foot index
          label: 'Right Leg & Foot'
        }
      };

      // Draw connections for each body part with its color - ULTRA LOW THRESHOLD
      Object.values(bodyParts).forEach(part => {
        part.connections.forEach(([start, end]) => {
          const startLm = results.poseLandmarks[start];
          const endLm = results.poseLandmarks[end];
          
          // LOWERED from 0.3 to 0.1 - draw almost everything
          if (startLm && endLm && startLm.visibility > 0.1 && endLm.visibility > 0.1) {
            ctx.beginPath();
            ctx.strokeStyle = part.color;
            ctx.lineWidth = 5;
            ctx.lineCap = 'round';
            ctx.moveTo(startLm.x * w, startLm.y * h);
            ctx.lineTo(endLm.x * w, endLm.y * h);
            ctx.stroke();
          }
        });
      });

      // Draw ALL 33 landmarks with color coding - EVERY SINGLE JOINT (NO LABELS)
      results.poseLandmarks.forEach((landmark: any, index: number) => {
        // LOWERED from 0.3 to 0.1 - draw almost everything
        if (landmark.visibility < 0.1) return;

        // Find which body part this landmark belongs to
        let color = '#FFFFFF'; // Default white for any unmapped keypoints
        
        for (const part of Object.values(bodyParts)) {
          if (part.landmarks.includes(index)) {
            color = part.color;
            break;
          }
        }

        const x = landmark.x * w;
        const y = landmark.y * h;

        // Draw outer glow
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = color + '40'; // 25% opacity
        ctx.fill();

        // Draw main circle
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Draw white border
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Overlay angle labels
    const faultMap = new Map(faultList.map(f => [f.joint ?? "", f]));
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    
    for (const [jointName, kpIdx] of Object.entries(JOINT_KP_MAP)) {
      const angle = angles[jointName];
      if (angle === undefined) continue;
      
      const landmark = results.poseLandmarks[kpIdx];
      // LOWERED from 0.3 to 0.1 - show labels for almost everything
      if (!landmark || landmark.visibility < 0.1) continue;
      
      const x = landmark.x * w;
      const y = landmark.y * h - 20; // Positioned above the joint point
      const label = `${angle.toFixed(0)}°`;
      
      // Background with rounded corners
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      const mw = ctx.measureText(label).width;
      const padding = 6;
      const bgHeight = 18;
      
      // Rounded rectangle
      ctx.beginPath();
      ctx.roundRect(x - mw / 2 - padding, y - bgHeight / 2 - 2, mw + padding * 2, bgHeight, 4);
      ctx.fill();
      
      // Text with color coding
      const fault = faultMap.get(jointName);
      const FAULT_COLOR: Record<string, string> = {
        error: "#6B9EFF",
        warning: "#6B9EFF",
        info: "#6B9EFF",
      };
      ctx.fillStyle = fault ? FAULT_COLOR[fault.severity] : "#6B9EFF";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 2;
      ctx.fillText(label, x, y + 2);
      ctx.shadowBlur = 0;
    }
  }, [angles]);

  // ── Inference loop with MediaPipe ──────────────────────────────────────────
  const runLoop = useCallback(async () => {
    if (!activeRef.current || !detectorRef.current || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) { 
      rafRef.current = requestAnimationFrame(runLoop); 
      return; 
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    try {
      // MediaPipe will handle the drawing, we just need to send the frame
      await detectorRef.current.send({ image: video });
    } catch (err) {
      console.error("Pose detection error:", err);
    }

    const now = Date.now();
    fpsRef.current.frames++;
    if (now - fpsRef.current.lastTime >= 1000) {
      setFps(fpsRef.current.frames);
      fpsRef.current = { frames: 0, lastTime: now };
      const sessionTime = Math.floor((now - sessionStartRef.current) / 1000);
      
      onSessionData?.({
        repCount,
        avgFormScore,
        sessionTime,
        exercise,
        formScore,
      });
    }

    if (activeRef.current) rafRef.current = requestAnimationFrame(runLoop);
  }, [repCount, avgFormScore, exercise, formScore, onSessionData]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    activeRef.current = true;
    let stream: MediaStream | null = null;

    async function init() {
      try {
        sessionStartRef.current = Date.now();
        setLoadingMsg("Loading MediaPipe libraries…");
        setLoadingPct(10);

        // Load MediaPipe Pose
        const poseScript = document.createElement("script");
        poseScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js";
        document.head.appendChild(poseScript);

        await new Promise<void>((resolve, reject) => {
          poseScript.onload = () => resolve();
          poseScript.onerror = () => reject(new Error("Failed to load MediaPipe Pose"));
        });

        setLoadingMsg("Loading drawing utilities…");
        setLoadingPct(25);

        // Load MediaPipe Drawing Utils
        const drawingScript = document.createElement("script");
        drawingScript.src = "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
        document.head.appendChild(drawingScript);

        await new Promise<void>((resolve, reject) => {
          drawingScript.onload = () => resolve();
          drawingScript.onerror = () => reject(new Error("Failed to load drawing utilities"));
        });

        setLoadingMsg("Initializing pose detector…");
        setLoadingPct(50);

        // Initialize MediaPipe Pose with MINIMUM thresholds
        const { Pose } = window;
        const pose = new Pose({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          }
        });

        // ULTRA-LOW thresholds - draw skeleton no matter what
        pose.setOptions({
          modelComplexity: 0,              // Lite model for speed
          smoothLandmarks: true,           // Reduce jitter
          enableSegmentation: false,       // Disable for performance
          minDetectionConfidence: 0.1,     // 10% - VERY LOW threshold
          minTrackingConfidence: 0.1       // 10% - VERY LOW threshold
        });

        // Set up results callback with detailed logging
        pose.onResults((results: any) => {
          if (!canvasRef.current || !activeRef.current) return;
          
          // DEBUG: Log nose keypoint confidence on every frame
          if (results.poseLandmarks && results.poseLandmarks[0]) {
            console.log('Nose visibility:', results.poseLandmarks[0].visibility);
            console.log('Total landmarks detected:', results.poseLandmarks.length);
          } else {
            console.log('NO LANDMARKS DETECTED');
          }
          
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          const w = canvas.width;
          const h = canvas.height;

          // Clear and draw video
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(results.image, 0, 0, w, h);

          if (results.poseLandmarks) {
            // Convert MediaPipe landmarks to our format
            const kp: Keypoint3D[] = results.poseLandmarks.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z ?? 0,
              score: lm.visibility ?? 0
            }));

            // Analyze posture
            const detectedExercise = classifyExercise(kp, preset);
            if (detectedExercise !== "unknown") exerciseRef.current = detectedExercise;

            const analysis = analyzePosture(kp, exerciseRef.current, repStateRef.current);
            repStateRef.current = analysis.repState;

            setAngles(analysis.angles);
            setFaults(analysis.faults);
            setFormScore(analysis.score);
            setExercise(exerciseRef.current.replace("_", " "));
            setPhase(analysis.phase);
            onFormScore?.(analysis.score);

            formScoresRef.current.push(analysis.score);
            if (formScoresRef.current.length > 100) formScoresRef.current.shift();
            const avg = formScoresRef.current.reduce((a, b) => a + b, 0) / formScoresRef.current.length;
            setAvgFormScore(Math.round(avg));

            if (analysis.repCompleted) {
              const newCount = repStateRef.current.count;
              setRepCount(newCount);
              const primaryJoint = (
                exerciseRef.current === "shoulder_press" || exerciseRef.current === "lateral_raise" ? "shoulder_left" :
                exerciseRef.current === "bicep_curl" ? "elbow_left" :
                exerciseRef.current === "hip_abduction" ? "hip_left" : "knee_left"
              ) as JointName;
              const primaryAngle = analysis.angles[primaryJoint] ?? analysis.angles["knee_left"] ?? 0;
              onRepComplete?.(primaryJoint, primaryAngle, newCount);
              sendRepEvent(primaryAngle, 90);
              speak(`Rep ${newCount}`);
            }

            const topFault = analysis.faults.find(f => f.severity === "error")
              ?? analysis.faults.find(f => f.severity === "warning");
            if (topFault) {
              const now = Date.now();
              if (topFault.fault !== lastFaultRef.current || now - lastFaultTime.current > 4000) {
                lastFaultRef.current = topFault.fault;
                lastFaultTime.current = now;
                onFeedback?.(topFault.message, topFault.severity === "error" ? "out_of_range" : "warning");
                if (topFault.severity === "error") speak(topFault.message);
              }
            } else if (analysis.score === 100) {
              onFeedback?.("Perfect form!", "good");
            }

            // Draw with color-coded visualization
            drawSkeleton(results, analysis.faults, ctx, w, h);
          }
        });

        detectorRef.current = pose;
        setLoadingMsg("Starting camera…");
        setLoadingPct(75);

        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },    // Lower resolution for better performance
            height: { ideal: 480 }, 
            facingMode: "user",
            frameRate: { ideal: 30, max: 30 }  // Cap frame rate
          },
          audio: false,
        });

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const v = videoRef.current!;
          v.onloadedmetadata = () => {
            v.play().then(() => {
              resolve();
            }).catch(reject);
          };
          v.onerror = reject;
        });

        setLoadingPct(100);
        setIsLoading(false);
        rafRef.current = requestAnimationFrame(runLoop);
      } catch (err: any) {
        setCameraError(err?.message || "Failed to start pose engine");
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

  useEffect(() => {
    if (!isLoading && !cameraError) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(runLoop);
    }
  }, [runLoop, isLoading, cameraError]);

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
            visibility: "hidden"
          }} 
          playsInline 
          muted 
        />
        <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block", maxHeight: "70vh" }} />

        {/* Loading */}
        {isLoading && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(2,24,43,0.93)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
          }}>
            <div style={{ position: "relative", width: 72, height: 72 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#6B9EFF", animation: "spinCW 1s linear infinite" }} />
              <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid transparent", borderBottomColor: "rgba(15,255,197,0.5)", animation: "spinCW 1.5s linear infinite reverse" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🦴</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#6B9EFF", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{loadingMsg}</p>
              <p style={{ color: "rgba(232,244,240,0.4)", fontSize: 12 }}>MediaPipe Pose · Native Rendering · 33 keypoints</p>
            </div>
            <div style={{ width: 200, height: 3, background: "rgba(15,255,197,0.1)", borderRadius: 2 }}>
              <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,rgba(15,255,197,0.5),#6B9EFF)", width: `${loadingPct}%`, transition: "width 0.4s ease", boxShadow: "0 0 8px rgba(15,255,197,0.6)" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {cameraError && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(2,24,43,0.95)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            padding: 32, textAlign: "center", gap: 16,
          }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div>
              <p style={{ color: "#ff6b6b", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Pose Engine Error</p>
              <p style={{ color: "rgba(232,244,240,0.6)", fontSize: 13, marginBottom: 12, maxWidth: 320 }}>{cameraError}</p>
              <p style={{ color: "rgba(232,244,240,0.35)", fontSize: 11 }}>Chrome/Edge · Camera permission · HTTPS or localhost</p>
            </div>
            <button onClick={() => { setCameraError(null); setIsLoading(true); setLoadingPct(0); }}
              style={{ padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "#6B9EFF", color: "#0B1F2E", border: "none", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* Minimal HUD - only FPS */}
        {!isLoading && !cameraError && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.7)", borderRadius: 6,
            padding: "4px 8px", fontSize: 10, fontFamily: "monospace",
            color: fps >= 20 ? "#6B9EFF" : "#6B9EFF",
            border: "1px solid rgba(15,255,197,0.2)",
          }}>
            {fps} FPS
          </div>
        )}
      </div>

      {/* Live fault panel */}
      {!isLoading && !cameraError && (
        <>
          {/* Color-coded body parts legend */}
          <div style={{
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "12px 14px", marginBottom: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(232,244,240,0.5)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Body Parts Color Guide
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "Face", color: "#FF6B9D" },
                { label: "Left Arm", color: "#4ECDC4" },
                { label: "Right Arm", color: "#95E1D3" },
                { label: "Torso", color: "#FFE66D" },
                { label: "Left Leg", color: "#FF6B6B" },
                { label: "Right Leg", color: "#C44569" },
              ].map(({ label, color }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, border: "2px solid #fff", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "rgba(232,244,240,0.7)" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12, padding: "12px 14px",
          }}>
            {/* Exercise + phase */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#6B9EFF", textTransform: "capitalize" }}>{exercise}</span>
                {phase && <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)", background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 5 }}>{phase}</span>}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6B9EFF" }}>Rep {repCount}</span>
            </div>

            {/* Faults */}
            {faults.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6B9EFF" }} />
                <span style={{ fontSize: 12, color: "#6B9EFF" }}>Good form — keep it up</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {faults.slice(0, 3).map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    padding: "7px 10px", borderRadius: 8,
                    background: `${FAULT_COLOR[f.severity]}10`,
                    border: `1px solid ${FAULT_COLOR[f.severity]}30`,
                  }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: FAULT_COLOR[f.severity], flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontSize: 12, color: FAULT_COLOR[f.severity], lineHeight: 1.4 }}>{f.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Angle readouts */}
            {Object.keys(angles).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                {Object.entries(angles).map(([joint, angle]) => (
                  <span key={joint} style={{
                    fontSize: 10, fontFamily: "monospace",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 5, padding: "2px 7px", color: "rgba(232,244,240,0.5)",
                  }}>
                    {joint.replace("_", " ")}: <span style={{ color: "#6B9EFF" }}>{angle.toFixed(0)}°</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}