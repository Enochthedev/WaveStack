from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prisma import Prisma
import logging
from contextlib import asynccontextmanager

from .config import settings
from .api.routes import api_router

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

prisma = Prisma(auto_register=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Connecting to Prisma database...")
    try:
        await prisma.connect()
        logger.info("Successfully connected to Prisma database.")
    except Exception as e:
        logger.error(f"Failed to connect to Prisma database: {e}")
    yield
    # Shutdown
    logger.info("Disconnecting from Prisma database...")
    if prisma.is_connected():
        await prisma.disconnect()

app = FastAPI(
    title="Agent Orchestrator API",
    description="Multi-agent coordination service for managing autonomous AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "agent-orchestrator",
        "db_connected": prisma.is_connected()
    }
