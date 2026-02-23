from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PORT: int = 3300
    DATABASE_URL: str
    REDIS_URL: str
    MCP_GATEWAY_URL: str
    SKILLS_URL: str
    KNOWLEDGE_URL: str
    AI_PERSONALITY_URL: str
    AI_PROVIDER: str = "ollama"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama2"
    MAX_CONCURRENT_TASKS: int = 10
    APPROVAL_TIMEOUT_HOURS: int = 24
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
