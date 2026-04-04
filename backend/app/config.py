from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    DATABASE_URL: str = "sqlite:///./neurorestore.db"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    ENABLE_DEMO_SEED: bool = True
    MAX_SESSION_DURATION_MINUTES: int = 90
    GROQ_API_KEY: str = ""

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
