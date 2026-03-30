from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "IntelliScaleSim"
    APP_ENV: str = "development"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # Default uses local SQLite file. Override via .env for PostgreSQL in production.
    DATABASE_URL: str = "sqlite:///./app.db"

    CORS_ORIGINS: str = "*"

    # Auth/JWT
    JWT_SECRET: str = "change-me-in-.env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # Token expirations (minutes)
    VERIFY_TOKEN_MINUTES: int = 60 * 24  # 24h
    RESET_TOKEN_MINUTES: int = 30

    # SMTP (real emails)
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_USE_TLS: bool = True
    SMTP_USE_SSL: bool = False
    MAIL_FROM: str | None = None

    class Config:
        # Allow local .env at repository root or backend/.env
        env_file = ".env"
        case_sensitive = True


settings = Settings()
