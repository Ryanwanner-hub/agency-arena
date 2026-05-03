from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity, Agent, DailyScore
from app.schemas.report import (
    AgentBreakdown,
    TeamTotals,
    TopPerformer,
    WeeklyReport,
)
from app.scoring import close_rate

router = APIRouter(prefix="/reports", tags=["reports"])


def _week_window(week_of: Optional[date]) -> tuple[date, date]:
    base = week_of or datetime.utcnow().date()
    start = base - timedelta(days=base.weekday())
    return start, start + timedelta(days=6)


@router.get("/weekly", response_model=WeeklyReport)
def get_weekly_report(
    week_of: Optional[date] = Query(
        None,
        description="Any date within the desired week. Defaults to the current week.",
    ),
    db: Session = Depends(get_db),
):
    start, end = _week_window(week_of)

    team_row = (
        db.query(
            func.coalesce(func.sum(DailyScore.total_points), 0),
            func.coalesce(func.sum(DailyScore.quotes), 0),
            func.coalesce(func.sum(DailyScore.policies), 0),
            func.coalesce(func.sum(DailyScore.referrals), 0),
            func.coalesce(func.sum(DailyScore.followups), 0),
        )
        .filter(DailyScore.date >= start, DailyScore.date <= end)
        .one()
    )
    t_points, t_quotes, t_policies, t_referrals, t_followups = team_row
    team = TeamTotals(
        total_points=t_points,
        quotes=t_quotes,
        policies=t_policies,
        referrals=t_referrals,
        followups=t_followups,
        close_rate=close_rate(t_policies, t_quotes),
    )

    agent_rows = (
        db.query(
            Agent.id,
            Agent.name,
            Agent.role,
            func.coalesce(func.sum(DailyScore.total_points), 0).label("total_points"),
            func.coalesce(func.sum(DailyScore.quotes), 0).label("quotes"),
            func.coalesce(func.sum(DailyScore.policies), 0).label("policies"),
            func.coalesce(func.sum(DailyScore.referrals), 0).label("referrals"),
            func.coalesce(func.sum(DailyScore.followups), 0).label("followups"),
        )
        .outerjoin(
            DailyScore,
            (DailyScore.agent_id == Agent.id)
            & (DailyScore.date >= start)
            & (DailyScore.date <= end),
        )
        .filter(Agent.active.is_(True))
        .group_by(Agent.id, Agent.name, Agent.role)
        .order_by(desc("total_points"), Agent.name.asc())
        .all()
    )

    agents: List[AgentBreakdown] = []
    for r in agent_rows:
        agents.append(
            AgentBreakdown(
                agent_id=r.id,
                name=r.name,
                role=r.role,
                total_points=r.total_points,
                quotes=r.quotes,
                policies=r.policies,
                referrals=r.referrals,
                followups=r.followups,
                close_rate=close_rate(r.policies, r.quotes),
            )
        )

    top_performers: Dict[str, Optional[TopPerformer]] = {}
    for metric in ("total_points", "quotes", "policies", "referrals", "followups"):
        winner = max(agents, key=lambda a: getattr(a, metric), default=None)
        if winner is not None and getattr(winner, metric) > 0:
            top_performers[metric] = TopPerformer(
                agent_id=winner.agent_id,
                name=winner.name,
                value=float(getattr(winner, metric)),
            )
        else:
            top_performers[metric] = None

    week_start_dt = datetime.combine(start, datetime.min.time())
    week_end_dt = datetime.combine(end + timedelta(days=1), datetime.min.time())
    type_rows = (
        db.query(Activity.activity_type, func.count(Activity.id))
        .filter(
            Activity.created_at >= week_start_dt,
            Activity.created_at < week_end_dt,
        )
        .group_by(Activity.activity_type)
        .all()
    )
    activity_by_type = {t: c for t, c in type_rows}

    return WeeklyReport(
        week_start=start,
        week_end=end,
        team=team,
        agents=agents,
        top_performers=top_performers,
        activity_by_type=activity_by_type,
    )
