from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth, sessions, analytics, cognitive, ai as ai_router, referral as referral_router, progress, pose as pose_router, exercises as exercises_router
from app.ws_handler import handle_session_ws
from app import models

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NeuroRestore AI",
    description="AI-Powered Dual Rehabilitation System",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(analytics.router)
app.include_router(cognitive.router)
app.include_router(ai_router.router)
app.include_router(referral_router.router)
app.include_router(progress.router)
app.include_router(pose_router.router)
app.include_router(exercises_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "db": "connected", "version": "1.0.0"}


@app.get("/ready")
def ready():
    return {"status": "ready", "checks": {"database": True}}


@app.websocket("/ws/session/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: int):
    """
    WebSocket endpoint for live session streaming.
    Query param: token=<jwt>
    """
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    from app.database import SessionLocal
    from app.auth import get_current_user as _get_user
    from jose import jwt as _jwt, JWTError
    from app.config import settings as _s

    try:
        payload = _jwt.decode(token, _s.SECRET_KEY, algorithms=[_s.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError):
        await websocket.close(code=4001)
        return

    await handle_session_ws(websocket, session_id, user_id)
