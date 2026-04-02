from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    APP_NAME: str = "IntelliScaleSim"
    APP_ENV: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8001

    # Default uses local SQLite file. Override via .env for PostgreSQL in production.
    DATABASE_URL: str = "sqlite:///./app.db"

    CORS_ORIGINS: str = "*"

    # Auth/JWT - Support both naming conventions
    JWT_SECRET: str = "change-me-in-.env"
    SECRET_KEY: Optional[str] = None  # Alias for JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ALGORITHM: Optional[str] = None  # Alias for JWT_ALGORITHM
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8001"

    # Token expirations (minutes)
    VERIFY_TOKEN_MINUTES: int = 60 * 24  # 24h
    RESET_TOKEN_MINUTES: int = 30

    # SMTP (real emails)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    MAIL_FROM: Optional[str] = None
    FROM_EMAIL: Optional[str] = None  # Alias for MAIL_FROM

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Groq AI API
    GROQ_API_KEY: Optional[str] = None

    # Docker Hub (optional)
    DOCKER_HUB_USERNAME: Optional[str] = None
    DOCKER_HUB_PASSWORD: Optional[str] = None

    # Logging
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60

    # Prometheus
    PROMETHEUS_ENABLED: bool = True
    METRICS_PATH: str = "/metrics"

    class Config:
        # Allow local .env at repository root or backend/.env
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra env vars that aren't defined

    def get_jwt_secret(self) -> str:
        """Get JWT secret, supporting both naming conventions"""
        return self.SECRET_KEY or self.JWT_SECRET

    def get_jwt_algorithm(self) -> str:
        """Get JWT algorithm, supporting both naming conventions"""
        return self.ALGORITHM or self.JWT_ALGORITHM


settings = Settings()
