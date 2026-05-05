"""Operator endpoints — wipe data for a fresh office, etc.

Open by default. The frontend gates with a typed-confirmation prompt so a
manager can't fat-finger it. Lock down with reverse-proxy auth or an
``ADMIN_TOKEN`` check if the deployment is reachable beyond the office.
"""

from fastapi import APIRouter, Depends
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

    Strategy: wipe DailyScore entirely, then for each (agent, day) tuple
    that has at least one Activity row, recreate the daily score from
    scratch. This guarantees no stale rows survive — even ones outside
    the current activity range or for agents that have since gone
    inactive.

    Run after any scoring-rule change. Idempotent — safe to re-run.
    """
    db.query(DailyScore).delete(synchronize_session=False)
    db.flush()

    activities = (
        db.query(Activity.agent_id, Activity.created_at)
        .order_by(Activity.created_at.asc())
        .all()
    )
    if not activities:
        db.commit()
        return {"recomputed": 0, "message": "no activity to recompute"}

    pairs: set[tuple[int, object]] = set()
    for agent_id, created_at in activities:
        pairs.add((agent_id, business_day_from_utc_naive(created_at)))

    days = sorted({day for _, day in pairs})
    for agent_id, day in pairs:
        recalculate_daily_score(db, agent_id, day)
    db.commit()
    return {
        "recomputed": len(pairs),
        "start": days[0].isoformat(),
        "end": days[-1].isoformat(),
        "agent_day_pairs": len(pairs),
    }
