"""
Auto-Moderation Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    """Application settings"""

    # Server
    PORT: int = 8700
    ENV: str = "development"

    # Database
    DATABASE_URL: str = "postgresql://postgres:wave@postgres:5432/wave"

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # AI Personality Integration
    AI_PERSONALITY_URL: str = "http://ai-personality:8200"
    USE_AI_MODERATION: bool = True  # Use AI for contextual moderation

    # Toxicity Detection
    TOXICITY_THRESHOLD: float = 0.7  # 0-1, higher = stricter
    USE_DETOXIFY: bool = True  # Use Detoxify model for toxicity detection

    # Spam Detection
    SPAM_THRESHOLD: float = 0.6  # 0-1
    MAX_CAPS_RATIO: float = 0.7  # Max percentage of caps in message
    MAX_EMOJIS: int = 10  # Max emojis in message
    MAX_MENTIONS: int = 5  # Max mentions in message
    MAX_LINKS: int = 2  # Max links in message
    MIN_MESSAGE_LENGTH: int = 1  # Minimum message length
    MAX_MESSAGE_LENGTH: int = 500  # Maximum message length

    # Repeat/Spam Detection
    REPEAT_MESSAGE_COUNT: int = 3  # Same message X times = spam
    REPEAT_MESSAGE_WINDOW: int = 60  # Within X seconds

    # Link Moderation
    ALLOWED_DOMAINS: List[str] = ["youtube.com", "youtu.be", "twitch.tv", "twitter.com", "x.com"]
    BLOCKED_DOMAINS: List[str] = []  # Explicitly blocked domains
    CHECK_LINK_SAFETY: bool = True

    # Banned Words/Phrases
    BANNED_WORDS: List[str] = []  # Load from database/config
    BANNED_PHRASES: List[str] = []

    # Actions
    AUTO_DELETE: bool = True  # Auto-delete flagged messages
    AUTO_TIMEOUT: bool = False  # Auto-timeout users
    AUTO_BAN: bool = False  # Auto-ban users (requires multiple violations)
    TIMEOUT_DURATION: int = 300  # Timeout duration in seconds (5 min default)
    VIOLATIONS_FOR_BAN: int = 5  # Number of violations before ban

    # Whitelist
    WHITELIST_ROLES: List[str] = ["mod", "vip", "broadcaster", "admin"]  # Exempt from moderation
    WHITELIST_USERS: List[str] = []  # Specific exempt users

    # Logging
    LOG_ALL_MESSAGES: bool = False  # Log all messages (privacy concern)
    LOG_VIOLATIONS: bool = True  # Log only violations
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
