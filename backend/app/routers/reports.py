from datetime import date, datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity, Agent, DailyScore
from app.schemas.report import (
    AgentBreakdown,
    SummaryAgentRow,
    SummaryReport,
    TeamTotals,
    TopPerformer,
    WeeklyPremiumAgent,
    WeeklyPremiumReport,
    WeeklyReport,
)
from app.scoring import close_rate
from app.time_utils import (
    business_day_from_utc_naive,
    business_today,
    business_window_bounds,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _week_window(week_of: Optional[date]) -> tuple[date, date]:
    base = week_of or business_today()
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

    week_start_dt, week_end_dt = business_window_bounds(start, end)
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


@router.get("/weekly-premium", response_model=WeeklyPremiumReport)
def get_weekly_premium(
    week_of: Optional[date] = Query(
        None,
        description="Any date within the desired week. Defaults to the current week.",
    ),
    db: Session = Depends(get_db),
):
    """Per-agent premium $ totals for the current Mon→Sun window, broken
    out by day. Powers the /tv weekly-premium tracker."""
    start, end = _week_window(week_of)
    week_start_dt, week_end_dt = business_window_bounds(start, end)

    agents = (
        db.query(Agent)
        .filter(Agent.active.is_(True))
        .order_by(Agent.name.asc())
        .all()
    )

    activities = (
        db.query(Activity.agent_id, Activity.premium, Activity.created_at)
        .filter(
            Activity.created_at >= week_start_dt,
            Activity.created_at < week_end_dt,
            Activity.premium.isnot(None),
        )
        .all()
    )

    # Bucket premiums by (agent_id, weekday-offset-from-monday).
    by_agent: Dict[int, List[float]] = {a.id: [0.0] * 7 for a in agents}
    for agent_id, premium, created_at in activities:
        if agent_id not in by_agent:
            continue  # inactive / unknown agent — drop
        day = business_day_from_utc_naive(created_at)
        offset = (day - start).days
        if 0 <= offset <= 6:
            by_agent[agent_id][offset] += float(premium or 0)

    out: List[WeeklyPremiumAgent] = []
    for a in agents:
        days = by_agent[a.id]
        out.append(
            WeeklyPremiumAgent(
                agent_id=a.id,
                name=a.name,
                nickname=a.nickname,
                avatar_url=a.avatar_url,
                avatar_preset=a.avatar_preset,
                goal=a.weekly_premium_goal,
                total=sum(days),
                days=days,
            )
        )

    return WeeklyPremiumReport(week_start=start, week_end=end, agents=out)


@router.get("/summary", response_model=SummaryReport)
def get_summary(
    start: Optional[date] = Query(
        None,
        description="Start date (inclusive). Defaults to the first of the current month.",
    ),
    end: Optional[date] = Query(
        None,
        description="End date (inclusive). Defaults to today.",
    ),
    db: Session = Depends(get_db),
):
    """Per-agent metric breakdown for an arbitrary date window. Drives the
    /reports page — policies / bundles / referrals / reviews / premium $
    / total points, plus a team total row and an activity-type histogram.
    """
    today = business_today()
    s = start or today.replace(day=1)
    e = end or today
    if e < s:
        s, e = e, s

    window_start, window_end = business_window_bounds(s, e)

    # DailyScore-backed counters
    rows = (
        db.query(
            Agent.id,
            Agent.name,
            Agent.nickname,
            Agent.role,
            func.coalesce(func.sum(DailyScore.total_points), 0).label("total_points"),
            func.coalesce(func.sum(DailyScore.policies), 0).label("policies"),
            func.coalesce(func.sum(DailyScore.bundles), 0).label("bundles"),
            func.coalesce(func.sum(DailyScore.referrals), 0).label("referrals"),
            func.coalesce(func.sum(DailyScore.reviews), 0).label("reviews"),
            func.coalesce(func.sum(DailyScore.quotes), 0).label("quotes"),
        )
        .outerjoin(
            DailyScore,
            (DailyScore.agent_id == Agent.id)
            & (DailyScore.date >= s)
            & (DailyScore.date <= e),
        )
        .filter(Agent.active.is_(True))
        .group_by(Agent.id, Agent.name, Agent.nickname, Agent.role)
        .order_by(desc("total_points"), Agent.name.asc())
        .all()
    )

    # Premium $ totals come from Activity, not DailyScore (we don't sum
    # premium into the daily rollup).
    premium_rows = (
        db.query(
            Activity.agent_id,
            func.coalesce(func.sum(Activity.premium), 0.0),
        )
        .filter(
            Activity.created_at >= window_start,
            Activity.created_at < window_end,
            Activity.premium.isnot(None),
        )
        .group_by(Activity.agent_id)
        .all()
    )
    premium_by_agent: Dict[int, float] = {aid: float(p or 0) for aid, p in premium_rows}

    agents: List[SummaryAgentRow] = []
    team_points = team_policies = team_bundles = 0
    team_referrals = team_reviews = team_quotes = 0
    team_premium = 0.0
    for r in rows:
        prem = premium_by_agent.get(r.id, 0.0)
        agents.append(
            SummaryAgentRow(
                agent_id=r.id,
                name=r.name,
                nickname=r.nickname,
                role=r.role,
                total_points=int(r.total_points),
                policies=int(r.policies),
                bundles=int(r.bundles),
                referrals=int(r.referrals),
                reviews=int(r.reviews),
                premium_total=prem,
                close_rate=close_rate(int(r.policies), int(r.quotes)),
            )
        )
        team_points += int(r.total_points)
        team_policies += int(r.policies)
        team_bundles += int(r.bundles)
        team_referrals += int(r.referrals)
        team_reviews += int(r.reviews)
        team_quotes += int(r.quotes)
        team_premium += prem

    team = SummaryAgentRow(
        agent_id=0,
        name="Team",
        role="team",
        total_points=team_points,
        policies=team_policies,
        bundles=team_bundles,
        referrals=team_referrals,
        reviews=team_reviews,
        premium_total=team_premium,
        close_rate=close_rate(team_policies, team_quotes),
    )

    type_rows = (
        db.query(Activity.activity_type, func.count(Activity.id))
        .filter(
            Activity.created_at >= window_start,
            Activity.created_at < window_end,
        )
        .group_by(Activity.activity_type)
        .all()
    )
    activity_by_type = {t: c for t, c in type_rows}

    return SummaryReport(
        start_date=s,
        end_date=e,
        team=team,
        agents=agents,
        activity_by_type=activity_by_type,
    )
