import json
from typing import Optional

from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Settings


def get_or_create_settings(db: Session) -> Settings:
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if settings is None:
        dialect = db.bind.dialect.name if db.bind is not None else ""
        values = {
            "id": 1,
            "theme": "corporate",
            "current_agent_id": 1,
            "point_overrides": "{}",
        }
        try:
            if dialect == "sqlite":
                stmt = sqlite_insert(Settings).values(**values).on_conflict_do_nothing(
                    index_elements=["id"]
                )
                db.execute(stmt)
                db.commit()
            elif dialect == "postgresql":
                stmt = postgres_insert(Settings).values(**values).on_conflict_do_nothing(
                    index_elements=["id"]
                )
                db.execute(stmt)
                db.commit()
            else:
                settings = Settings(**values)
                db.add(settings)
                db.commit()
        except IntegrityError:
            db.rollback()

        settings = db.query(Settings).filter(Settings.id == 1).one()
    return settings


def normalize_point_overrides(raw: Optional[str]) -> dict[str, int]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(parsed, dict):
        return {}

    out: dict[str, int] = {}
    for key, value in parsed.items():
        if not isinstance(key, str):
            continue
        if isinstance(value, bool):
            continue
        if isinstance(value, int) and value >= 0:
            out[key] = value
    return out


def get_point_overrides(db: Session) -> dict[str, int]:
    settings = get_or_create_settings(db)
    return normalize_point_overrides(settings.point_overrides)


def serialize_point_overrides(overrides: dict[str, int]) -> str:
    return json.dumps(overrides, sort_keys=True)
