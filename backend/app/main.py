import logging
import os
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.database import Base, engine, SessionLocal
from app.api.v1.api import api_v1_router
from app.services.ai_service import AIService

# Agent Registry & Domain Agents
from app.agents.registry import AgentRegistry
from app.agents.coordinator import CoordinatorAgent
from app.agents.learning import LearningAgent
from app.agents.assessment import AssessmentAgent
from app.agents.planner import PlannerAgent
from app.agents.memory import MemoryAgent
from app.agents.course_management import CourseManagementAgent
from app.agents.tools import register_default_tools

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("studyos")

# Initialize database tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("[ProductionHardening] Database tables verified successfully.")
except Exception as e:
    logger.critical(f"[ProductionHardening] Database initialization failed: {str(e)}")

# Initialize AI Agent Registry
try:
    AgentRegistry.register(CoordinatorAgent())
    AgentRegistry.register(LearningAgent())
    AgentRegistry.register(AssessmentAgent())
    AgentRegistry.register(PlannerAgent())
    AgentRegistry.register(MemoryAgent())
    AgentRegistry.register(CourseManagementAgent())
    logger.info(f"[ProductionHardening] Registered {len(AgentRegistry.list_agents())} AI Domain Agents successfully.")
    register_default_tools()
except Exception as e:
    logger.error(f"[ProductionHardening] Agent Registry initialization failed: {str(e)}")

app = FastAPI(
    title="StudyOS Production Backend API",
    description="Scalable technical foundation for StudyOS AI-Native Education System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Mount /uploads Static Files Directory
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# CORS Middleware configurations
raw_cors = os.getenv("CORS_ORIGINS", "")
allowed_origins = [o.strip() for o in raw_cors.split(",") if o.strip()]
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "https://studyos-frontend-production.up.railway.app",
]
for origin in default_origins:
    if origin not in allowed_origins:
        allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://.*\.up\.railway\.app|https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Production Security Middleware: Injects XSS and Frame protection headers."""
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Sanitize validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"status": "error", "message": "Invalid request payload", "details": exc.errors()}
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global Catch-All Exception Handler to prevent crash leakage."""
    logger.error(f"[GlobalExceptionHandler] Unhandled Exception at {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"status": "error", "message": "An internal server error occurred."}
    )


# Register Routers — Single Source of Truth (/api/v1)
app.include_router(api_v1_router)

# Root-level Google OAuth Redirect Handler
from app.api.v1.auth import google_auth_callback
app.get("/auth/google/callback")(google_auth_callback)
app.get("/auth/google")(google_auth_callback)


# ---------------------------------------------------------------
# Health Check & Monitoring Suite
# ---------------------------------------------------------------

@app.get("/")
@app.get("/health")
def health_check():
    """General Health Endpoint."""
    return {
        "status": "healthy",
        "service": "StudyOS Production API",
        "version": "1.0.0",
        "api_v1": "/api/v1"
    }


@app.get("/health/liveness")
def liveness_check():
    """K8s / Container Liveness Check."""
    return {"status": "alive"}


@app.get("/health/readiness")
def readiness_check():
    """K8s / Container Readiness Check: Verifies DB and Gemini connectivity."""
    db_ok = False
    ai_ok = AIService.is_configured()

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as e:
        logger.error(f"[ReadinessCheck] DB check failed: {e}")

    if db_ok and ai_ok:
        return {
            "status": "ready",
            "database": "connected",
            "ai_engine": "configured"
        }
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "connected" if db_ok else "disconnected",
                "ai_engine": "configured" if ai_ok else "missing_key"
            }
        )
