from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WaveStack Sponsor Manager", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

redis = None

@app.on_event("startup")
async def startup():
    global redis
    logger.info("🚀 Starting Sponsor Manager Service")
    redis = await aioredis.from_url("redis://redis:6379", encoding="utf-8", decode_responses=True)
    logger.info("✅ Sponsor Manager ready - Track sponsors, manage obligations, automate integrations")

@app.on_event("shutdown")
async def shutdown():
    if redis:
        await redis.close()

@app.get("/")
async def root():
    return {"service": "Sponsor Manager", "version": "1.0.0", "status": "running", "features": ["sponsor_tracking", "obligation_management", "revenue_reporting", "auto_integration"]}

from .routes import sponsors
app.include_router(sponsors.router)
