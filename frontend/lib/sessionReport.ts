/**
 * Session Report Generation and Analysis
 * Generates comprehensive reports with AI-powered insights
 */

export interface SessionMetrics {
  sessionId: number;
  duration: number; // seconds
  totalReps: number;
  avgFormScore: number;
  peakFormScore: number;
  lowestFormScore: number;
  painEvents: Array<{
    joint: string;
    intensity: number;
    timestamp: number;
  }>;
  jointAngles: Record<string, number[]>;
  exerciseType: string;
  completionRate: number;
}

export interface SessionAnalysis {
  overallPerformance: "excellent" | "good" | "fair" | "needs_improvement";
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  progressTrend: "improving" | "stable" | "declining";
  riskLevel: "low" | "moderate" | "high";
  needsDoctorConsultation: boolean;
  doctorConsultationReason?: string;
}

export interface DoctorRecommendation {
  name: string;
  specialty: string;
  distance: number; // km
  rating: number;
  address: string;
  phone: string;
  availableSlots: string[];
}

/**
 * Analyze session metrics and generate insights
 */
export function analyzeSession(metrics: SessionMetrics): SessionAnalysis {
  const analysis: SessionAnalysis = {
    overallPerformance: "good",
    strengths: [],
    areasForImprovement: [],
    recommendations: [],
    progressTrend: "stable",
    riskLevel: "low",
    needsDoctorConsultation: false,
  };

  // Performance evaluation
  if (metrics.avgFormScore >= 85) {
    analysis.overallPerformance = "excellent";
    analysis.strengths.push("Excellent form consistency throughout session");
  } else if (metrics.avgFormScore >= 70) {
    analysis.overallPerformance = "good";
    analysis.strengths.push("Good form maintenance");
  } else if (metrics.avgFormScore >= 55) {
    analysis.overallPerformance = "fair";
    analysis.areasForImprovement.push("Form consistency needs improvement");
  } else {
    analysis.overallPerformance = "needs_improvement";
    analysis.areasForImprovement.push("Significant form issues detected");
  }

  // Rep count analysis
  if (metrics.totalReps >= 20) {
    analysis.strengths.push("Strong endurance - completed high rep count");
  } else if (metrics.totalReps >= 10) {
    analysis.strengths.push("Good effort with moderate rep count");
  } else if (metrics.totalReps < 5) {
    analysis.areasForImprovement.push("Low rep count - may indicate fatigue or difficulty");
  }

  // Pain event analysis
  if (metrics.painEvents.length > 0) {
    analysis.riskLevel = "moderate";
    const highPainEvents = metrics.painEvents.filter((e) => e.intensity >= 7);
    
    if (highPainEvents.length > 0) {
      analysis.riskLevel = "high";
      analysis.needsDoctorConsultation = true;
      analysis.doctorConsultationReason = `High pain levels detected (${highPainEvents.length} events with intensity ≥7). Professional evaluation recommended.`;
      analysis.recommendations.push("⚠️ URGENT: Consult with a physiotherapist about pain management");
    } else {
      analysis.recommendations.push("Monitor pain levels - consider consulting if pain persists");
    }
    
    analysis.areasForImprovement.push(`${metrics.painEvents.length} pain event(s) reported during session`);
  } else {
    analysis.strengths.push("No pain reported - good exercise tolerance");
  }

  // Duration analysis
  const durationMinutes = Math.floor(metrics.duration / 60);
  if (durationMinutes >= 20) {
    analysis.strengths.push("Excellent session duration for therapeutic benefit");
  } else if (durationMinutes < 10) {
    analysis.recommendations.push("Try to extend session duration to 15-20 minutes for optimal results");
  }

  // Completion rate
  if (metrics.completionRate >= 90) {
    analysis.strengths.push("High completion rate shows strong commitment");
  } else if (metrics.completionRate < 50) {
    analysis.areasForImprovement.push("Low completion rate - consider adjusting exercise difficulty");
  }

  // Form score variability
  const formVariability = metrics.peakFormScore - metrics.lowestFormScore;
  if (formVariability > 40) {
    analysis.areasForImprovement.push("High form variability - focus on consistency");
    analysis.recommendations.push("Practice slower, controlled movements to maintain form");
  }

  // General recommendations
  if (analysis.overallPerformance === "excellent") {
    analysis.recommendations.push("Excellent work! Consider progressing to more challenging exercises");
  } else if (analysis.overallPerformance === "needs_improvement") {
    analysis.recommendations.push("Focus on quality over quantity - reduce reps if needed to maintain form");
    analysis.recommendations.push("Consider working with a physiotherapist for form correction");
  }

  // Risk-based recommendations
  if (analysis.riskLevel === "high") {
    analysis.recommendations.unshift("🚨 Stop exercising and seek professional medical advice");
  } else if (analysis.riskLevel === "moderate") {
    analysis.recommendations.push("Monitor symptoms closely and reduce intensity if pain increases");
  }

  return analysis;
}

/**
 * Generate nearby doctor recommendations based on user location
 */
