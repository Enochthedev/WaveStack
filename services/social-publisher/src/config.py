"""
Social Publisher Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8600
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:wave@postgres:5432/wave"

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # Instagram Configuration
    INSTAGRAM_USERNAME: Optional[str] = None
    INSTAGRAM_PASSWORD: Optional[str] = None
    INSTAGRAM_SESSION_FILE: str = "./sessions/instagram.json"
    INSTAGRAM_USE_PROXY: bool = False
    INSTAGRAM_PROXY: Optional[str] = None

    # TikTok Configuration
    TIKTOK_SESSION_ID: Optional[str] = None
    TIKTOK_USE_PROXY: bool = False
    TIKTOK_PROXY: Optional[str] = None

    # Facebook Configuration
    FACEBOOK_ACCESS_TOKEN: Optional[str] = None
    FACEBOOK_PAGE_ID: Optional[str] = None
    FACEBOOK_APP_ID: Optional[str] = None
    FACEBOOK_APP_SECRET: Optional[str] = None

    # LinkedIn Configuration
    LINKEDIN_ACCESS_TOKEN: Optional[str] = None
    LINKEDIN_CLIENT_ID: Optional[str] = None
    LINKEDIN_CLIENT_SECRET: Optional[str] = None
    LINKEDIN_REDIRECT_URI: str = "http://localhost:8600/oauth/linkedin/callback"

    # Twitter/X Configuration (already have twitter-autoposter, but include for consistency)
    TWITTER_API_KEY: Optional[str] = None
    TWITTER_API_SECRET: Optional[str] = None
    TWITTER_ACCESS_TOKEN: Optional[str] = None
    TWITTER_ACCESS_SECRET: Optional[str] = None
    TWITTER_BEARER_TOKEN: Optional[str] = None

    # Content Storage
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"
    SESSIONS_DIR: str = "./sessions"

    # Video Processing
    MAX_VIDEO_SIZE_MB: int = 100
    INSTAGRAM_MAX_DURATION: int = 60  # seconds
    TIKTOK_MAX_DURATION: int = 180  # 3 minutes
    FACEBOOK_MAX_DURATION: int = 240  # 4 minutes

    # AI Integration
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    THUMBNAIL_GENERATOR_URL: str = "http://thumbnail-generator:8400"
    USE_AI_CAPTIONS: bool = True  # Generate captions with AI
    USE_AI_HASHTAGS: bool = True  # Generate hashtags with AI

    # Rate Limiting
    INSTAGRAM_POST_DELAY: int = 300  # 5 minutes between posts
    TIKTOK_POST_DELAY: int = 600  # 10 minutes between posts
    MAX_DAILY_POSTS_PER_PLATFORM: int = 10

    # Scheduling
    ENABLE_SCHEDULING: bool = True
    CHECK_SCHEDULED_INTERVAL: int = 60  # seconds

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
