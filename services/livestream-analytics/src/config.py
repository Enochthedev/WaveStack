from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 9500
    HOST: str = "0.0.0.0"
    ENV: str = "production"
    LOG_LEVEL: str = "INFO"
    REDIS_URL: str
    TWITCH_CLIENT_ID: str = ""
    TWITCH_CLIENT_SECRET: str = ""
    YOUTUBE_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
