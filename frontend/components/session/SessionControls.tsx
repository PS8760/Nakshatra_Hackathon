"use client";
import { useState, useEffect, useRef } from "react";
import type { JointName } from "@/types";

interface Props {
  isActive: boolean;
  onStart: () => void;
  onEnd: () => void;
  repCounts: Partial<Record<JointName, number>>;
  feedback: { message: string; status: string } | null;
  onPainLog: (joint: string, intensity: number) => void;
}

export default function SessionControls({ isActive, onStart, onEnd, repCounts, feedback, onPainLog }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [showPainModal, setShowPainModal] = useState(false);
  const [painJoint, setPainJoint] = useState("knee_left");
  const [painIntensity, setPainIntensity] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const feedbackBg =
    feedback?.status === "good" ? "bg-green-900/60 border-green-500" :
    feedback?.status === "warning" ? "bg-yellow-900/60 border-yellow-500" :
    feedback?.status === "out_of_range" ? "bg-red-900/60 border-red-500" :
    "bg-gray-800/60 border-gray-600";

  const totalReps = Object.values(repCounts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Timer + controls */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl p-4">
        <div className="text-3xl font-mono text-white">{formatTime(elapsed)}</div>
        <div className="flex gap-3">
          {!isActive ? (
            <button
              onClick={onStart}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              Start Session
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowPainModal(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-semibold px-4 py-2 rounded-lg transition text-sm"
              >
                🚨 Pain
              </button>
              <button
                onClick={onEnd}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold px-6 py-2 rounded-lg transition"
              >
                End Session
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rep counts */}
      {isActive && Object.keys(repCounts).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(repCounts).map(([joint, count]) => (
            <div key={joint} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-gray-300 text-sm capitalize">{joint.replace("_", " ")}</span>
              <span className="text-white font-bold text-xl">{count}</span>
            </div>
          ))}
          <div className="bg-blue-900/50 rounded-lg p-3 flex justify-between items-center col-span-2">
            <span className="text-blue-300 text-sm">Total Reps</span>
            <span className="text-white font-bold text-xl">{totalReps}</span>
          </div>
        </div>
      )}

      {/* Feedback banner */}
      {feedback && isActive && (
        <div className={`border rounded-lg p-3 text-sm font-medium transition-all ${feedbackBg}`}>
          <span className="text-white">{feedback.message}</span>
        </div>
      )}

      {/* Pain modal */}
      {showPainModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-80 flex flex-col gap-4">
            <h3 className="text-white font-bold text-lg">Log Pain Event</h3>
            <div>
              <label className="text-gray-400 text-sm">Joint</label>
              <select
                value={painJoint}
                onChange={(e) => setPainJoint(e.target.value)}
                className="w-full mt-1 bg-gray-800 text-white rounded-lg p-2 text-sm"
              >
                {["knee_left","knee_right","shoulder_left","shoulder_right","elbow_left","elbow_right","hip_left","hip_right"].map((j) => (
                  <option key={j} value={j}>{j.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm">Intensity: {painIntensity}/10</label>
              <input
                type="range" min={1} max={10} value={painIntensity}
                onChange={(e) => setPainIntensity(Number(e.target.value))}
                className="w-full mt-1"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onPainLog(painJoint, painIntensity); setShowPainModal(false); }}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold"
              >
                Log Pain
              </button>
              <button
                onClick={() => setShowPainModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
