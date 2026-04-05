"use client";
/**
 * ExercisePlan — Progressive Exercise Card
 * ==========================================
 * Shows the user's current exercise level, progress toward the next,
 * and easier/harder variations if needed.
 * Fetches from GET /exercises/plan/{joint}
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getExercisePlan, getExerciseLibrary } from "@/lib/api";

interface Variation { name: string; description: string; equipment: string; }
interface Level {
  level: number; name: string; emoji: string; description: string;
  rom_threshold: number; sets: number; reps: number; hold_s: number;
  cues: string[];
  variations: { name: string; description: string; easier: boolean; equipment: string }[];
}
interface Plan {
  joint: string; achieved_rom: number; target_rom: number;
  current: Level | null; next: Level | null;
  easier_option: Variation | null; harder_option: Variation | null;
  progress_to_next_pct: number; at_max_level: boolean; total_levels: number;
}
interface LibraryLevel extends Level { unlocked: boolean; completed: boolean; }

const JOINTS = [
  { id: "knee_left", label: "Knee (L)" }, { id: "knee_right", label: "Knee (R)" },
  { id: "elbow_left", label: "Elbow (L)" }, { id: "elbow_right", label: "Elbow (R)" },
  { id: "shoulder_left", label: "Shoulder (L)" }, { id: "shoulder_right", label: "Shoulder (R)" },
  { id: "hip_left", label: "Hip (L)" }, { id: "hip_right", label: "Hip (R)" },
];

export default function ExercisePlan() {
  const router = useRouter();
  const [joint,   setJoint]   = useState("knee_left");
  const [plan,    setPlan]    = useState<Plan | null>(null);
  const [library, setLibrary] = useState<LibraryLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showVariations, setShowVariations] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([getExercisePlan(joint), getExerciseLibrary(joint)])
      .then(([p, l]) => { setPlan(p.data); setLibrary(l.data.chain || []); })
      .catch(() => { setPlan(null); setLibrary([]); })
      .finally(() => setLoading(false));
  }, [joint]);

  const cur = plan?.current;
  const nxt = plan?.next;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Header + joint selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0", marginBottom: 2 }}>
            Exercise Progression
          </h3>
          <p style={{ fontSize: 11, color: "rgba(232,244,240,0.35)" }}>
            Personalised to your current ROM
          </p>
        </div>
        <select value={joint} onChange={e => setJoint(e.target.value)} style={{
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(15,255,197,0.2)",
          color: "#e8f4f0", borderRadius: 8, padding: "5px 10px", fontSize: 11, outline: "none",
        }}>
          {JOINTS.map(j => <option key={j.id} value={j.id} style={{ background: "#02182b" }}>{j.label}</option>)}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", margin: "0 auto",
            border: "2px solid rgba(15,255,197,0.2)", borderTopColor: "#0fffc5",
            animation: "spinCW .8s linear infinite" }} />
        </div>
      )}

      {!loading && cur && (
        <>
          {/* Current exercise card */}
          <div style={{
            background: "rgba(15,255,197,0.05)", border: "1px solid rgba(15,255,197,0.2)",
            borderRadius: 16, padding: "16px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 24 }}>{cur.emoji}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0fffc5" }}>{cur.name}</p>
                    <span style={{ fontSize: 9, background: "rgba(15,255,197,0.15)",
                      color: "#0fffc5", padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>
                      LEVEL {cur.level}/{plan?.total_levels}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(232,244,240,0.5)", marginTop: 2 }}>
                    {cur.sets} sets × {cur.reps} reps{cur.hold_s > 0 ? ` · ${cur.hold_s}s hold` : ""}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, color: "rgba(232,244,240,0.4)" }}>Achieved</p>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#0fffc5" }}>{plan?.achieved_rom}°</p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "rgba(232,244,240,0.65)", lineHeight: 1.5, marginBottom: 12 }}>
              {cur.description}
            </p>

            {/* Coaching cues */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
              {cur.cues.map((cue, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#0fffc5", fontSize: 10, marginTop: 2, flexShrink: 0 }}>▸</span>
                  <span style={{ fontSize: 11, color: "rgba(232,244,240,0.6)" }}>{cue}</span>
                </div>
              ))}
            </div>

            {/* Progress bar toward next level */}
            {!plan?.at_max_level && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: "rgba(232,244,240,0.4)" }}>
                    Progress to Level {cur.level + 1}
                  </span>
                  <span style={{ fontSize: 10, color: "#0fffc5", fontWeight: 700 }}>
                    {plan?.progress_to_next_pct}%
                  </span>
                </div>
                <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${plan?.progress_to_next_pct}%`,
                    background: "linear-gradient(90deg,rgba(15,255,197,0.5),#0fffc5)",
                    transition: "width 1s ease",
                    boxShadow: "0 0 8px rgba(15,255,197,0.4)",
                  }} />
                </div>
                <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)", marginTop: 4 }}>
                  Reach {cur.rom_threshold}° to unlock: {nxt?.emoji} {nxt?.name}
                </p>
              </div>
            )}

            {plan?.at_max_level && (
              <div style={{ padding: "8px 12px", borderRadius: 8,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <p style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                  🏆 Maximum level reached! Consult your physiotherapist for advanced programming.
                </p>
              </div>
            )}

            {/* Watch & Follow CTA */}
            <button
              onClick={() => {
                // Store selected exercise in sessionStorage so session page picks it up
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("nr_demo_exercise", joint);
                  sessionStorage.setItem("nr_demo_name", cur.name);
                }
                router.push("/session?demo=1");
              }}
              style={{
                width: "100%", marginTop: 12, padding: "12px", borderRadius: 12,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: "linear-gradient(135deg,rgba(245,158,11,0.15),rgba(239,68,68,0.1))",
                border: "1px solid rgba(245,158,11,0.35)",
                color: "#f59e0b",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all .2s",
              }}
            >
              <span style={{ fontSize: 16 }}>🎬</span>
              Watch Robot Demo, Then Follow Along
            </button>
          </div>

          {/* Next level preview */}
          {nxt && (
            <div style={{
              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14, padding: "12px 16px",
              opacity: 0.7,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(232,244,240,0.5)" }}>
                  Next: {nxt.emoji} {nxt.name}
                </p>
                <span style={{ fontSize: 9, background: "rgba(255,255,255,0.06)",
                  color: "rgba(232,244,240,0.3)", padding: "2px 6px", borderRadius: 4 }}>
                  Unlocks at {nxt.rom_threshold}°
                </span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(232,244,240,0.35)" }}>{nxt.description}</p>
            </div>
          )}

          {/* Variations toggle */}
          <button onClick={() => setShowVariations(v => !v)} style={{
            padding: "10px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(232,244,240,0.6)", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>🔄 Can't do this exercise? See alternatives</span>
            <span style={{ fontSize: 10 }}>{showVariations ? "▲" : "▼"}</span>
          </button>

          {showVariations && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {plan?.easier_option && (
                <div style={{
                  background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>⬇️</span>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                      Easier: {plan.easier_option.name}
                    </p>
                    {plan.easier_option.equipment !== "none" && (
                      <span style={{ fontSize: 9, background: "rgba(34,197,94,0.1)",
                        color: "#22c55e", padding: "1px 6px", borderRadius: 4 }}>
                        {plan.easier_option.equipment}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(232,244,240,0.55)" }}>
                    {plan.easier_option.description}
                  </p>
                </div>
              )}
              {plan?.harder_option && (
                <div style={{
                  background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>⬆️</span>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#ef4444" }}>
                      Harder: {plan.harder_option.name}
                    </p>
                    {plan.harder_option.equipment !== "none" && (
                      <span style={{ fontSize: 9, background: "rgba(239,68,68,0.1)",
                        color: "#ef4444", padding: "1px 6px", borderRadius: 4 }}>
                        {plan.harder_option.equipment}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(232,244,240,0.55)" }}>
                    {plan.harder_option.description}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Roadmap toggle */}
          <button onClick={() => setShowRoadmap(r => !r)} style={{
            padding: "10px 14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(232,244,240,0.6)", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span>🗺️ View full progression roadmap</span>
            <span style={{ fontSize: 10 }}>{showRoadmap ? "▲" : "▼"}</span>
          </button>

          {showRoadmap && library.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {library.map((lvl, i) => (
                <div key={lvl.level} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: 10,
                  background: lvl.completed ? "rgba(15,255,197,0.06)"
                    : lvl.unlocked ? "rgba(255,255,255,0.04)"
                    : "rgba(255,255,255,0.02)",
                  border: `1px solid ${lvl.completed ? "rgba(15,255,197,0.25)"
                    : lvl.unlocked ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.04)"}`,
                  opacity: lvl.unlocked ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {lvl.completed ? "✅" : lvl.unlocked ? lvl.emoji : "🔒"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 600,
                      color: lvl.completed ? "#0fffc5" : lvl.unlocked ? "#e8f4f0" : "rgba(232,244,240,0.35)" }}>
                      Level {lvl.level}: {lvl.name}
                    </p>
                    <p style={{ fontSize: 10, color: "rgba(232,244,240,0.3)" }}>
                      Target: {lvl.rom_threshold}° · {lvl.sets}×{lvl.reps}
                      {lvl.hold_s > 0 ? ` · ${lvl.hold_s}s hold` : ""}
                    </p>
                  </div>
                  {lvl.completed && (
                    <span style={{ fontSize: 9, background: "rgba(15,255,197,0.15)",
                      color: "#0fffc5", padding: "2px 7px", borderRadius: 5, fontWeight: 700 }}>
                      DONE
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !cur && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: 13, color: "rgba(232,244,240,0.35)" }}>
            No exercise data yet. Complete a session to see your plan.
          </p>
        </div>
      )}
    </div>
  );
}
