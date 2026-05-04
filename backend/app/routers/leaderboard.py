from datetime import date, datetime, timedelta
from typing import List, Tuple

from fastapi import APIRouter, Depends
from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Agent, DailyScore
from app.schemas.leaderboard import LeaderboardEntry, LeaderboardResponse, Period
from app.scoring import close_rate
from app.time_utils import business_today

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


def _period_window(period: Period, today: date) -> Tuple[date, date]:
    if period == "daily":
        return today, today
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        return start, start + timedelta(days=6)
    # monthly
    start = today.replace(day=1)
    if start.month == 12:
        next_month = start.replace(year=start.year + 1, month=1)
    else:
        next_month = start.replace(month=start.month + 1)
    return start, next_month - timedelta(days=1)


@router.get("", response_model=LeaderboardResponse)
def get_leaderboard(
    period: Period = "daily",
    db: Session = Depends(get_db),
):
    today = business_today()
    start, end = _period_window(period, today)

    # Prior equal-length window, immediately preceding the current one.
    # Used to compute trend (delta + percent change).
    window_days = (end - start).days + 1
    prior_end = start - timedelta(days=1)
    prior_start = prior_end - timedelta(days=window_days - 1)
    prior_points: dict[int, int] = dict(
        db.query(
            DailyScore.agent_id,
            func.coalesce(func.sum(DailyScore.total_points), 0),
        )
        .filter(DailyScore.date >= prior_start, DailyScore.date <= prior_end)
        .group_by(DailyScore.agent_id)
        .all()
    )

    rows = (
        db.query(
            Agent.id,
            Agent.name,
            Agent.nickname,
            Agent.role,
            Agent.avatar_url,
            Agent.avatar_preset,
            func.coalesce(func.sum(DailyScore.total_points), 0).label("total_points"),
            func.coalesce(func.sum(DailyScore.quotes), 0).label("quotes"),
            func.coalesce(func.sum(DailyScore.policies), 0).label("policies"),
            func.coalesce(func.sum(DailyScore.referrals), 0).label("referrals"),
            func.coalesce(func.sum(DailyScore.followups), 0).label("followups"),
            func.coalesce(func.sum(DailyScore.bundles), 0).label("bundles"),
            func.coalesce(func.sum(DailyScore.reviews), 0).label("reviews"),
        )
        .outerjoin(
            DailyScore,
            and_(
                DailyScore.agent_id == Agent.id,
                DailyScore.date >= start,
                DailyScore.date <= end,
            ),
        )
        .filter(Agent.active.is_(True))
        .group_by(
            Agent.id,
            Agent.name,
            Agent.nickname,
            Agent.role,
            Agent.avatar_url,
            Agent.avatar_preset,
        )
        .order_by(desc("total_points"), Agent.name.asc())
        .all()
    )

    entries: List[LeaderboardEntry] = []
    # Competition ranking: ties share a rank, next rank skips (1, 2, 2, 4).
    for index, row in enumerate(rows, start=1):
        rank = index
        if entries and entries[-1].total_points == row.total_points:
            rank = entries[-1].rank

        prior = int(prior_points.get(row.id, 0))
        delta = int(row.total_points) - prior
        # Skip percent calc when prior == 0 — undefined (would be infinite).
        # Frontend renders this as a "new" indicator instead of a number.
        pct = round((delta / prior) * 100, 1) if prior > 0 else None

        entries.append(
            LeaderboardEntry(
                rank=rank,
                agent_id=row.id,
                name=row.name,
                nickname=row.nickname,
                role=row.role,
                avatar_url=row.avatar_url,
                avatar_preset=row.avatar_preset,
                total_points=row.total_points,
                quotes=row.quotes,
                policies=row.policies,
                referrals=row.referrals,
                followups=row.followups,
                bundles=row.bundles,
                reviews=row.reviews,
                close_rate=close_rate(row.policies, row.quotes),
                trend_delta=delta,
                trend_pct=pct,
            )
        )

    return LeaderboardResponse(
        period=period,
        start_date=start,
        end_date=end,
        entries=entries,
    )
