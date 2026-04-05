"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const PhysioGuide = dynamic(() => import("@/components/session/PhysioGuide"), { ssr: false });

const EXERCISES = [
  {
    id: "squat",
    name: "Squat",
    icon: "🦵",
    description: "Full body lower body exercise targeting quads, glutes, and hamstrings",
    benefits: ["Strengthens legs", "Improves balance", "Enhances mobility"],
    targetJoints: ["knee_left", "knee_right", "hip_left", "hip_right"],
    difficulty: "Beginner",
    duration: "3-5 sets of 10-15 reps",
    color: "#6B9EFF",
  },
  {
    id: "shoulder_press",
    name: "Shoulder Press",
    icon: "💪",
    description: "Upper body exercise for shoulder strength and stability",
    benefits: ["Builds shoulder strength", "Improves posture", "Increases range of motion"],
    targetJoints: ["shoulder_left", "shoulder_right"],
    difficulty: "Intermediate",
    duration: "3 sets of 8-12 reps",
    color: "#7BAAFF",
  },
  {
    id: "knee_left",
    name: "Knee Raise",
    icon: "🦿",
    description: "Isolated knee flexion exercise for rehabilitation",
    benefits: ["Strengthens knee flexors", "Improves joint mobility", "Reduces stiffness"],
    targetJoints: ["knee_left", "hip_left"],
    difficulty: "Beginner",
    duration: "2-3 sets of 15-20 reps per leg",
    color: "#6B9EFF",
  },
  {
    id: "bicep_curl",
    name: "Bicep Curl",
    icon: "💪",
    description: "Arm strengthening exercise focusing on elbow flexion",
    benefits: ["Builds arm strength", "Improves grip", "Enhances daily function"],
    targetJoints: ["elbow_left", "elbow_right"],
    difficulty: "Beginner",
    duration: "3 sets of 10-15 reps",
    color: "#5A8EEE",
  },
  {
    id: "hip_abduction",
    name: "Hip Abduction",
    icon: "🦴",
    description: "Lateral leg raise for hip stability and strength",
    benefits: ["Strengthens hip abductors", "Improves balance", "Prevents falls"],
    targetJoints: ["hip_left", "hip_right"],
    difficulty: "Intermediate",
    duration: "3 sets of 12-15 reps per leg",
    color: "#7BAAFF",
  },
];

