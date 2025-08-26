from pydantic import BaseModel, AnyHttpUrl
from pathlib import Path
import os

class Settings(BaseModel):
    PORT: int = int(os.getenv("PORT", "8080"))
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", "/data"))
    PUBLIC_BASE: AnyHttpUrl | str = os.getenv("PUBLIC_BASE", "http://localhost:8081")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://redis:6379")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    QUEUE_NAME: str = os.getenv("QUEUE_NAME", "clips")

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)