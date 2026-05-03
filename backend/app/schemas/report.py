from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel


class TeamTotals(BaseModel):
    total_points: int
    quotes: int
    policies: int
    referrals: int
    followups: int
    close_rate: float


class AgentBreakdown(BaseModel):
    agent_id: int
    name: str
    role: str
    total_points: int
    quotes: int
    policies: int
    referrals: int
    followups: int
    close_rate: float


class TopPerformer(BaseModel):
    agent_id: int
    name: str
    value: float


class WeeklyReport(BaseModel):
    week_start: date
    week_end: date
    team: TeamTotals
    agents: List[AgentBreakdown]
    top_performers: Dict[str, Optional[TopPerformer]]
    activity_by_type: Dict[str, int]
