"""
Social Publisher Service
FastAPI application for publishing to multiple social media platforms
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import publisher

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack Social Publisher",
    description="Universal social media publisher for Instagram, TikTok, Facebook, LinkedIn, and more",
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


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Social Publisher Service")

    # Create directories
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.SESSIONS_DIR).mkdir(parents=True, exist_ok=True)

    logger.info("Supported platforms:")
    logger.info("  ✅ Instagram (photos, videos, reels, stories)")
    logger.info("  ✅ TikTok (videos)")
    logger.info("  ✅ Facebook (text, photos, videos, links)")
    logger.info("  ✅ LinkedIn (text, links, images, videos)")

    logger.info("✅ Social Publisher ready")


@app.get("/")
async def root():
    return {
        "service": "WaveStack Social Publisher",
        "version": "1.0.0",
        "status": "running",
        "platforms": ["instagram", "tiktok", "facebook", "linkedin"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.ENV == "development")
