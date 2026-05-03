from typing import List, Optional

from pydantic import BaseModel

from app.schemas.contest import ContestRead


class StandingsEntry(BaseModel):
    rank: int
    agent_id: int
    name: str
    role: str
    avatar_url: Optional[str] = None
    value: float
    # Populated only when contest.metric == "improved"
    current_value: Optional[float] = None
    previous_value: Optional[float] = None


class ContestStandings(BaseModel):
    contest: ContestRead
    status: str  # pending | active | ended
    entries: List[StandingsEntry]
