from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings


DB_URL = settings.get_database_url()

# SQLite needs check_same_thread=False for FastAPI's async workers.
# PostgreSQL benefits from pool_pre_ping for connection health checks.
if DB_URL.startswith("sqlite"):
    engine = create_engine(
        DB_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(DB_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
