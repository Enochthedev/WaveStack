from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from redis import asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WaveStack Email Marketing", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

redis = None

@app.on_event("startup")
async def startup():
    global redis
    logger.info("🚀 Starting Email Marketing Service")
    redis = await aioredis.from_url("redis://redis:6379", encoding="utf-8", decode_responses=True)
    logger.info("✅ Email Marketing ready - SendGrid, Mailchimp integration active")

@app.on_event("shutdown")
async def shutdown():
    if redis:
        await redis.close()

@app.get("/")
async def root():
    return {"service": "Email Marketing", "version": "1.0.0", "status": "running", "features": ["newsletter_automation", "drip_campaigns", "audience_segmentation", "event_announcements", "analytics"]}

from .routes import email
app.include_router(email.router)
