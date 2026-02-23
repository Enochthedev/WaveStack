import logging
from contextlib import asynccontextmanager

import chromadb
import redis.asyncio as redis
from fastapi import FastAPI

# Core Infra references
from prisma import aioprisma

from .api.routes import router as api_router
from .config import get_settings

# Initialize globals
prisma = aioprisma.Prisma()
redis_client: redis.Redis | None = None
chroma_client: chromadb.HttpClient | None = None

settings = get_settings()

# Setup logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client, chroma_client
    # Connect Prisma
    logger.info("Connecting to Database via Prisma...")
    await prisma.connect()

    # Connect Redis
    logger.info(f"Connecting to Redis at {settings.redis_url}...")
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    await redis_client.ping()

    # Connect ChromaDB
    logger.info(f"Connecting to ChromaDB at {settings.chroma_host}:{settings.chroma_port}...")
    chroma_client = chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    chroma_client.heartbeat()

    yield

    # Disconnect
    logger.info("Disconnecting services...")
    await prisma.disconnect()
    if redis_client:
        await redis_client.aclose() # type: ignore

app = FastAPI(
    title="Knowledge Service",
    description="RAG pipeline for WaveStack",
    version="1.0.0",
    lifespan=lifespan
)

# Root health
@app.get("/health")
async def health():
    return {"status": "ok"}

# API Routes
app.include_router(api_router, prefix="/api/v1")