export default function ExercisesPage() {
  const router = useRouter();
  const [selectedExercise, setSelectedExercise] = useState(EXERCISES[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoStartTime, setDemoStartTime] = useState<number | null>(null);

  // Auto-stop after one complete cycle (approximately 4 seconds for one full animation)
  useEffect(() => {
    if (isPlaying && demoStartTime) {
      const demoDuration = 4000; // One complete cycle in milliseconds (slower for better visibility)
      const timer = setTimeout(() => {
        setIsPlaying(false);
        setDemoStartTime(null);
      }, demoDuration);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, demoStartTime]);

  const handlePlayDemo = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setDemoStartTime(Date.now());
    } else {
      setIsPlaying(false);
      setDemoStartTime(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1F2E", color: "#FFFFFF", paddingTop: 64 }}>
      <div className="W" style={{ paddingTop: 32, paddingBottom: 56 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => router.push("/dashboard")} style={{
            background: "#1A3447", border: "1px solid #243B4E",
            color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "6px 12px",
            fontSize: 13, cursor: "pointer", marginBottom: 16,
          }}>← Back to Dashboard</button>
          
          <div className="pill" style={{ marginBottom: 16 }}>🏋️ Exercise Library</div>
          <h1 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 800, letterSpacing: "-.025em", marginBottom: 12 }}>
            Exercise Demonstrations
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", maxWidth: 680 }}>
            Explore our AI-guided exercise library. Watch 3D demonstrations and learn proper form for each movement.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 28, alignItems: "start" }} className="exercise-grid">
          
          {/* Exercise List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => { 
                  setSelectedExercise(ex); 
                  setIsPlaying(false); 
                  setDemoStartTime(null);
                }}
                style={{
                  background: selectedExercise.id === ex.id ? "#1A3447" : "rgba(255,255,255,0.03)",
                  border: `2px solid ${selectedExercise.id === ex.id ? ex.color : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 16,
                  padding: "18px 20px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all .3s",
                }}
                onMouseEnter={(e) => {
                  if (selectedExercise.id !== ex.id) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(107,158,255,0.3)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedExercise.id !== ex.id) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 28 }}>{ex.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 2 }}>
                      {ex.name}
                    </p>
                    <p style={{ fontSize: 11, color: ex.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>
                      {ex.difficulty}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  {ex.description}
                </p>
              </button>
            ))}
          </div>

          {/* Exercise Details & Demo */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* 3D Demo */}
            <div style={{
              background: "linear-gradient(135deg, #1A3447 0%, #0d1b2a 100%)",
              border: "2px solid #243B4E",
              borderRadius: 20,
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
              {/* Status indicator */}
              <div style={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
                padding: "8px 14px",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: isPlaying ? "#10b981" : "#6B9EFF",
                  boxShadow: isPlaying ? "0 0 12px #10b981" : "0 0 8px #6B9EFF",
                  animation: isPlaying ? "pulseDot 1.5s ease-in-out infinite" : "none",
                }} />
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  letterSpacing: "0.05em",
                }}>
                  {isPlaying ? "DEMONSTRATING" : "READY"}
                </span>
              </div>

              {/* Exercise name overlay */}
              <div style={{
                position: "absolute",
                top: 16,
                left: 16,
                zIndex: 20,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(107,158,255,0.3)",
              }}>
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: selectedExercise.color,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}>
                  {selectedExercise.name}
                </span>
              </div>
              
              <div style={{ 
                height: 520,
                position: "relative",
                background: "radial-gradient(circle at 50% 50%, rgba(107,158,255,0.05) 0%, transparent 70%)",
              }}>
                <PhysioGuide
                  exercise={selectedExercise.id}
                  isActive={isPlaying}
                  repCount={0}
                  feedback={null}
                  formScore={null}
                />
              </div>
              
              {/* Play/Pause Control */}
              <div style={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 20,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}>
                <button
                  onClick={handlePlayDemo}
                  style={{
                    background: isPlaying 
                      ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                      : `linear-gradient(135deg, ${selectedExercise.color} 0%, #5A8EEE 100%)`,
                    border: "none",
                    borderRadius: 50,
                    padding: "16px 36px",
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: isPlaying
                      ? "0 6px 24px rgba(239,68,68,0.5)"
                      : `0 6px 24px ${selectedExercise.color}60`,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all .3s",
                    letterSpacing: "0.05em",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.05) translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = isPlaying
                      ? "0 8px 32px rgba(239,68,68,0.6)"
                      : `0 8px 32px ${selectedExercise.color}80`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    (e.currentTarget as HTMLElement).style.boxShadow = isPlaying
                      ? "0 6px 24px rgba(239,68,68,0.5)"
                      : `0 6px 24px ${selectedExercise.color}60`;
                  }}
                >
                  {isPlaying ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="2" width="3" height="12" rx="1" fill="white"/>
                        <rect x="10" y="2" width="3" height="12" rx="1" fill="white"/>
                      </svg>
                      PAUSE
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 2L13 8L4 14V2Z" fill="white"/>
                      </svg>
                      PLAY DEMO
                    </>
                  )}
                </button>
                
                {/* Replay hint */}
                {!isPlaying && demoStartTime && (
                  <span style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 500,
                  }}>
                    Click to replay
                  </span>
                )}
              </div>
            </div>

            {/* Exercise Info */}
            <div style={{
              background: "linear-gradient(135deg, #1A3447 0%, #0d1b2a 100%)",
              border: "2px solid #243B4E",
              borderRadius: 20,
              padding: "32px 36px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: `${selectedExercise.color}20`,
                  border: `2px solid ${selectedExercise.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                }}>
                  {selectedExercise.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: 30, fontWeight: 800, color: "#FFFFFF", marginBottom: 6, letterSpacing: "-0.02em" }}>
                    {selectedExercise.name}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      fontSize: 11,
                      color: selectedExercise.color,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      padding: "4px 10px",
                      background: `${selectedExercise.color}15`,
                      borderRadius: 6,
                      border: `1px solid ${selectedExercise.color}30`,
                    }}>
                      {selectedExercise.difficulty}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      fontWeight: 500,
                    }}>
                      ⏱ {selectedExercise.duration}
                    </span>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.8, marginBottom: 28 }}>
                {selectedExercise.description}
              </p>

              {/* Benefits */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#6B9EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p style={{ fontSize: 13, color: "#6B9EFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
                    Key Benefits
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedExercise.benefits.map((benefit, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "rgba(107,158,255,0.05)",
                      borderRadius: 10,
                      border: "1px solid rgba(107,158,255,0.1)",
                    }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: `${selectedExercise.color}25`,
                        border: `1.5px solid ${selectedExercise.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l2.5 2.5L10 3" stroke={selectedExercise.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Joints */}
              <div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M2 12h20" stroke="#6B9EFF" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="3" stroke="#6B9EFF" strokeWidth="2"/>
                  </svg>
                  <p style={{ fontSize: 13, color: "#6B9EFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", margin: 0 }}>
                    Target Joints
                  </p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {selectedExercise.targetJoints.map((joint) => (
                    <span
                      key={joint}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        background: `${selectedExercise.color}20`,
                        border: `1.5px solid ${selectedExercise.color}50`,
                        color: selectedExercise.color,
                        fontSize: 13,
                        fontWeight: 600,
                        textTransform: "capitalize",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {joint.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Session CTA */}
            <button
              onClick={() => router.push("/session")}
              style={{
                background: "linear-gradient(135deg, #6B9EFF 0%, #5A8EEE 100%)",
                border: "none",
                borderRadius: 16,
                padding: "22px 36px",
                color: "#FFFFFF",
                fontSize: 17,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 6px 28px rgba(107,158,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                transition: "all .3s",
                letterSpacing: "0.03em",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 36px rgba(107,158,255,0.5)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 28px rgba(107,158,255,0.4)";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="#FFFFFF"/>
              </svg>
              Start Guided Session
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12M11 5l5 5-5 5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .exercise-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
