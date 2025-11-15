"""
Analytics Dashboard Configuration
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    PORT: int = 8800
    HOST: str = "0.0.0.0"
    ENV: str = "production"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str
    REDIS_URL: str

    # External Services
    YOUTUBE_PUBLISHER_URL: str = "http://youtube-publisher:8500"
    SOCIAL_PUBLISHER_URL: str = "http://social-publisher:8600"
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    CLIPPER_URL: str = "http://clipper:8000"
    AUTO_MOD_URL: str = "http://auto-mod:8700"

    # Analytics Settings
    METRICS_RETENTION_DAYS: int = 90
    CACHE_TTL_SECONDS: int = 300  # 5 minutes
    REAL_TIME_WINDOW_HOURS: int = 24

    # Reporting
    DAILY_REPORT_ENABLED: bool = True
    WEEKLY_REPORT_ENABLED: bool = True
    MONTHLY_REPORT_ENABLED: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
