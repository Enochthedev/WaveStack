"""
AI Personality Service
Creates a digital clone that learns from the user and responds in their voice
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from prisma import Prisma

from .config import settings
from .engine.personality import PersonalityEngine
from .engine.memory import MemoryManager
from .engine.content_generator import ContentGenerator
from .engine.learning_pipeline import LearningPipeline
from .api import router

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
db = Prisma()
redis_client = None
personality_engine = None
memory_manager = None
content_generator = None
learning_pipeline = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global redis_client, personality_engine, memory_manager, content_generator, learning_pipeline

    # Startup
    logger.info("🚀 Starting AI Personality Service...")

    # Connect to database
    await db.connect()
    logger.info("✅ Connected to PostgreSQL")

    # Connect to Redis
    redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    await redis_client.ping()
    logger.info("✅ Connected to Redis")

    # Initialize AI components
    personality_engine = PersonalityEngine(db, redis_client)
    await personality_engine.initialize()
    logger.info("✅ Personality engine initialized")

    memory_manager = MemoryManager(db, redis_client)
    await memory_manager.initialize()
    logger.info("✅ Memory manager initialized")

    content_generator = ContentGenerator(db, redis_client, personality_engine)
    await content_generator.initialize()
    logger.info("✅ Content generator initialized")

    learning_pipeline = LearningPipeline(db, redis_client, personality_engine, memory_manager)
    asyncio.create_task(learning_pipeline.start())
    logger.info("✅ Learning pipeline started")

    logger.info(f"🎉 AI Personality Service running on port {settings.PORT}")

    yield

    # Shutdown
    logger.info("Shutting down gracefully...")

    if learning_pipeline:
        await learning_pipeline.stop()

    await redis_client.close()
    await db.disconnect()

    logger.info("👋 Shutdown complete")


# Initialize FastAPI
app = FastAPI(
    title="WaveStack AI Personality",
    description="Digital clone with memory and personality",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-personality",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WaveStack AI Personality",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "api": "/api/v1"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENV == "development"
    )
