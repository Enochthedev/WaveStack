from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis
from .config import settings
from .routes import analytics

logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

app = FastAPI(title="WaveStack Live Stream Analytics", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

redis = None

@app.on_event("startup")
async def startup_event():
    global redis
    logger.info("🚀 Starting Live Stream Analytics Service")
    redis = await aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    logger.info("✅ Connected to Redis")
    logger.info("✅ Live Stream Analytics ready")

@app.on_event("shutdown")
async def shutdown_event():
    if redis:
        await redis.close()

app.include_router(analytics.router)

@app.get("/")
async def root():
    return {"service": "WaveStack Live Stream Analytics", "version": "1.0.0", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host=settings.HOST, port=settings.PORT, reload=settings.ENV == "development")
