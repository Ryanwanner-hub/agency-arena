from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AgentBase(BaseModel):
    name: str
    role: str = "agent"
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_frame: Optional[str] = None
    status_effect: Optional[str] = None
    nickname: Optional[str] = None
    title: Optional[str] = None
    active: bool = True
    start_date: Optional[date] = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_frame: Optional[str] = None
    status_effect: Optional[str] = None
    nickname: Optional[str] = None
    title: Optional[str] = None
    active: Optional[bool] = None


class AgentRead(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
