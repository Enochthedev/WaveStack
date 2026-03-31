"""Configuration settings for AI Personality Service"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    port: int = 8200
    host: str = "0.0.0.0"
    environment: str = "development"

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379"

    # AI Providers
    ai_provider: str = "openai"  # openai, anthropic, or both

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4-turbo-preview"
    openai_embedding_model: str = "text-embedding-3-small"

    # Anthropic
    anthropic_api_key: Optional[str] = None
    anthropic_model: str = "claude-3-sonnet-20240229"

    # Ollama (optional)
    ollama_base_url: Optional[str] = None
    ollama_model: str = "llama2"

    # ChromaDB
    chroma_host: str = "localhost"
    chroma_port: int = 8000
    chroma_collection: str = "wavestack_memories"

    # Personality Configuration
    personality_temperature: float = 0.8
    personality_max_tokens: int = 500
    context_window: int = 20
    memory_retention_days: int = 90
    min_memory_importance: int = 5

    # Learning Pipeline
    learn_from_discord: bool = True
    learn_from_twitch: bool = True
    learn_from_telegram: bool = True
    learn_from_twitter: bool = True
    learn_from_streams: bool = True
    batch_size: int = 50
    learning_interval_minutes: int = 5

    # Content Generation
    auto_respond_enabled: bool = True
    auto_post_twitter: bool = False
    content_review_required: bool = True
    min_confidence_score: float = 0.7

    # Safety & Filtering
    sentiment_filtering: bool = True
    controversy_avoidance: bool = True
    min_sentiment_score: float = -0.3
    max_controversy_level: int = 5
    content_moderation: bool = True

    # Twitter API
    twitter_api_key: Optional[str] = None
    twitter_api_secret: Optional[str] = None
    twitter_access_token: Optional[str] = None
    twitter_access_secret: Optional[str] = None
    twitter_bearer_token: Optional[str] = None

    # n8n Integration
    n8n_webhook_url: Optional[str] = None
    n8n_api_key: Optional[str] = None

    # Logging
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