export async function getNearbyDoctors(
  latitude: number,
  longitude: number,
  specialty: string = "physiotherapy"
): Promise<DoctorRecommendation[]> {
  // In production, this would call a real API (Google Places, healthcare directory, etc.)
  // For now, returning mock data based on location
  
  const mockDoctors: DoctorRecommendation[] = [
    {
      name: "Dr. Sarah Johnson, PT, DPT",
      specialty: "Physical Therapy & Sports Medicine",
      distance: 1.2,
      rating: 4.9,
      address: "123 Health Plaza, Suite 200",
      phone: "+1 (555) 123-4567",
      availableSlots: ["Tomorrow 10:00 AM", "Tomorrow 2:00 PM", "Wed 9:00 AM"],
    },
    {
      name: "Dr. Michael Chen, MD",
      specialty: "Orthopedic Surgery & Rehabilitation",
      distance: 2.5,
      rating: 4.8,
      address: "456 Medical Center Dr, Building A",
      phone: "+1 (555) 234-5678",
      availableSlots: ["Tomorrow 3:00 PM", "Thu 11:00 AM", "Fri 1:00 PM"],
    },
    {
      name: "Dr. Emily Rodriguez, PT",
      specialty: "Musculoskeletal Physiotherapy",
      distance: 3.1,
      rating: 4.7,
      address: "789 Wellness Blvd, Floor 3",
      phone: "+1 (555) 345-6789",
      availableSlots: ["Today 4:00 PM", "Tomorrow 9:00 AM", "Thu 2:00 PM"],
    },
    {
      name: "Dr. James Williams, DPT, OCS",
      specialty: "Orthopedic Physical Therapy",
      distance: 4.0,
      rating: 4.9,
      address: "321 Recovery Lane, Suite 150",
      phone: "+1 (555) 456-7890",
      availableSlots: ["Wed 10:00 AM", "Thu 3:00 PM", "Fri 11:00 AM"],
    },
    {
      name: "Dr. Lisa Anderson, PT, CSCS",
      specialty: "Sports Rehabilitation & Performance",
      distance: 5.2,
      rating: 4.6,
      address: "654 Athletic Center, 2nd Floor",
      phone: "+1 (555) 567-8901",
      availableSlots: ["Tomorrow 1:00 PM", "Wed 4:00 PM", "Fri 10:00 AM"],
    },
  ];

  // Sort by distance
  return mockDoctors.sort((a, b) => a.distance - b.distance);
}

/**
 * Format session report for display
 */
export function formatSessionReport(
  metrics: SessionMetrics,
  analysis: SessionAnalysis
): string {
  const durationMinutes = Math.floor(metrics.duration / 60);
  const durationSeconds = metrics.duration % 60;

  return `
SESSION REPORT
═══════════════════════════════════════════════════════════

📊 PERFORMANCE METRICS
────────────────────────────────────────────────────────────
Duration: ${durationMinutes}m ${durationSeconds}s
Total Reps: ${metrics.totalReps}
Average Form Score: ${metrics.avgFormScore.toFixed(1)}%
Peak Form Score: ${metrics.peakFormScore}%
Exercise Type: ${metrics.exerciseType}
Completion Rate: ${metrics.completionRate.toFixed(1)}%

🎯 OVERALL PERFORMANCE: ${analysis.overallPerformance.toUpperCase()}
────────────────────────────────────────────────────────────

✅ STRENGTHS:
${analysis.strengths.map((s) => `  • ${s}`).join("\n")}

${analysis.areasForImprovement.length > 0 ? `
⚠️ AREAS FOR IMPROVEMENT:
${analysis.areasForImprovement.map((a) => `  • ${a}`).join("\n")}
` : ""}

💡 RECOMMENDATIONS:
${analysis.recommendations.map((r) => `  • ${r}`).join("\n")}

📈 PROGRESS TREND: ${analysis.progressTrend.toUpperCase()}
🛡️ RISK LEVEL: ${analysis.riskLevel.toUpperCase()}

${analysis.needsDoctorConsultation ? `
🏥 DOCTOR CONSULTATION RECOMMENDED
────────────────────────────────────────────────────────────
Reason: ${analysis.doctorConsultationReason}

Please consult with a healthcare professional for proper evaluation.
` : ""}
═══════════════════════════════════════════════════════════
  `.trim();
}

/**
 * Save session report to user's history
 */
export async function saveSessionReport(
  sessionId: number,
  metrics: SessionMetrics,
  analysis: SessionAnalysis,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sessions/${sessionId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        metrics,
        analysis,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save session report");
    }

    console.log("✅ Session report saved successfully");
  } catch (error) {
    console.error("❌ Error saving session report:", error);
    throw error;
  }
}

/**
 * Get user's session history with analysis
 */
export async function getSessionHistory(token: string): Promise<Array<{
  sessionId: number;
  date: string;
  metrics: SessionMetrics;
  analysis: SessionAnalysis;
}>> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/sessions/history`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch session history");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error fetching session history:", error);
    return [];
  }
}
