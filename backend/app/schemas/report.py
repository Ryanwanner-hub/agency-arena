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


class WeeklyPremiumAgent(BaseModel):
    agent_id: int
    name: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    goal: int
    total: float
    # Mon → Sun premium, indexed 0..6 to match Python's weekday().
    # Front-end labels as M/T/W/T/F/S/S in order.
    days: List[float]


class WeeklyPremiumReport(BaseModel):
    week_start: date
    week_end: date
    agents: List[WeeklyPremiumAgent]


class SummaryAgentRow(BaseModel):
    agent_id: int
    name: str
    nickname: Optional[str] = None
    role: str
    total_points: int
    policies: int
    bundles: int
    referrals: int
    reviews: int
    premium_total: float
    close_rate: float


class SummaryReport(BaseModel):
    start_date: date
    end_date: date
    team: SummaryAgentRow
    agents: List[SummaryAgentRow]
    activity_by_type: Dict[str, int]
