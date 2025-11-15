"""
Thumbnail Generator Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8400
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:wave@postgres:5432/wave"

    # Redis (for caching)
    REDIS_URL: str = "redis://redis:6379"

    # Image Generation Provider
    # Options: openai, stability, local
    IMAGE_PROVIDER: str = "local"

    # OpenAI DALL-E (Optional - Paid)
    OPENAI_API_KEY: Optional[str] = None
    DALLE_MODEL: str = "dall-e-3"
    DALLE_SIZE: str = "1792x1024"  # YouTube thumbnail ratio
    DALLE_QUALITY: str = "hd"

    # Stability AI (Optional - Paid)
    STABILITY_API_KEY: Optional[str] = None
    STABILITY_MODEL: str = "stable-diffusion-xl-1024-v1-0"

    # Local Stable Diffusion (FREE)
    SD_MODEL: str = "stabilityai/stable-diffusion-xl-base-1.0"
    SD_CACHE_DIR: str = "./models/stable-diffusion"
    SD_USE_REFINER: bool = False

    # Thumbnail Configuration
    THUMBNAIL_WIDTH: int = 1280
    THUMBNAIL_HEIGHT: int = 720
    DEFAULT_FORMAT: str = "PNG"
    QUALITY: int = 95

    # Text Overlay
    DEFAULT_FONT_SIZE: int = 80
    DEFAULT_FONT_COLOR: str = "white"
    DEFAULT_STROKE_COLOR: str = "black"
    DEFAULT_STROKE_WIDTH: int = 3
    FONTS_DIR: str = "./fonts"

    # Storage
    OUTPUT_DIR: str = "./thumbnails"
    CACHE_THUMBNAILS: bool = True
    CACHE_EXPIRY_HOURS: int = 24

    # AI Personality Integration
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    USE_AI_PROMPTS: bool = True  # Let AI generate image prompts

    # Performance
    MAX_CONCURRENT_GENERATIONS: int = 3
    GENERATION_TIMEOUT: int = 120  # seconds

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
