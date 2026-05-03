from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.activity import ActivityRead
from app.schemas.agent import AgentRead


class LifetimeStats(BaseModel):
    total_points: int
    quotes: int
    policies: int
    referrals: int
    followups: int
    close_rate: float


class EarnedBadge(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    earned_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DailyHistoryPoint(BaseModel):
    date: date
    total_points: int
    quotes: int
    policies: int
    referrals: int
    followups: int
    close_rate: float

    model_config = ConfigDict(from_attributes=True)


class AgentProfile(BaseModel):
    agent: AgentRead
    lifetime: LifetimeStats
    recent_activity: List[ActivityRead]
    badges: List[EarnedBadge]
    daily_history: List[DailyHistoryPoint]
