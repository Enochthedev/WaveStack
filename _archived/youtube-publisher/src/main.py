"""
YouTube Publisher Service
FastAPI application for uploading videos to YouTube
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import videos

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack YouTube Publisher",
    description="Automated YouTube video publishing with AI-enhanced metadata",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(videos.router)


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting YouTube Publisher Service")

    # Create directories
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.TEMP_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CREDENTIALS_DIR).mkdir(parents=True, exist_ok=True)

    logger.info("✅ YouTube Publisher ready")


@app.get("/")
async def root():
    return {
        "service": "WaveStack YouTube Publisher",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.PORT, reload=settings.ENV == "development")
