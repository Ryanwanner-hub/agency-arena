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
