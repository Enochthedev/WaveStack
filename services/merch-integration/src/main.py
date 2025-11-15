from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WaveStack Merch Integration", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

redis = None

@app.on_event("startup")
async def startup():
    global redis
    logger.info("🚀 Starting Merch Integration Service")
    redis = await aioredis.from_url("redis://redis:6379", encoding="utf-8", decode_responses=True)
    logger.info("✅ Merch Integration ready - Printful, Teespring, Shopify supported")

@app.on_event("shutdown")
async def shutdown():
    if redis:
        await redis.close()

@app.get("/")
async def root():
    return {"service": "Merch Integration", "version": "1.0.0", "status": "running", "platforms": ["printful", "teespring", "shopify"], "features": ["auto_update_links", "sales_tracking", "inventory_sync", "revenue_reporting"]}

from .routes import merch
app.include_router(merch.router)
