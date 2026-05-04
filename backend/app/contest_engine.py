"""Contest standings + lifecycle.

Single source of truth for:
- mapping a contest's ``metric`` string to the right DailyScore column
- ranking agents over the contest window (incl. the special "improved" metric)
- determining a contest's status (pending / active / ended) on a given day
- lazily creating successor instances for ``auto_renew`` contests whose
  window has expired
"""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models import Agent, Contest, DailyScore


# Maps contest.metric → DailyScore column we sum over the contest window.
METRIC_COLUMNS = {
    "points": DailyScore.total_points,
    "quotes": DailyScore.quotes,
    "policies": DailyScore.policies,
    "referrals": DailyScore.referrals,
    "bundles": DailyScore.bundles,
    "reviews": DailyScore.reviews,
}

ALLOWED_METRICS = set(METRIC_COLUMNS.keys()) | {"improved"}


@dataclass
class StandingsRow:
    rank: int
    agent_id: int
    name: str
    role: str
    avatar_url: Optional[str]
    value: float
    current_value: Optional[float] = None
    previous_value: Optional[float] = None


def contest_status(contest: Contest, today: date) -> str:
    if contest.start_date > today:
        return "pending"
    if contest.end_date < today:
        return "ended"
    return "active"


def compute_standings(db: Session, contest: Contest) -> List[StandingsRow]:
    if contest.metric == "improved":
        return _improved_standings(db, contest)
    if contest.metric in METRIC_COLUMNS:
        return _value_standings(db, contest)
    return []


def _value_standings(db: Session, contest: Contest) -> List[StandingsRow]:
    column = METRIC_COLUMNS[contest.metric]
    rows = (
        db.query(
            Agent.id,
            Agent.name,
            Agent.role,
            Agent.avatar_url,
            func.coalesce(func.sum(column), 0).label("value"),
        )
        .outerjoin(
            DailyScore,
            (DailyScore.agent_id == Agent.id)
            & (DailyScore.date >= contest.start_date)
            & (DailyScore.date <= contest.end_date),
        )
        .filter(Agent.active.is_(True))
        .group_by(Agent.id, Agent.name, Agent.role, Agent.avatar_url)
        .order_by(desc("value"), Agent.name.asc())
        .all()
    )

    return _rank(
        [
            {
                "agent_id": r.id,
                "name": r.name,
                "role": r.role,
                "avatar_url": r.avatar_url,
                "value": float(r.value),
            }
            for r in rows
        ]
    )


def _improved_standings(db: Session, contest: Contest) -> List[StandingsRow]:
    """Improvement = points in current window minus points in the prior
    equal-length window immediately preceding the contest's start.
    """
    window_days = (contest.end_date - contest.start_date).days + 1
    prev_start = contest.start_date - timedelta(days=window_days)
    prev_end = contest.start_date - timedelta(days=1)

    current = _agent_points_in_window(db, contest.start_date, contest.end_date)
    previous = _agent_points_in_window(db, prev_start, prev_end)

    agents = (
        db.query(Agent.id, Agent.name, Agent.role, Agent.avatar_url)
        .filter(Agent.active.is_(True))
        .all()
    )

    rows = []
    for a in agents:
        cur = current.get(a.id, 0.0)
        prev = previous.get(a.id, 0.0)
        rows.append(
            {
                "agent_id": a.id,
                "name": a.name,
                "role": a.role,
                "avatar_url": a.avatar_url,
                "value": cur - prev,
                "current_value": cur,
                "previous_value": prev,
            }
        )
    rows.sort(key=lambda r: (-r["value"], r["name"]))
    return _rank(rows)


def _agent_points_in_window(
    db: Session, start: date, end: date
) -> Dict[int, float]:
    rows = (
        db.query(
            DailyScore.agent_id,
            func.coalesce(func.sum(DailyScore.total_points), 0),
        )
        .filter(DailyScore.date >= start, DailyScore.date <= end)
        .group_by(DailyScore.agent_id)
        .all()
    )
    return {agent_id: float(total) for agent_id, total in rows}


def _rank(rows: List[dict]) -> List[StandingsRow]:
    """Apply competition ranking — ties share a rank, next rank skips."""
    out: List[StandingsRow] = []
    for index, row in enumerate(rows, start=1):
        rank = index
        if out and out[-1].value == row["value"]:
            rank = out[-1].rank
        out.append(
            StandingsRow(
                rank=rank,
                agent_id=row["agent_id"],
                name=row["name"],
                role=row["role"],
                avatar_url=row["avatar_url"],
                value=row["value"],
                current_value=row.get("current_value"),
                previous_value=row.get("previous_value"),
            )
        )
    return out


def auto_renew_contests(db: Session, today: date) -> int:
    """Create successor instances for ended ``auto_renew`` templates.

    A successor is generated when:
    - the template's ``end_date`` is in the past, AND
    - no contest with the same ``name`` already covers ``today`` or later.

    Returns the number of new contests created.
    """
    ended_templates = (
        db.query(Contest)
        .filter(Contest.auto_renew.is_(True), Contest.end_date < today)
        .all()
    )

    created = 0
    for template in ended_templates:
        existing_active = (
            db.query(Contest.id)
            .filter(
                Contest.name == template.name,
                Contest.metric == template.metric,
                Contest.type == template.type,
                Contest.end_date >= today,
            )
            .first()
        )
        if existing_active:
            continue

        if template.type == "daily":
            new_start = today
            new_end = today
        elif template.type == "weekly":
            new_start = today - timedelta(days=today.weekday())
            new_end = new_start + timedelta(days=6)
        elif template.type == "monthly":
            new_start = today.replace(day=1)
            last_day = calendar.monthrange(today.year, today.month)[1]
            new_end = today.replace(day=last_day)
        else:
            # Don't auto-renew custom-cadence contests.
            continue

        db.add(
            Contest(
                name=template.name,
                type=template.type,
                metric=template.metric,
                start_date=new_start,
                end_date=new_end,
                auto_renew=True,
            )
        )
        created += 1

    if created:
        db.commit()
    return created


__all__ = [
    "ALLOWED_METRICS",
    "StandingsRow",
    "auto_renew_contests",
    "compute_standings",
    "contest_status",
]
