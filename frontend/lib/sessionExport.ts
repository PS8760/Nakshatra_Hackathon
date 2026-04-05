/**
 * sessionExport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CSV Export Utility for Session Data
 * 
 * Exports detailed session analytics including:
 * - Per-rep angle measurements
 * - Form scores over time
 * - Fault frequency analysis
 * - Temporal progression data
 */

export interface RepData {
  repNumber: number;
  timestamp: number;
  exercise: string;
  phase: string;
  angles: Record<string, number>;
  formScore: number;
  faults: Array<{
    severity: string;
    fault: string;
    message: string;
    joint?: string;
  }>;
  duration: number; // milliseconds for this rep
}

export interface SessionData {
  sessionId: number;
  startTime: number;
  endTime: number;
  totalDuration: number;
  exercise: string;
  totalReps: number;
  averageFormScore: number;
  reps: RepData[];
  summary: {
    bestRep: number;
    worstRep: number;
    mostCommonFault: string;
    faultFrequency: Record<string, number>;
    angleRanges: Record<string, { min: number; max: number; avg: number }>;
  };
}

/**
 * Convert session data to CSV format
 */
export function exportSessionToCSV(data: SessionData): string {
  const lines: string[] = [];
  
  // Header metadata
  lines.push("# NeuroRestore Session Export");
  lines.push(`# Session ID: ${data.sessionId}`);
  lines.push(`# Exercise: ${data.exercise}`);
  lines.push(`# Start Time: ${new Date(data.startTime).toISOString()}`);
  lines.push(`# End Time: ${new Date(data.endTime).toISOString()}`);
  lines.push(`# Duration: ${(data.totalDuration / 60).toFixed(1)} minutes`);
  lines.push(`# Total Reps: ${data.totalReps}`);
  lines.push(`# Average Form Score: ${data.averageFormScore.toFixed(1)}`);
  lines.push("");
  
  // Summary statistics
  lines.push("# Summary Statistics");
  lines.push(`# Best Rep: #${data.summary.bestRep}`);
  lines.push(`# Worst Rep: #${data.summary.worstRep}`);
  lines.push(`# Most Common Fault: ${data.summary.mostCommonFault}`);
  lines.push("");
  
  // Fault frequency table
  lines.push("# Fault Frequency");
  lines.push("Fault,Count,Percentage");
  for (const [fault, count] of Object.entries(data.summary.faultFrequency)) {
    const pct = ((count / data.totalReps) * 100).toFixed(1);
    lines.push(`${fault},${count},${pct}%`);
  }
  lines.push("");
  
  // Angle ranges
  lines.push("# Angle Ranges (degrees)");
  lines.push("Joint,Min,Max,Average");
  for (const [joint, range] of Object.entries(data.summary.angleRanges)) {
    lines.push(`${joint},${range.min.toFixed(1)},${range.max.toFixed(1)},${range.avg.toFixed(1)}`);
  }
  lines.push("");
  
  // Per-rep data
  lines.push("# Per-Rep Data");
  
  // Determine all unique angle joints across all reps
  const allJoints = new Set<string>();
  data.reps.forEach(rep => {
    Object.keys(rep.angles).forEach(joint => allJoints.add(joint));
  });
  const jointList = Array.from(allJoints).sort();
  
  // CSV header
  const header = [
    "Rep",
    "Timestamp",
    "Phase",
    "Form Score",
    "Duration (s)",
    "Fault Count",
    "Faults",
    ...jointList.map(j => `${j} (deg)`)
  ];
  lines.push(header.join(","));
  
  // CSV data rows
  for (const rep of data.reps) {
    const faultStr = rep.faults.map(f => `${f.severity}:${f.fault}`).join(";");
    const row = [
      rep.repNumber,
      new Date(rep.timestamp).toISOString(),
      rep.phase,
      rep.formScore.toFixed(1),
      (rep.duration / 1000).toFixed(2),
      rep.faults.length,
      `"${faultStr}"`,
      ...jointList.map(j => (rep.angles[j] ?? 0).toFixed(1))
    ];
    lines.push(row.join(","));
  }
  
  return lines.join("\n");
}

/**
 * Download CSV file to user's device
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Generate session summary statistics
 */
export function generateSessionSummary(reps: RepData[]): SessionData["summary"] {
  if (reps.length === 0) {
    return {
      bestRep: 0,
      worstRep: 0,
      mostCommonFault: "none",
      faultFrequency: {},
      angleRanges: {},
    };
  }
  
  // Find best and worst reps by form score
  let bestRep = 0, worstRep = 0;
  let bestScore = -1, worstScore = 101;
  
  reps.forEach((rep, idx) => {
    if (rep.formScore > bestScore) {
      bestScore = rep.formScore;
      bestRep = idx + 1;
    }
    if (rep.formScore < worstScore) {
      worstScore = rep.formScore;
      worstRep = idx + 1;
    }
  });
  
  // Fault frequency analysis
  const faultFrequency: Record<string, number> = {};
  reps.forEach(rep => {
    rep.faults.forEach(fault => {
      faultFrequency[fault.fault] = (faultFrequency[fault.fault] || 0) + 1;
    });
  });
  
  const mostCommonFault = Object.entries(faultFrequency)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "none";
  
  // Angle ranges
  const angleData: Record<string, number[]> = {};
  reps.forEach(rep => {
    Object.entries(rep.angles).forEach(([joint, angle]) => {
      if (!angleData[joint]) angleData[joint] = [];
      angleData[joint].push(angle);
    });
  });
  
  const angleRanges: Record<string, { min: number; max: number; avg: number }> = {};
  Object.entries(angleData).forEach(([joint, values]) => {
    angleRanges[joint] = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  });
  
  return {
    bestRep,
    worstRep,
    mostCommonFault,
    faultFrequency,
    angleRanges,
  };
}

/**
 * Create a session data collector for real-time tracking
 */
export class SessionDataCollector {
  private reps: RepData[] = [];
  private currentRepStart: number = 0;
  private sessionStart: number;
  
  constructor(
    private sessionId: number,
    private exercise: string
  ) {
    this.sessionStart = Date.now();
  }
  
  startRep(): void {
    this.currentRepStart = Date.now();
  }
  
  recordRep(
    repNumber: number,
    phase: string,
    angles: Record<string, number>,
    formScore: number,
    faults: Array<{ severity: string; fault: string; message: string; joint?: string }>
  ): void {
    const now = Date.now();
    const duration = this.currentRepStart > 0 ? now - this.currentRepStart : 0;
    
    this.reps.push({
      repNumber,
      timestamp: now,
      exercise: this.exercise,
      phase,
      angles: { ...angles },
      formScore,
      faults: faults.map(f => ({ ...f })),
      duration,
    });
    
    this.currentRepStart = 0;
  }
  
  getSessionData(): SessionData {
    const now = Date.now();
    const totalDuration = now - this.sessionStart;
    const averageFormScore = this.reps.length > 0
      ? this.reps.reduce((sum, rep) => sum + rep.formScore, 0) / this.reps.length
      : 0;
    
    return {
      sessionId: this.sessionId,
      startTime: this.sessionStart,
      endTime: now,
      totalDuration,
      exercise: this.exercise,
      totalReps: this.reps.length,
      averageFormScore,
      reps: this.reps,
      summary: generateSessionSummary(this.reps),
    };
  }
  
  exportToCSV(): string {
    return exportSessionToCSV(this.getSessionData());
  }
  
  downloadCSV(): void {
    const csv = this.exportToCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `neurorestore-session-${this.sessionId}-${timestamp}.csv`;
    downloadCSV(csv, filename);
  }
}
