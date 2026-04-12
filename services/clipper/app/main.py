from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.interfaces.http.api.v1.routes import router as v1
from app.thumbnails.routes.thumbnails import router as thumbnails_router
from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("clipper.http")

app = FastAPI(
    title="WaveStack Clipper",
    version="1.0.0",
    description="FFmpeg-powered clip & thumbnail service with RQ + Redis.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1, prefix="")  # serves /api/v1/* including /api/v1/health
app.include_router(thumbnails_router)  # serves /api/v1/thumbnails/*

# keep a top-level health too, since infra checks /health sometimes
@app.get("/health")
def health():
    return {"status": "ok"}