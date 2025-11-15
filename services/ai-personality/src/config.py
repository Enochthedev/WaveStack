"""Configuration settings"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Server
    PORT: int = 8200
    ENV: str = "development"

    # Database
    DATABASE_URL: str
    REDIS_URL: str = "redis://redis:6379"

    # AI Provider
    AI_PROVIDER: str = "openai"

    # OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Anthropic
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-3-sonnet-20240229"

    # Ollama (Local LLM)
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama2"  # llama2, mistral, codellama, etc.

    # Hugging Face (Local transformers)
    HUGGINGFACE_MODEL: str = "meta-llama/Llama-2-7b-chat-hf"  # or mistralai/Mistral-7B-Instruct-v0.1
    HUGGINGFACE_CACHE_DIR: str = "./models/huggingface"

    # ML Training Service (for fine-tuned models)
    ML_TRAINING_URL: str = "http://ml-training:8300"
    FINETUNED_MODEL_PATH: str = "./models/finetuned"

    # ChromaDB
    CHROMA_PATH: str = "./data/chroma"
    CHROMA_COLLECTION: str = "wavestack_memories"

    # Personality
    PERSONALITY_TEMPERATURE: float = 0.8
    PERSONALITY_MAX_TOKENS: int = 500
    CONTEXT_WINDOW: int = 20
    MEMORY_RETENTION_DAYS: int = 90

    # Learning
    BATCH_SIZE: int = 32
    LEARNING_RATE: float = 0.001
    MIN_CONFIDENCE: float = 0.7

    # Features
    AUTO_RESPOND_ENABLED: bool = True
    AUTO_POST_TWITTER: bool = False
    SENTIMENT_FILTERING: bool = True
    CONTROVERSY_AVOIDANCE: bool = True
    NEGATIVITY_THRESHOLD: float = -0.5

    # Twitter
    TWITTER_API_KEY: str | None = None
    TWITTER_API_SECRET: str | None = None
    TWITTER_ACCESS_TOKEN: str | None = None
    TWITTER_ACCESS_SECRET: str | None = None
    TWITTER_BEARER_TOKEN: str | None = None

    # Content Generation
    POST_FREQUENCY_HOURS: int = 4
    MIN_ENGAGEMENT_SCORE: float = 0.6
    HASHTAG_LIMIT: int = 3

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
