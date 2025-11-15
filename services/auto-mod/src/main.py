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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(moderation.router)


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Auto-Moderation Service")

    logger.info("Moderation features:")
    logger.info("  ✅ Toxicity detection (Detoxify + AI)")
    logger.info("  ✅ Spam detection")
    logger.info("  ✅ Banned words/phrases filter")
    logger.info("  ✅ Link safety checking")
    logger.info("  ✅ Repeat message detection")
    logger.info("  ✅ Role-based whitelisting")

    logger.info(f"Toxicity threshold: {settings.TOXICITY_THRESHOLD}")
    logger.info(f"Spam threshold: {settings.SPAM_THRESHOLD}")
    logger.info(f"Auto-delete: {settings.AUTO_DELETE}")
    logger.info(f"Auto-timeout: {settings.AUTO_TIMEOUT}")

    logger.info("✅ Auto-Moderation ready")


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
