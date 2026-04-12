"""
Thumbnail Generator Service
FastAPI application for AI-powered thumbnail generation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from pathlib import Path

from .config import settings
from .routes import thumbnails
from .generator.image_gen import image_generator

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="WaveStack Thumbnail Generator",
    description="AI-powered thumbnail generation for content creators",
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
app.include_router(thumbnails.router)


@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    logger.info("🚀 Starting Thumbnail Generator Service")

    # Create necessary directories
    Path(settings.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.FONTS_DIR).mkdir(parents=True, exist_ok=True)

    logger.info(f"Output directory: {settings.OUTPUT_DIR}")
    logger.info(f"Fonts directory: {settings.FONTS_DIR}")
    logger.info(f"Image provider: {settings.IMAGE_PROVIDER}")

    # Initialize image generator
    try:
        await image_generator.initialize()
        logger.info("✅ Image generator initialized")
    except Exception as e:
        logger.error(f"Failed to initialize image generator: {e}")
        logger.warning("⚠️  Service running without image generation capability")

    # Check GPU availability for local SD
    if settings.IMAGE_PROVIDER == "local":
        import torch
        if torch.cuda.is_available():
            gpu_count = torch.cuda.device_count()
            logger.info(f"✅ CUDA available with {gpu_count} GPU(s)")
            for i in range(gpu_count):
                gpu_name = torch.cuda.get_device_name(i)
                logger.info(f"   GPU {i}: {gpu_name}")
        else:
            logger.warning("⚠️  CUDA not available - image generation will use CPU (slower)")

    logger.info("✅ Thumbnail Generator Service ready")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Thumbnail Generator Service")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WaveStack Thumbnail Generator",
        "version": "1.0.0",
        "status": "running",
        "provider": settings.IMAGE_PROVIDER,
        "endpoints": {
            "generate": "/api/v1/thumbnails/generate",
            "templates": "/api/v1/thumbnails/templates/list",
            "styles": "/api/v1/thumbnails/styles/list",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    health_status = {
        "status": "healthy",
        "provider": settings.IMAGE_PROVIDER,
    }

    if settings.IMAGE_PROVIDER == "local":
        import torch
        health_status["cuda_available"] = torch.cuda.is_available()
        health_status["cuda_device_count"] = (
            torch.cuda.device_count() if torch.cuda.is_available() else 0
        )

    return health_status


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENV == "development",
    )
