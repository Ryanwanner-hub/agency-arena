import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.database import Base, engine
from app.models import (  # noqa: F401  (register models with Base.metadata)
    Activity,
    Agent,
    AgentBadge,
    Badge,
    Contest,
    DailyScore,
    ReferralPartner,
    Settings,
)
from app.routers import (
    activity,
    agents,
    contests,
    health,
    leaderboard,
    referral_partners,
    reports,
    settings as settings_router,
)
from app.seed.seed_data import seed_database


SEED_ON_STARTUP = os.environ.get("SEED_ON_STARTUP", "true").strip().lower() in (
    "1",
    "true",
    "yes",
)

# Comma-separated list. Defaults cover the local Next.js dev ports; in
# production set ``ALLOWED_ORIGINS`` to the Vercel URL (and any preview
# domains you want to permit).
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:3001",
    ).split(",")
    if o.strip()
]


# Lightweight schema migrations for columns added after initial deploy.
# `Base.metadata.create_all` only creates missing *tables*, not missing
# *columns* on existing ones. This helper picks up the slack so existing
# seed databases keep their data instead of needing a wipe.
_PENDING_COLUMNS: dict[str, dict[str, str]] = {
    "agents": {
        "avatar_color": "VARCHAR(32)",
        "avatar_frame": "VARCHAR(32)",
        "status_effect": "VARCHAR(32)",
    },
}


def _ensure_columns() -> None:
    insp = inspect(engine)
    for table, columns in _PENDING_COLUMNS.items():
        if table not in insp.get_table_names():
            continue  # create_all just made it; all columns are present
        existing = {c["name"] for c in insp.get_columns(table)}
        missing = {name: ddl for name, ddl in columns.items() if name not in existing}
        if not missing:
            continue
        with engine.begin() as conn:
            for name, ddl in missing.items():
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_columns()
    if SEED_ON_STARTUP:
        seed_database()
    yield


app = FastAPI(
    title="Agency Arena API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User-uploaded avatars are written under ``uploads/`` relative to the
# backend working directory, served back with the same prefix.
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(health.router)
app.include_router(agents.router)
app.include_router(activity.router)
app.include_router(contests.router)
app.include_router(leaderboard.router)
app.include_router(referral_partners.router)
app.include_router(reports.router)
app.include_router(settings_router.router)
