"""Operator endpoints — wipe data for a fresh office, etc.

Open by default. The frontend gates with a typed-confirmation prompt so a
manager can't fat-finger it. Lock down with reverse-proxy auth or an
``ADMIN_TOKEN`` check if the deployment is reachable beyond the office.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Activity,
    Agent,
    AgentBadge,
    Contest,
    DailyScore,
    ReferralPartner,
)
from app.scoring import recalculate_daily_score
from app.time_utils import business_day_from_utc_naive

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/reset")
def reset_office_data(db: Session = Depends(get_db)) -> dict:
    """Wipe team data so a manager can plug in their real roster.

    Deletes: activities, daily scores, badge awards, contests, referral
    partners, agents.

    Keeps: the Badge template catalog (so earned badges still resolve to a
    name later) and Settings (theme, point overrides, etc.).

    Returns the row counts so the UI can show "deleted X activities,
    Y agents…" feedback.
    """
    counts = {
        "activities": db.query(Activity).delete(synchronize_session=False),
        "daily_scores": db.query(DailyScore).delete(synchronize_session=False),
        "agent_badges": db.query(AgentBadge).delete(synchronize_session=False),
        "contests": db.query(Contest).delete(synchronize_session=False),
        "referral_partners": db.query(ReferralPartner).delete(
            synchronize_session=False,
        ),
        "agents": db.query(Agent).delete(synchronize_session=False),
    }
    db.commit()
    return {"deleted": counts}


@router.post("/recompute-scores")
def recompute_scores(db: Session = Depends(get_db)) -> dict:
    """Rebuild every DailyScore row from the underlying Activity log.

    Run this after changing scoring rules (e.g. when ``cross_sell_sold``
    started counting as a policy) so the leaderboard, monthly race, and
    contests reflect the new rules retroactively. Idempotent — safe to
    re-run.
    """
    bounds = (
        db.query(func.min(Activity.created_at), func.max(Activity.created_at))
        .one()
    )
    earliest, latest = bounds
    if earliest is None or latest is None:
        return {"recomputed": 0, "message": "no activity to recompute"}

    start_day = business_day_from_utc_naive(earliest)
    end_day = business_day_from_utc_naive(latest)

    agents = [a.id for a in db.query(Agent.id).all()]
    total = 0
    day = start_day
    while day <= end_day:
        for agent_id in agents:
            recalculate_daily_score(db, agent_id, day)
            total += 1
        day = day + timedelta(days=1)
    db.commit()
    return {
        "recomputed": total,
        "start": start_day.isoformat(),
        "end": end_day.isoformat(),
        "agents": len(agents),
    }
