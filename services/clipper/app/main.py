from fastapi import FastAPI
from app.interfaces.http.api.v1.routes import router as v1
from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("clipper.http")

app = FastAPI(
    title="WaveStack Clipper",
    version="1.0.0",
    description="FFmpeg-powered clip service with RQ + Redis.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.include_router(v1, prefix="")  # serves /api/v1/* including /api/v1/health

# keep a top-level health too, since infra checks /health sometimes
@app.get("/health")
def health():
    return {"status": "ok"}