"use client";
/**
 * ReferralCard
 * ============
 * Shown automatically when pain intensity > 7 OR posture status is "critical".
 * Captures geolocation, calls /api/referral/nearby-physios, renders results
 * as glassmorphism cards.
 */
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

interface Physio {
  id: number;
  name: string;
  clinic: string;
  phone: string;
  specialization: string;
  rating: number;
  available: boolean;
  distance_km: number;
}

interface Props {
  trigger: "pain" | "posture_critical" | "manual";
  painIntensity?: number;
  postureStatus?: string;
  onDismiss: () => void;
}

// ── Severity gate (client-side mirror of backend validation) ─────────────────
export function shouldTriggerReferral(painIntensity?: number, postureStatus?: string): boolean {
  return (painIntensity !== undefined && painIntensity > 7) || postureStatus === "critical";
}

export default function ReferralCard({ trigger, painIntensity, postureStatus, onDismiss }: Props) {
  const [physios,  setPhysios]  = useState<Physio[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [locDenied, setLocDenied] = useState(false);

  const fetchNearby = useCallback((lat: number, lng: number) => {
    api.post("/referral/nearby-physios", {
      lat, lng, trigger,
      pain_intensity: painIntensity,
      posture_status: postureStatus,
      limit: 3,
    })
      .then((r) => { setPhysios(r.data); setLoading(false); })
      .catch((e) => {
        setError(e?.response?.data?.detail || "Could not load nearby physios.");
        setLoading(false);
      });
  }, [trigger, painIntensity, postureStatus]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser.");
      setLoading(false);
      return;
    }

    // Only capture location when severity threshold is met
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchNearby(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLocDenied(true);
        // Fallback: use a default coordinate so the feature still works
        fetchNearby(19.1136, 72.8697);
      },
      { timeout: 8000, maximumAge: 60000 },
    );
  }, [fetchNearby]);

  const stars = (r: number) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));

  return (
    // Backdrop
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(2, 18, 43, 0.80)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      {/* Panel */}
      <div style={{
        width: "100%", maxWidth: 480,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(239,68,68,0.35)",
        borderRadius: 24,
        boxShadow: "0 8px 64px rgba(239,68,68,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset",
        backdropFilter: "blur(24px)",
        overflow: "hidden",
      }}>
        {/* Top accent line */}
        <div style={{ height: 3, background: "linear-gradient(90deg,#ef4444,#f97316,#ef4444)" }} />

        <div style={{ padding: "24px 24px 20px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>🚨</div>
              <div>
                <p style={{ fontWeight: 800, fontSize: 16, color: "#e8f4f0", lineHeight: 1.2 }}>
                  Professional Help Recommended
                </p>
                <p style={{ fontSize: 12, color: "rgba(239,68,68,0.8)", marginTop: 3 }}>
                  {trigger === "pain"
                    ? `Pain intensity ${painIntensity}/10 — above safe threshold`
                    : "Critical posture detected by AI"}
                </p>
              </div>
            </div>
            <button onClick={onDismiss} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(232,244,240,0.5)", borderRadius: 8,
              width: 30, height: 30, cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>

          {locDenied && (
            <div style={{
              padding: "8px 12px", borderRadius: 8, marginBottom: 14,
              background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)",
              fontSize: 12, color: "rgba(234,179,8,0.8)",
            }}>
              📍 Location access denied — showing nearest results from default area.
            </div>
          )}

          {/* Content */}
          {loading && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", margin: "0 auto 12px",
                border: "2px solid rgba(239,68,68,0.2)",
                borderTopColor: "#ef4444",
                animation: "spinCW 0.8s linear infinite",
              }} />
              <p style={{ fontSize: 13, color: "rgba(232,244,240,0.4)" }}>Finding nearby physiotherapists…</p>
            </div>
          )}

          {error && !loading && (
            <div style={{
              padding: "16px", borderRadius: 12, textAlign: "center",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            }}>
              <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {physios.map((p, i) => (
                <div key={p.id} style={{
                  background: i === 0
                    ? "rgba(239,68,68,0.07)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${i === 0 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRadius: 16,
                  padding: "14px 16px",
                  backdropFilter: "blur(8px)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  {/* Nearest badge */}
                  {i === 0 && (
                    <span style={{
                      position: "absolute", top: 10, right: 10,
                      fontSize: 9, fontWeight: 700, letterSpacing: ".06em",
                      background: "rgba(239,68,68,0.2)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 5, padding: "2px 7px",
                      textTransform: "uppercase",
                    }}>Nearest</span>
                  )}

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: "rgba(15,255,197,0.08)",
                      border: "1px solid rgba(15,255,197,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                    }}>🩺</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: "#e8f4f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </p>
                        <span style={{
                          fontSize: 9, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                          background: p.available ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.12)",
                          color: p.available ? "#22c55e" : "#6b7280",
                          border: `1px solid ${p.available ? "rgba(34,197,94,0.25)" : "rgba(107,114,128,0.2)"}`,
                        }}>
                          {p.available ? "Available" : "Busy"}
                        </span>
                      </div>

                      <p style={{ fontSize: 11, color: "rgba(232,244,240,0.45)", marginBottom: 4 }}>
                        {p.clinic}
                      </p>

                      <p style={{ fontSize: 11, color: "rgba(15,255,197,0.6)", marginBottom: 6 }}>
                        {p.specialization}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "#eab308" }}>{stars(p.rating)}</span>
                          <span style={{ fontSize: 11, color: "rgba(232,244,240,0.35)" }}>{p.rating}</span>
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: p.distance_km < 2 ? "#22c55e" : p.distance_km < 5 ? "#eab308" : "#e8f4f0",
                          }}>
                            📍 {p.distance_km} km
                          </span>
                        </div>

                        {/* Call / Book button */}
                        <a href={`tel:${p.phone}`} style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: p.available ? "#0fffc5" : "rgba(255,255,255,0.06)",
                          color: p.available ? "#02182b" : "rgba(232,244,240,0.4)",
                          border: p.available ? "none" : "1px solid rgba(255,255,255,0.08)",
                          textDecoration: "none",
                          cursor: p.available ? "pointer" : "default",
                          pointerEvents: p.available ? "auto" : "none",
                          transition: "all .2s",
                        }}>
                          📞 {p.available ? "Call Now" : "Unavailable"}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          <p style={{ fontSize: 11, color: "rgba(232,244,240,0.25)", textAlign: "center", marginTop: 16 }}>
            Stop exercising if pain persists. Seek emergency care for severe symptoms.
          </p>
        </div>
      </div>
    </div>
  );
}
