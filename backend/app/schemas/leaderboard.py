from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel


Period = Literal["daily", "weekly", "monthly"]


class LeaderboardEntry(BaseModel):
    rank: int
    agent_id: int
    name: str
    nickname: Optional[str] = None
    role: str
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    total_points: int
    quotes: int
    policies: int
    referrals: int
    followups: int
    close_rate: float
    # Momentum fields:
    # trend_delta = total_points (current window) - total_points (prior equal window)
    # trend_pct = % change vs prior; null when the prior window had zero points
    trend_delta: int = 0
    trend_pct: Optional[float] = None


class LeaderboardResponse(BaseModel):
    period: Period
    start_date: date
    end_date: date
    entries: List[LeaderboardEntry]
