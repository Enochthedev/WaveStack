"""
ML Training Service Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8300
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:wave@postgres:5432/wave"

    # Redis (for job queue)
    REDIS_URL: str = "redis://redis:6379"

    # Model Storage
    MODEL_CACHE_DIR: str = "./models/cache"
    FINETUNED_MODEL_DIR: str = "./models/finetuned"
    CHECKPOINT_DIR: str = "./models/checkpoints"

    # Hugging Face
    HUGGINGFACE_TOKEN: Optional[str] = None
    DEFAULT_BASE_MODEL: str = "meta-llama/Llama-2-7b-chat-hf"

    # Training Configuration
    MAX_SEQ_LENGTH: int = 2048
    BATCH_SIZE: int = 4
    GRADIENT_ACCUMULATION_STEPS: int = 4
    LEARNING_RATE: float = 2e-4
    NUM_TRAIN_EPOCHS: int = 3
    WARMUP_STEPS: int = 100
    SAVE_STEPS: int = 500
    EVAL_STEPS: int = 500
    LOGGING_STEPS: int = 10

    # LoRA Configuration
    LORA_R: int = 16  # Rank
    LORA_ALPHA: int = 32  # Alpha parameter
    LORA_DROPOUT: float = 0.05
    LORA_TARGET_MODULES: str = "q_proj,v_proj"  # Which layers to apply LoRA

    # Quantization
    USE_4BIT: bool = True  # 4-bit quantization (QLoRA)
    USE_8BIT: bool = False  # 8-bit quantization
    BNB_4BIT_COMPUTE_DTYPE: str = "float16"
    BNB_4BIT_QUANT_TYPE: str = "nf4"

    # Training Data
    MIN_TRAINING_SAMPLES: int = 100
    VALIDATION_SPLIT: float = 0.1

    # Inference
    MAX_NEW_TOKENS: int = 500
    TEMPERATURE: float = 0.8
    TOP_P: float = 0.9
    TOP_K: int = 50

    # Resource Limits
    MAX_CONCURRENT_TRAININGS: int = 2
    MAX_GPU_MEMORY_GB: int = 24

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
