"""
YouTube Publisher Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8500
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:wave@postgres:5432/wave"

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # YouTube OAuth
    YOUTUBE_CLIENT_ID: Optional[str] = None
    YOUTUBE_CLIENT_SECRET: Optional[str] = None
    YOUTUBE_REDIRECT_URI: str = "http://localhost:8500/oauth2callback"

    # Scopes required for YouTube API
    YOUTUBE_SCOPES: list[str] = [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube",
        "https://www.googleapis.com/auth/youtube.force-ssl",
    ]

    # OAuth credentials storage
    CREDENTIALS_DIR: str = "./credentials"

    # Upload Configuration
    DEFAULT_PRIVACY: str = "private"  # private, unlisted, public
    DEFAULT_CATEGORY: str = "22"  # People & Blogs
    CHUNK_SIZE: int = 1024 * 1024 * 5  # 5MB chunks
    MAX_RETRIES: int = 3

    # Thumbnail Integration
    THUMBNAIL_GENERATOR_URL: str = "http://thumbnail-generator:8400"
    AUTO_GENERATE_THUMBNAILS: bool = True

    # AI Personality Integration
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    USE_AI_DESCRIPTIONS: bool = True  # Generate descriptions with AI
    USE_AI_TAGS: bool = True  # Generate tags with AI

    # Video Processing
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"

    # Rate Limiting (YouTube quota management)
    DAILY_UPLOAD_LIMIT: int = 50  # Conservative limit
    QUOTA_COST_PER_UPLOAD: int = 1600  # Approximate quota cost

    # Scheduling
    ENABLE_SCHEDULING: bool = True
    CHECK_SCHEDULED_INTERVAL: int = 60  # seconds

    # Playlist Management
    AUTO_ADD_TO_PLAYLIST: bool = False
    DEFAULT_PLAYLIST_ID: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
