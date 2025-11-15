"""
SEO Optimizer Service
AI-powered SEO optimization for all content
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis

from .config import settings
from .routes import seo

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack SEO Optimizer",
    description="AI-powered SEO optimization for content discoverability",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

redis = None


@app.on_event("startup")
async def startup_event():
    global redis
    logger.info("🚀 Starting SEO Optimizer Service")

    redis = await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    logger.info("✅ Connected to Redis")

    logger.info("🔍 SEO features enabled:")
    logger.info("  ✅ Title optimization")
    logger.info("  ✅ Description optimization")
    logger.info("  ✅ Keyword research")
    logger.info("  ✅ Tag generation")
    logger.info(f"  ✅ Competition analysis: {settings.COMPETITOR_ANALYSIS_ENABLED}")
    logger.info(f"  ✅ AI Provider: {settings.AI_PROVIDER}")

    logger.info("✅ SEO Optimizer ready")


@app.on_event("shutdown")
async def shutdown_event():
    global redis
    if redis:
        await redis.close()


app.include_router(seo.router)


@app.get("/")
async def root():
    return {
        "service": "WaveStack SEO Optimizer",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "title_optimization",
            "description_optimization",
            "keyword_research",
            "tag_generation",
            "competition_analysis",
            "seo_scoring",
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.ENV == "development")
