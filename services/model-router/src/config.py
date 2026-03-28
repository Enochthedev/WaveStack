from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    port: int = 3700
    redis_url: str = "redis://redis:6379"

    # ── Anthropic (Claude — big brain / escalation) ──────────────────────────
    # Required. Get key: https://console.anthropic.com/settings/keys
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-6"
    claude_complex_model: str = "claude-opus-4-6"

    # ── OpenRouter (base-tier inference — OpenAI-compatible) ─────────────────
    # Preferred for base model calls (1 key → 200+ models, cheaper than direct).
    # Get key: https://openrouter.ai/keys
    # Leave empty to fall back to Together AI.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_base_model: str = "meta-llama/llama-3.2-3b-instruct:free"

    # ── Together AI (personal fine-tuned models only) ────────────────────────
    # Only used when a creator's personal LoRA model is deployed.
    # Get key: https://api.together.xyz/settings/api-keys
    together_api_key: str = ""
    platform_base_model: str = "meta-llama/Llama-3.2-3B-Instruct"

    # ── Core API ─────────────────────────────────────────────────────────────
    core_api_url: str = "http://core-api:3000"
    internal_service_secret: str = "dev-internal-secret"

    # ── Routing thresholds ───────────────────────────────────────────────────
    personal_model_min_confidence: float = 0.6
    personal_model_min_examples: int = 500
    escalation_confidence_threshold: float = 0.7

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
