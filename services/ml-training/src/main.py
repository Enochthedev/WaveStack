"""
ML Training Service
FastAPI application for fine-tuning and serving custom language models
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import training, inference

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="WaveStack ML Training Service",
    description="Fine-tune and serve custom language models for AI personality",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(training.router)
app.include_router(inference.router)


@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("🚀 Starting ML Training Service")

    # Create necessary directories
    Path(settings.MODEL_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.FINETUNED_MODEL_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CHECKPOINT_DIR).mkdir(parents=True, exist_ok=True)

    logger.info(f"Model cache: {settings.MODEL_CACHE_DIR}")
    logger.info(f"Fine-tuned models: {settings.FINETUNED_MODEL_DIR}")
    logger.info(f"Checkpoints: {settings.CHECKPOINT_DIR}")

    # Check GPU availability
    import torch
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        logger.info(f"✅ CUDA available with {gpu_count} GPU(s)")
        for i in range(gpu_count):
            gpu_name = torch.cuda.get_device_name(i)
            logger.info(f"   GPU {i}: {gpu_name}")
    else:
        logger.warning("⚠️  CUDA not available - training will use CPU (slower)")

    logger.info("✅ ML Training Service ready")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ML Training Service")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WaveStack ML Training Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "training": "/api/v1/training",
            "inference": "/api/v1",
            "health": "/api/v1/health",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENV == "development",
    )
