from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    port: int = 3400
    database_url: str
    redis_url: str
    chroma_host: str
    chroma_port: int
    ai_provider: str = "ollama"  # openai, ollama, sentence-transformers
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    ollama_base_url: str = "http://localhost:11434"
    chunk_size: int = 512
    chunk_overlap: int = 50
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
