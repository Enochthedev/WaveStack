"""
SEO Optimizer Configuration
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    PORT: int = 9300
    HOST: str = "0.0.0.0"
    ENV: str = "production"
    LOG_LEVEL: str = "INFO"

    # Database
    REDIS_URL: str

    # External Services
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    YOUTUBE_PUBLISHER_URL: str = "http://youtube-publisher:8500"

    # AI Provider
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    AI_PROVIDER: str = "openai"  # openai, anthropic, ollama

    # SEO Settings
    KEYWORD_RESEARCH_ENABLED: bool = True
    COMPETITOR_ANALYSIS_ENABLED: bool = True
    TITLE_MAX_LENGTH: int = 100
    DESCRIPTION_MAX_LENGTH: int = 5000
    TAGS_MAX_COUNT: int = 500

    # Optimization Targets
    TARGET_TITLE_LENGTH: int = 60
    TARGET_DESCRIPTION_LENGTH: int = 150
    MIN_READABILITY_SCORE: float = 60.0

    class Config:
        env_file = ".env"


settings = Settings()
