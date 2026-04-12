"""
WaveStack Publisher Service
Unified social media publisher: Instagram, TikTok, Facebook, LinkedIn, Twitter/X, YouTube
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import publisher
from .routes import youtube as youtube_routes

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack Publisher",
    description="Unified publisher for Instagram, TikTok, Facebook, LinkedIn, Twitter/X, YouTube",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(publisher.router)
app.include_router(youtube_routes.router)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Publisher Service")

    # Create directories
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.SESSIONS_DIR).mkdir(parents=True, exist_ok=True)

    logger.info("Supported platforms: Instagram, TikTok, Facebook, LinkedIn, Twitter/X, YouTube")
    logger.info("Publisher ready")


@app.get("/")
async def root():
    return {
        "service": "WaveStack Publisher",
        "version": "1.0.0",
        "status": "running",
        "platforms": ["instagram", "tiktok", "facebook", "linkedin", "twitter", "youtube"],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.ENV == "development")
