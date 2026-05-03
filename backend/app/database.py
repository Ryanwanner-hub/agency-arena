import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to a local SQLite file so dev "just works"; production overrides
# via ``DATABASE_URL`` (Render Postgres, etc.).
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./agency_arena.db")

# Render's Postgres URLs come back as ``postgres://`` but SQLAlchemy 2.x
# requires ``postgresql://``. Normalize so the same env value works in
# both ecosystems.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = (
    {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
