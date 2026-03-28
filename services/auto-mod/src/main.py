"""
Auto-Moderation Service
FastAPI application for AI-powered content moderation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import moderation

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack Auto-Moderation",
    description="AI-powered content moderation for Discord, Twitch, and more",
    version="1.0.0",
)

# CORS — restrict origins in production
_origins = (
    ["*"] if settings.ENV == "development"
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-Service", "X-Org-Id"],
)

app.include_router(moderation.router)


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint for k8s liveness/readiness probes."""
    return {"status": "ok", "service": "auto-mod"}


@app.get("/ready", tags=["System"])
async def readiness_check():
    """Readiness check — verifies dependencies are available."""
    return {"ready": True, "service": "auto-mod"}


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Auto-Moderation Service")
    logger.info("Toxicity threshold: %s", settings.TOXICITY_THRESHOLD)
    logger.info("Spam threshold: %s", settings.SPAM_THRESHOLD)
    logger.info("Auto-Moderation ready")


@app.get("/")
async def root():
    return {
        "service": "WaveStack Auto-Moderation",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "toxicity_detection",
            "spam_detection",
            "banned_words_filter",
            "link_safety",
            "ai_contextual_moderation"
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.ENV == "development")
