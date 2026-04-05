import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("nr_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (email: string, password: string) =>
  api.post("/auth/login", { email, password });

export const register = (email: string, full_name: string, password: string, role = "patient") =>
  api.post("/auth/register", { email, full_name, password, role });

export const getMe = () => api.get("/auth/me");

// Sessions
export const createSession = (session_type = "physical") =>
  api.post("/sessions", { session_type });

export const endSession = (id: number, duration_s: number, physical_score?: number) =>
  api.patch(`/sessions/${id}/end`, { duration_s, physical_score });

export const getSessions = () => api.get("/sessions");

export const logPainEvent = (session_id: number, joint: string, intensity: number, note?: string) =>
  api.post(`/sessions/${session_id}/pain`, { session_id, joint, intensity, note });

// Analytics
export const getDashboard = () => api.get("/analytics/dashboard");
export const getRecoveryScores = () => api.get("/analytics/recovery-scores");
export const getExerciseConfigs = () => api.get("/analytics/exercise-configs");
export const getJointLiveStats = (joint = "knee_left", sessions = 10) =>
  api.get(`/analytics/joint-live-stats?joint=${joint}&sessions=${sessions}`);

// ── Cognitive Tests ──────────────────────────────────────────────────────────
export const submitCognitiveSession = (tests: any[]) =>
  api.post("/cognitive/session", { tests });

export const getCognitiveHistory = () => api.get("/cognitive/history");
export const getCognitiveLatestScores = () => api.get("/cognitive/latest-scores");
export const getCognitiveReportData = () => api.get("/cognitive/report-data");

// ── AI ───────────────────────────────────────────────────────────────────────
export const sendChatMessage = (messages: any[], context?: string) =>
  api.post("/ai/chat", { messages, context });

export const getSessionRecommendations = (sessionId: number) =>
  api.get(`/ai/recommendations/${sessionId}`);

export const getDashboardSummary = () => api.get("/ai/dashboard-summary");

export const getReportInsights = (sessionIds?: number[], reportType = "overall") =>
  api.post("/ai/report-insights", { session_ids: sessionIds, report_type: reportType });

export const getDoctorAnalysis = (graphData: Record<string, unknown>) =>
  api.post("/ai/doctor-analysis", graphData);

// ── Session CRUD ─────────────────────────────────────────────────────────────
export const getSessionDetail = (id: number) =>
  api.get(`/sessions/${id}/detail`);

export const updateSession = (id: number, notes: string) =>
  api.put(`/sessions/${id}`, { notes });

export const deleteSession = (id: number) =>
  api.delete(`/sessions/${id}`);

// ── Progress Tracking ────────────────────────────────────────────────────────
export const getProgressSummary = () => api.get("/progress/summary");

export const getJointTrends = (joint?: string, days = 30) =>
  api.get("/progress/joint-trends", { params: { joint, days } });

export const getWeeklySummary = (weeks = 4) =>
  api.get("/progress/weekly-summary", { params: { weeks } });

export const getMilestones = () => api.get("/progress/milestones");
