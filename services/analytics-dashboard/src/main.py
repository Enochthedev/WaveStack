"""
Analytics Dashboard Service
Real-time analytics and insights for all WaveStack platforms
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis

from .config import settings
from .routes import analytics

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WaveStack Analytics Dashboard",
    description="Comprehensive analytics and insights across all platforms",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis = None


@app.on_event("startup")
async def startup_event():
    global redis
    logger.info("🚀 Starting Analytics Dashboard Service")

    # Connect to Redis
    redis = await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    logger.info("✅ Connected to Redis")

    logger.info("📊 Analytics features enabled:")
    logger.info("  ✅ Real-time metrics tracking")
    logger.info("  ✅ Multi-platform analytics")
    logger.info("  ✅ Engagement insights")
    logger.info("  ✅ Growth tracking")
    logger.info("  ✅ Revenue reporting")
    logger.info("  ✅ Content performance")
    logger.info("  ✅ Moderation statistics")

    logger.info(f"Metrics retention: {settings.METRICS_RETENTION_DAYS} days")
    logger.info(f"Cache TTL: {settings.CACHE_TTL_SECONDS} seconds")

    logger.info("✅ Analytics Dashboard ready")


@app.on_event("shutdown")
async def shutdown_event():
    global redis
    if redis:
        await redis.close()
    logger.info("Analytics Dashboard shutting down")


app.include_router(analytics.router)


@app.get("/")
async def root():
    return {
        "service": "WaveStack Analytics Dashboard",
        "version": "1.0.0",
        "status": "running",
        "features": [
            "real_time_metrics",
            "platform_analytics",
            "engagement_tracking",
            "growth_insights",
            "revenue_reporting",
            "content_performance",
            "moderation_stats",
        ],
        "endpoints": {
            "overview": "/api/v1/analytics/overview",
            "trends": "/api/v1/analytics/trends/{metric}",
            "top_content": "/api/v1/analytics/content/top",
            "platforms": "/api/v1/analytics/platforms",
            "engagement": "/api/v1/analytics/engagement",
            "growth": "/api/v1/analytics/growth",
            "revenue": "/api/v1/analytics/revenue",
            "moderation": "/api/v1/analytics/moderation",
            "realtime": "/api/v1/analytics/realtime",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.ENV == "development")
