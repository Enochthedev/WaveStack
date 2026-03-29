from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PORT: int = 3300
    DATABASE_URL: str
    REDIS_URL: str
    CORE_APP_URL: str = "http://core-app:3000/api"
    INTERNAL_SERVICE_SECRET: str = "dev-internal-secret"

    # Peer services
    MCP_GATEWAY_URL: str = "http://mcp-gateway:4100"
    SKILLS_URL: str = "http://skills:3500"
    KNOWLEDGE_URL: str = "http://knowledge:3900"
    AI_PERSONALITY_URL: str = "http://ai-personality:3800"

    # All AI calls go through the model-router — no direct provider keys here.
    # The model-router owns provider selection, routing, and escalation.
    MODEL_ROUTER_URL: str = "http://model-router:3700"

    MAX_CONCURRENT_TASKS: int = 10
    APPROVAL_TIMEOUT_HOURS: int = 4
    LOG_LEVEL: str = "INFO"
    ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
