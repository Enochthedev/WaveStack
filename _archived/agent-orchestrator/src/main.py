from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

from .config import settings
from .api.routes import api_router
from .api.internal import router as internal_router
from .store import get_redis, close_redis

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — warm up Redis connection
    logger.info("Connecting to Redis...")
    try:
        redis = await get_redis()
        await redis.ping()
        logger.info("Redis connected.")
    except Exception as exc:
        logger.error("Redis connection failed: %s", exc)
    yield
    # Shutdown
    logger.info("Closing Redis connection...")
    await close_redis()


app = FastAPI(
    title="Agent Orchestrator API",
    description="Multi-agent coordination service for managing autonomous AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — restrict origins in production
_origins = (
    ["*"] if settings.ENV == "development"
    else [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-Service", "X-Org-Id"],
)

# Public API
app.include_router(api_router, prefix="/api/v1")

# Internal callbacks (called by peer services, not exposed externally)
app.include_router(internal_router)

# Also expose task submit at /v1 (matches what Twitch bot calls)
from .api.tasks import router as tasks_router  # noqa: E402
app.include_router(tasks_router, prefix="/v1")

# /v1/chat/stream — called by core-app when proxying SSE chat to the browser
from .api.chat import router as chat_v1_router  # noqa: E402
app.include_router(chat_v1_router, prefix="/v1")


@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    try:
        redis = await get_redis()
        await redis.ping()
        redis_ok = True
    except Exception:
        redis_ok = False

    return {
        "status": "ok",
        "service": "agent-orchestrator",
        "redis": redis_ok,
    }
