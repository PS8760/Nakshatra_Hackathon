"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createSession, endSession, logPainEvent } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useLang } from "@/context/LangContext";
import type { JointName } from "@/types";
import { shouldTriggerReferral } from "@/components/session/ReferralCard";

const PoseCamera   = dynamic(() => import("@/components/session/PoseCamera"),   { ssr: false });
const PhysioGuide  = dynamic(() => import("@/components/session/PhysioGuide"),  { ssr: false });
const ReferralCard = dynamic(() => import("@/components/session/ReferralCard"), { ssr: false });

const JOINT_PRESETS = [
  { id: "full",     label: "Full Body",  joints: undefined,                                           icon: "🏃" },
  { id: "knee",     label: "Knee",       joints: ["knee_left", "knee_right"] as JointName[],          icon: "🦵" },
  { id: "shoulder", label: "Shoulder",   joints: ["shoulder_left", "shoulder_right"] as JointName[], icon: "💪" },
  { id: "hip",      label: "Hip",        joints: ["hip_left", "hip_right"] as JointName[],            icon: "🦴" },
];

function PainModal({ onLog, onClose }: { onLog: (j: string, i: number) => void; onClose: () => void }) {
  const [joint, setJoint] = useState("knee_left");
  const [intensity, setIntensity] = useState(5);
  const joints = ["knee_left","knee_right","shoulder_left","shoulder_right","elbow_left","elbow_right","hip_left","hip_right"];
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(2,24,43,0.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#031e35",border:"1px solid rgba(15,255,197,0.2)",borderRadius:20,padding:"28px",width:"100%",maxWidth:360,boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
        <div style={{ height:1,background:"linear-gradient(90deg,transparent,rgba(15,255,197,.3),transparent)",marginBottom:24 }} />
        <h3 style={{ fontWeight:700,fontSize:17,color:"#e8f4f0",marginBottom:20 }}>🚨 Log Pain Event</h3>
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:12,color:"rgba(232,244,240,0.5)",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:8 }}>Joint</label>
          <select value={joint} onChange={e=>setJoint(e.target.value)} style={{ width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(15,255,197,0.15)",color:"#e8f4f0",borderRadius:10,padding:"10px 14px",fontSize:14,outline:"none" }}>
            {joints.map(j=><option key={j} value={j} style={{background:"#031e35"}}>{j.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:12,color:"rgba(232,244,240,0.5)",letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:8 }}>
            Intensity: <span style={{ color:intensity>=7?"#ef4444":intensity>=4?"#eab308":"#22c55e" }}>{intensity}/10</span>
          </label>
          <input type="range" min={1} max={10} value={intensity} onChange={e=>setIntensity(Number(e.target.value))} style={{ width:"100%",accentColor:"#0fffc5" }} />
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"rgba(232,244,240,0.3)",marginTop:4 }}>
            <span>Mild</span><span>Moderate</span><span>Severe</span>
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={()=>{onLog(joint,intensity);onClose();}} style={{ flex:1,padding:"11px 0",borderRadius:10,fontSize:14,fontWeight:700,background:"#ef4444",color:"#fff",border:"none",cursor:"pointer" }}>Log Pain</button>
          <button onClick={onClose} style={{ flex:1,padding:"11px 0",borderRadius:10,fontSize:14,fontWeight:500,background:"rgba(255,255,255,0.05)",color:"rgba(232,244,240,0.7)",border:"1px solid rgba(255,255,255,0.1)",cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function SessionPage() {
  const router  = useRouter();
  const { token } = useAuthStore();
  const { t }   = useLang();

  const [sessionId,  setSessionId]  = useState<number | null>(null);
  const [phase,      setPhase]      = useState<"idle"|"demo"|"active">("idle");
  const [elapsed,    setElapsed]    = useState(0);
  const [startTime,  setStartTime]  = useState(0);
  const [repCounts,  setRepCounts]  = useState<Partial<Record<JointName,number>>>({});
  const [feedback,   setFeedback]   = useState<{message:string;status:string}|null>(null);
  const [physScores, setPhysScores] = useState<number[]>([]);
  const [showPain,   setShowPain]   = useState(false);
  const [preset,     setPreset]     = useState(JOINT_PRESETS[0]);
  const [ending,     setEnding]     = useState(false);
  const [referral,   setReferral]   = useState<{trigger:"pain"|"posture_critical";intensity?:number}|null>(null);
  const timerRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => { useAuthStore.getState().hydrate(); }, []);

  // On mount: check if arrived from ExercisePlan demo button
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      const ex = sessionStorage.getItem("nr_demo_exercise");
      if (ex) {
        const match = JOINT_PRESETS.find(p =>
          p.joints?.includes(ex as JointName) ||
          p.id === ex.replace("_left","").replace("_right","")
        );
        if (match) setPreset(match);
        sessionStorage.removeItem("nr_demo_exercise");
        sessionStorage.removeItem("nr_demo_name");
        // Auto-start demo immediately
        setPhase("demo");
      }
    }
  }, []);

  // Timer — only runs during active phase
  useEffect(() => {
    if (phase === "active") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (phase !== "active") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const totalReps = Object.values(repCounts).reduce((a,b) => a+(b??0), 0);

  // "Start Session" → demo first, then camera
  const handleStart = async () => {
    setPhase("demo");
  };

  // Called by PhysioGuide when demo finishes (~16s)
  const handleDemoComplete = useCallback(async () => {
    try {
      const res = await createSession("physical");
      setSessionId(res.data.id);
      setStartTime(Date.now());
      setRepCounts({});
      setPhysScores([]);
      setPhase("active");
    } catch {
      alert("Failed to start session. Is the backend running?");
      setPhase("idle");
    }
  }, []);

  const handleEnd = async () => {
    if (!sessionId || ending) return;
    setEnding(true);
    const duration_s = Math.floor((Date.now() - startTime) / 1000);
    const avgPhysical = physScores.length ? physScores.reduce((a,b)=>a+b,0)/physScores.length : undefined;
    try { await endSession(sessionId, duration_s, avgPhysical); } catch {}
    if (typeof window !== "undefined") localStorage.setItem("nr_session_ended", String(Date.now()));
    setPhase("idle");
    setSessionId(null);
    setEnding(false);
    router.push("/dashboard");
  };

  const handleRepComplete = useCallback((joint: JointName, angle: number, repCount: number) => {
    setRepCounts(prev => ({ ...prev, [joint]: repCount }));
    setPhysScores(prev => [...prev.slice(-50), Math.min(100, (angle/120)*100)]);
  }, []);

  const handleFeedback = useCallback((message: string, status: string) => {
    setFeedback({ message, status });
    setTimeout(() => setFeedback(null), 4000);
    if (status === "critical" && !referral) setReferral({ trigger: "posture_critical" });
  }, [referral]);

  const handlePainLog = async (joint: string, intensity: number) => {
    if (!sessionId) return;
    try { await logPainEvent(sessionId, joint, intensity); } catch {}
    if (shouldTriggerReferral(intensity)) setReferral({ trigger: "pain", intensity });
  };

  if (!token) return (
    <div style={{ minHeight:"100vh",background:"#02182b",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <p style={{ color:"rgba(232,244,240,0.6)",marginBottom:16 }}>Please sign in to start a session.</p>
        <button onClick={()=>router.push("/auth")} style={{ padding:"10px 24px",borderRadius:10,background:"#0fffc5",color:"#02182b",fontWeight:700,border:"none",cursor:"pointer" }}>Sign In</button>
      </div>
    </div>
  );

  const feedbackColor = feedback?.status==="good"?"#22c55e":feedback?.status==="warning"?"#eab308":feedback?.status==="out_of_range"?"#ef4444":"#0fffc5";
  const exerciseId = preset.id === "full" ? "full" : preset.joints?.[0] ?? "full";

  return (
    <div style={{ minHeight:"100vh",background:"#02182b",color:"#e8f4f0",paddingTop:64 }}>
      {showPain && <PainModal onLog={handlePainLog} onClose={()=>setShowPain(false)} />}
      {referral && (
        <ReferralCard
          trigger={referral.trigger}
          painIntensity={referral.intensity}
          postureStatus={referral.trigger==="posture_critical"?"critical":undefined}
          onDismiss={()=>setReferral(null)}
        />
      )}

      <div className="W" style={{ paddingTop:20,paddingBottom:40 }}>

        {/* Top bar */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <button onClick={()=>router.push("/dashboard")} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(232,244,240,0.6)",borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer" }}>
              ← Dashboard
            </button>
            <div>
              <p style={{ fontWeight:700,fontSize:15,color:"#e8f4f0" }}>Physical Rehabilitation</p>
              <p style={{ fontSize:11,color:"rgba(232,244,240,0.4)" }}>
                {phase==="demo" ? "🎬 Robot Demo — watch carefully" : "Track A — Joint Recovery"}
              </p>
            </div>
          </div>
          {phase==="active" && (
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#22c55e",animation:"pulseDot 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize:13,color:"#22c55e",fontWeight:600 }}>LIVE</span>
              <span style={{ fontSize:20,fontFamily:"monospace",fontWeight:700,color:"#e8f4f0",marginLeft:4 }}>{fmt(elapsed)}</span>
            </div>
          )}
        </div>

        {/* Preset selector — only when idle */}
        {phase==="idle" && (
          <div style={{ marginBottom:20 }}>
            <p style={{ fontSize:12,color:"rgba(232,244,240,0.4)",marginBottom:10,letterSpacing:".06em",textTransform:"uppercase" }}>Select Exercise Focus</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {JOINT_PRESETS.map(p => (
                <button key={p.id} onClick={()=>setPreset(p)} style={{
                  padding:"8px 16px",borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all .2s",
                  background:preset.id===p.id?"rgba(15,255,197,0.12)":"rgba(255,255,255,0.04)",
                  border:`1px solid ${preset.id===p.id?"rgba(15,255,197,0.4)":"rgba(255,255,255,0.08)"}`,
                  color:preset.id===p.id?"#0fffc5":"rgba(232,244,240,0.6)",
                }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display:"grid",gridTemplateColumns:"1fr 200px 280px",gap:16,alignItems:"start" }} className="session-grid">

          {/* Left — camera */}
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>

            {/* Camera / placeholder */}
            {phase==="active" && sessionId && token ? (
              <PoseCamera
                sessionId={sessionId} token={token}
                preset={preset.id} activeJoints={preset.joints}
                onRepComplete={handleRepComplete}
                onFeedback={handleFeedback}
                onFormScore={score=>setPhysScores(prev=>[...prev.slice(-50),score])}
              />
            ) : (
              <div style={{ aspectRatio:"16/9",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(15,255,197,0.1)",borderRadius:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12 }}>
                {phase==="demo" ? (
                  <>
                    <span style={{ fontSize:40 }}>🎬</span>
                    <p style={{ color:"#f59e0b",fontSize:14,fontWeight:600 }}>Robot is demonstrating {preset.label}</p>
                    <p style={{ color:"rgba(232,244,240,0.35)",fontSize:12 }}>Camera starts automatically after demo</p>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize:48,opacity:.4 }}>📷</span>
                    <p style={{ color:"rgba(232,244,240,0.4)",fontSize:14 }}>Camera starts after robot demo</p>
                    <p style={{ color:"rgba(232,244,240,0.25)",fontSize:12 }}>Selected: {preset.icon} {preset.label}</p>
                  </>
                )}
              </div>
            )}

            {/* Feedback banner */}
            {feedback && phase==="active" && (
              <div style={{ padding:"12px 16px",borderRadius:12,background:`${feedbackColor}15`,border:`1px solid ${feedbackColor}40`,display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:feedbackColor,flexShrink:0 }} />
                <p style={{ fontSize:14,color:feedbackColor,fontWeight:500 }}>{feedback.message}</p>
              </div>
            )}
          </div>

          {/* Middle — robot */}
          <PhysioGuide
            exercise={exerciseId}
            isActive={phase==="active"}
            repCount={totalReps}
            feedback={feedback}
            formScore={physScores.length ? physScores[physScores.length-1] : null}
            demoMode={phase==="demo"}
            onDemoComplete={handleDemoComplete}
          />

          {/* Right — controls */}
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>

            {/* Control card */}
            <div style={{ background:"rgba(255,255,255,0.025)",border:"1px solid rgba(15,255,197,0.1)",borderRadius:16,padding:"20px",position:"relative",overflow:"hidden" }}>
              <div style={{ position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",width:"60%",height:1,background:"linear-gradient(90deg,transparent,rgba(15,255,197,.25),transparent)" }} />

              {phase==="idle" && (
                <div style={{ textAlign:"center" }}>
                  <p style={{ fontSize:13,color:"rgba(232,244,240,0.45)",marginBottom:6 }}>
                    {preset.icon} {preset.label}
                  </p>
                  <p style={{ fontSize:11,color:"rgba(232,244,240,0.3)",marginBottom:16 }}>
                    Robot will demonstrate first, then camera starts
                  </p>
                  <button onClick={handleStart} style={{ width:"100%",padding:"14px 0",borderRadius:12,background:"#0fffc5",color:"#02182b",fontWeight:700,fontSize:15,border:"none",cursor:"pointer",boxShadow:"0 0 24px rgba(15,255,197,0.3)" }}>
                    ▶ Start Session
                  </button>
                </div>
              )}

              {phase==="demo" && (
                <div style={{ textAlign:"center" }}>
                  <span style={{ fontSize:32 }}>🎬</span>
                  <p style={{ fontSize:13,fontWeight:700,color:"#f59e0b",marginTop:8,marginBottom:4 }}>Watch the Demo</p>
                  <p style={{ fontSize:11,color:"rgba(232,244,240,0.4)" }}>
                    Camera starts automatically when the robot finishes
                  </p>
                </div>
              )}

              {phase==="active" && (
                <div>
                  <div style={{ textAlign:"center",marginBottom:14 }}>
                    <p style={{ fontSize:36,fontFamily:"monospace",fontWeight:800,color:"#e8f4f0",letterSpacing:".05em" }}>{fmt(elapsed)}</p>
                    <p style={{ fontSize:11,color:"rgba(232,244,240,0.35)" }}>Session duration</p>
                  </div>

                  <div style={{ background:"rgba(15,255,197,0.06)",border:"1px solid rgba(15,255,197,0.12)",borderRadius:10,padding:"12px 16px",textAlign:"center",marginBottom:12 }}>
                    <p style={{ fontSize:28,fontWeight:800,color:"#0fffc5" }}>{totalReps}</p>
                    <p style={{ fontSize:11,color:"rgba(232,244,240,0.4)" }}>Total reps</p>
                  </div>

                  {Object.entries(repCounts).length > 0 && (
                    <div style={{ display:"flex",flexDirection:"column",gap:5,marginBottom:12 }}>
                      {Object.entries(repCounts).map(([j,c]) => (
                        <div key={j} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize:11,color:"rgba(232,244,240,0.5)",textTransform:"capitalize" }}>{j.replace(/_/g," ")}</span>
                          <span style={{ fontSize:15,fontWeight:700,color:"#0fffc5" }}>{c}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display:"flex",gap:8 }}>
                    <button onClick={()=>setShowPain(true)} style={{ flex:1,padding:"10px 0",borderRadius:10,fontSize:13,fontWeight:600,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",cursor:"pointer" }}>
                      🚨 Pain
                    </button>
                    <button onClick={handleEnd} disabled={ending} style={{ flex:2,padding:"10px 0",borderRadius:10,fontSize:13,fontWeight:700,background:ending?"rgba(255,255,255,0.05)":"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.4)",color:ending?"rgba(232,244,240,0.4)":"#ef4444",cursor:ending?"not-allowed":"pointer" }}>
                      {ending?"Saving…":"■ End Session"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Colour guide — always visible, compact */}
            <div style={{ background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"14px 16px" }}>
              <p style={{ fontWeight:600,fontSize:12,color:"#e8f4f0",marginBottom:10 }}>Colour Guide</p>
              {[["#22c55e","Within 5° of target"],["#eab308","Within 15° of target"],["#ef4444","More than 15° away"],["#6b7280","Not visible"]].map(([c,l])=>(
                <div key={l} style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:c,flexShrink:0 }} />
                  <span style={{ fontSize:11,color:"rgba(232,244,240,0.45)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width:1100px) { .session-grid { grid-template-columns:1fr 300px !important; } .session-grid>div:nth-child(2){display:none;} }
        @media (max-width:768px)  { .session-grid { grid-template-columns:1fr !important; } .session-grid>div:nth-child(2){display:none;} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}
