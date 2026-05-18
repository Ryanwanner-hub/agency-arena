from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.agent import AgentRead
from app.scoring import ACTIVITY_TYPES


class ActivityBase(BaseModel):
    agent_id: int
    activity_type: str
    premium: Optional[float] = Field(default=None, ge=0)
    source: Optional[str] = None
    # Backdating: when a manager logs a sale a day or two after it
    # actually happened, pass an explicit timestamp here. Naive (server
    # treats it as the office's business day). Leave null to use the
    # current moment.
    occurred_at: Optional[datetime] = None

    @field_validator("activity_type")
    @classmethod
    def validate_activity_type(cls, value: str) -> str:
        normalized = value.strip()
        if normalized not in ACTIVITY_TYPES:
            raise ValueError(f"activity_type must be one of {sorted(ACTIVITY_TYPES)}")
        return normalized

    @field_validator("source")
    @classmethod
    def normalize_source(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ActivityCreate(ActivityBase):
    pass


class ActivityRead(ActivityBase):
    id: int
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityFeedItem(ActivityRead):
    agent: AgentRead
