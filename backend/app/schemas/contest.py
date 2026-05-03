from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.contest_engine import ALLOWED_METRICS


class ContestBase(BaseModel):
    name: str
    type: str = "weekly"
    metric: str
    start_date: date
    end_date: date
    auto_renew: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("name must not be blank")
        return normalized

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"daily", "weekly", "custom"}:
            raise ValueError("type must be one of ['custom', 'daily', 'weekly']")
        return normalized

    @field_validator("metric")
    @classmethod
    def validate_metric(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_METRICS:
            raise ValueError(f"metric must be one of {sorted(ALLOWED_METRICS)}")
        return normalized


class ContestCreate(ContestBase):
    pass


class ContestRead(ContestBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContestListItem(ContestRead):
    status: str  # pending | active | ended
    leader_name: Optional[str] = None
    leader_value: Optional[float] = None
