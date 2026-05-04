from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Agent
from app.schemas.settings import SettingsRead, SettingsUpdate
from app.settings_store import (
    get_or_create_settings,
    normalize_point_overrides,
    serialize_point_overrides,
)

router = APIRouter(prefix="/settings", tags=["settings"])


def _to_read(settings) -> SettingsRead:
    return SettingsRead(
        theme=settings.theme,
        current_agent_id=settings.current_agent_id,
        point_overrides=normalize_point_overrides(settings.point_overrides),
        daily_policy_goal=settings.daily_policy_goal,
        updated_at=settings.updated_at,
    )


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    return _to_read(get_or_create_settings(db))


@router.patch("", response_model=SettingsRead)
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    data = payload.model_dump(exclude_unset=True)
    if "current_agent_id" in data and data["current_agent_id"] is not None:
        exists = (
            db.query(Agent.id)
            .filter(Agent.id == data["current_agent_id"])
            .first()
        )
        if not exists:
            raise HTTPException(
                status_code=422,
                detail=f"Agent {data['current_agent_id']} not found",
            )
    if "point_overrides" in data and data["point_overrides"] is not None:
        settings.point_overrides = serialize_point_overrides(data.pop("point_overrides"))
    for key, value in data.items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return _to_read(settings)
