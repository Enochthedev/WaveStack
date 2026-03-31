"""
AI Personality Service
Creates a digital clone that learns from the user and responds in their voice
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma
import redis.asyncio as redis

from app.api import personality, content, memory, learning
from app.engine.personality_engine import PersonalityEngine
from app.engine.memory_manager import MemoryManager
from app.engine.content_generator import ContentGenerator
from app.engine.learning_pipeline import LearningPipeline
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
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
    """Application lifespan manager"""
    global redis_client, personality_engine, memory_manager, content_generator, learning_pipeline

    # Startup
    logger.info("🚀 Starting AI Personality Service...")

    # Connect to database
    await db.connect()
    logger.info("✅ Connected to database")

    # Connect to Redis
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
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

    logger.info(f"🎉 AI Personality Service running on {settings.host}:{settings.port}")

    yield

    # Shutdown
    logger.info("👋 Shutting down AI Personality Service...")

    if learning_pipeline:
        await learning_pipeline.stop()

    await redis_client.close()
    await db.disconnect()

    logger.info("✅ Graceful shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="WaveStack AI Personality",
    description="AI-powered digital clone with memory and personality",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(personality.router, prefix="/api/v1/personality", tags=["Personality"])
app.include_router(content.router, prefix="/api/v1/content", tags=["Content"])
app.include_router(memory.router, prefix="/api/v1/memory", tags=["Memory"])
app.include_router(learning.router, prefix="/api/v1/learning", tags=["Learning"])


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-personality",
        "version": "1.0.0",
        "ai_provider": settings.ai_provider,
        "features": {
            "auto_respond": settings.auto_respond_enabled,
            "auto_post_twitter": settings.auto_post_twitter,
            "sentiment_filtering": settings.sentiment_filtering,
            "controversy_avoidance": settings.controversy_avoidance,
        }
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "WaveStack AI Personality",
        "description": "AI-powered digital clone that learns and responds in your voice",
        "docs": "/docs",
        "health": "/health"
    }


# Make components available to routes
def get_personality_engine() -> PersonalityEngine:
    return personality_engine

def get_memory_manager() -> MemoryManager:
    return memory_manager

def get_content_generator() -> ContentGenerator:
    return content_generator

def get_learning_pipeline() -> LearningPipeline:
    return learning_pipeline
