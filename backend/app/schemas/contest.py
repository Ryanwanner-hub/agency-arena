from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ContestBase(BaseModel):
    name: str
    type: str = "weekly"
    metric: str
    start_date: date
    end_date: date
    auto_renew: bool = False


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
