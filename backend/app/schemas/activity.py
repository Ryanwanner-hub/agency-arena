from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ActivityBase(BaseModel):
    agent_id: int
    activity_type: str
    premium: Optional[float] = None
    source: Optional[str] = None


class ActivityCreate(ActivityBase):
    pass


class ActivityRead(ActivityBase):
    id: int
    points: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
