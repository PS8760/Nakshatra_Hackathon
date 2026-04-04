"use client";

import { useState, useEffect } from "react";
import {
  SessionMetrics,
  SessionAnalysis,
  DoctorRecommendation,
  analyzeSession,
  getNearbyDoctors,
  formatSessionReport,
  saveSessionReport,
} from "@/lib/sessionReport";

interface SessionReportProps {
  metrics: SessionMetrics;
  token: string;
  onClose: () => void;
}

export default function SessionReport({ metrics, token, onClose }: SessionReportProps) {
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [doctors, setDoctors] = useState<DoctorRecommendation[]>([]);
  const [showDoctors, setShowDoctors] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Analyze session
    const sessionAnalysis = analyzeSession(metrics);
    setAnalysis(sessionAnalysis);

    // Auto-show doctors if consultation needed
    if (sessionAnalysis.needsDoctorConsultation) {
      setShowDoctors(true);
      loadDoctors();
    }

    setLoading(false);
  }, [metrics]);

  const loadDoctors = async () => {
    try {
      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const nearbyDoctors = await getNearbyDoctors(latitude, longitude);
            setDoctors(nearbyDoctors);
          },
          (error) => {
            console.error("Location error:", error);
            // Load default doctors without location
            getNearbyDoctors(0, 0).then(setDoctors);
          }
        );
      } else {
        // Load default doctors
        const defaultDoctors = await getNearbyDoctors(0, 0);
        setDoctors(defaultDoctors);
      }
    } catch (error) {
      console.error("Error loading doctors:", error);
    }
  };

  const handleSaveReport = async () => {
    if (!analysis) return;

    setSaving(true);
    try {
      await saveSessionReport(metrics.sessionId, metrics, analysis, token);
      alert("✅ Session report saved to your history!");
    } catch (error) {
      alert("❌ Failed to save report. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadReport = () => {
    if (!analysis) return;

    const reportText = formatSessionReport(metrics, analysis);
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-report-${metrics.sessionId}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || !analysis) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl p-8 max-w-md">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
          <p className="text-white text-center text-lg">Analyzing your session...</p>
        </div>
      </div>
    );
  }

  const performanceColor =
    analysis.overallPerformance === "excellent"
      ? "#22c55e"
      : analysis.overallPerformance === "good"
      ? "#3b82f6"
      : analysis.overallPerformance === "fair"
      ? "#eab308"
      : "#ef4444";

  const riskColor =
    analysis.riskLevel === "low"
      ? "#22c55e"
      : analysis.riskLevel === "moderate"
      ? "#eab308"
      : "#ef4444";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-white/10">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">📊 Session Report</h2>
                <p className="text-blue-100">Comprehensive analysis of your rehabilitation session</p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Performance Overview */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">🎯 Overall Performance</h3>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="text-4xl font-bold px-6 py-3 rounded-lg"
                  style={{ backgroundColor: `${performanceColor}20`, color: performanceColor }}
                >
                  {analysis.overallPerformance.toUpperCase().replace("_", " ")}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Duration</p>
                    <p className="text-white text-lg font-semibold">
                      {Math.floor(metrics.duration / 60)}m {metrics.duration % 60}s
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Reps</p>
                    <p className="text-white text-lg font-semibold">{metrics.totalReps}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Avg Form Score</p>
                    <p className="text-white text-lg font-semibold">{metrics.avgFormScore.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Completion</p>
                    <p className="text-white text-lg font-semibold">{metrics.completionRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Risk Level */}
              <div className="flex items-center gap-3 mt-4 p-3 rounded-lg" style={{ backgroundColor: `${riskColor}10` }}>
                <span className="text-2xl">🛡️</span>
                <div>
                  <p className="text-gray-400 text-sm">Risk Level</p>
                  <p className="font-bold" style={{ color: riskColor }}>
                    {analysis.riskLevel.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div className="bg-green-500/10 rounded-xl p-6 border border-green-500/20">
                <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                  <span>✅</span> Strengths
                </h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((strength, index) => (
                    <li key={index} className="text-gray-200 flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {analysis.areasForImprovement.length > 0 && (
              <div className="bg-yellow-500/10 rounded-xl p-6 border border-yellow-500/20">
                <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
                  <span>⚠️</span> Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {analysis.areasForImprovement.map((area, index) => (
                    <li key={index} className="text-gray-200 flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-blue-500/10 rounded-xl p-6 border border-blue-500/20">
              <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                <span>💡</span> Recommendations
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-gray-200 flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Doctor Consultation Alert */}
            {analysis.needsDoctorConsultation && (
              <div className="bg-red-500/20 rounded-xl p-6 border-2 border-red-500/50">
                <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                  <span>🏥</span> Doctor Consultation Recommended
                </h3>
                <p className="text-gray-200 mb-4">{analysis.doctorConsultationReason}</p>
                <button
                  onClick={() => {
                    setShowDoctors(true);
                    if (doctors.length === 0) loadDoctors();
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                >
                  Find Nearby Doctors →
                </button>
              </div>
            )}

            {/* Nearby Doctors */}
            {showDoctors && (
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>👨‍⚕️</span> Nearby Healthcare Professionals
                </h3>
                {doctors.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading nearby doctors...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doctors.map((doctor, index) => (
                      <div
                        key={index}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-lg font-bold text-white">{doctor.name}</h4>
                            <p className="text-blue-400 text-sm">{doctor.specialty}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-yellow-400">
                              <span>⭐</span>
                              <span className="font-bold">{doctor.rating}</span>
                            </div>
                            <p className="text-gray-400 text-sm">{doctor.distance} km away</p>
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">📍 {doctor.address}</p>
                        <p className="text-gray-300 text-sm mb-3">📞 {doctor.phone}</p>
                        <div className="flex flex-wrap gap-2">
                          {doctor.availableSlots.slice(0, 3).map((slot, i) => (
                            <span
                              key={i}
                              className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/30"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveReport}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "💾 Save to History"}
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl transition-all"
              >
                📥 Download Report
              </button>
            </div>

            {!showDoctors && !analysis.needsDoctorConsultation && (
              <button
                onClick={() => {
                  setShowDoctors(true);
                  if (doctors.length === 0) loadDoctors();
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 px-6 rounded-xl transition-all border border-white/10"
              >
                🏥 Find Nearby Doctors (Optional)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
