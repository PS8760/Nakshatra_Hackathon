"""
Location-Based Referral Router
================================
POST /referral/nearby-physios
  - Accepts user lat/lng + trigger reason
  - Loads physio DB from JSON (swap for SQL query in production)
  - Sorts by Haversine distance
  - Returns nearest N physios with distance_km

Severity triggers (enforced on frontend, validated here):
  - pain_intensity > 7
  - posture_status == "critical"
"""
import json
import math
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/referral", tags=["referral"])

# ── Load physio data ──────────────────────────────────────────────────────────
_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "physios.json"

def _load_physios() -> list[dict]:
    with open(_DATA_PATH, "r") as f:
        return json.load(f)


# ── Haversine formula ─────────────────────────────────────────────────────────
def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Returns great-circle distance in kilometres between two coordinates.

    Formula:
        a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
        c = 2·atan2(√a, √(1−a))
        d = R·c   where R = 6371 km
    """
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


# ── Request / Response schemas ────────────────────────────────────────────────
class NearbyRequest(BaseModel):
    lat: float
    lng: float
    trigger: str = "pain"           # "pain" | "posture_critical" | "manual"
    pain_intensity: Optional[int] = None
    posture_status: Optional[str] = None
    limit: int = 3


class PhysioResult(BaseModel):
    id: int
    name: str
    clinic: str
    phone: str
    specialization: str
    rating: float
    available: bool
    distance_km: float


# ── Endpoint ──────────────────────────────────────────────────────────────────
@router.post("/nearby-physios", response_model=list[PhysioResult])
def nearby_physios(payload: NearbyRequest):
    """
    Returns the nearest physiotherapists sorted by distance.

    Severity gate — at least one must be true:
      - pain_intensity > 7
      - posture_status == "critical"
      - trigger == "manual"
    """
    # Server-side severity validation
    is_severe = (
        (payload.pain_intensity is not None and payload.pain_intensity > 7)
        or payload.posture_status == "critical"
        or payload.trigger == "manual"
    )
    if not is_severe:
        raise HTTPException(
            status_code=400,
            detail="Severity threshold not met. Pain must be > 7 or posture critical.",
        )

    physios = _load_physios()

    # Attach distance and sort
    results = []
    for p in physios:
        dist = haversine(payload.lat, payload.lng, p["lat"], p["lng"])
        results.append({**p, "distance_km": dist})

    results.sort(key=lambda x: x["distance_km"])
    return results[: payload.limit]
