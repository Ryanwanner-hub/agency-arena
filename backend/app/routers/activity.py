from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.contest_engine import auto_renew_contests
from app.database import get_db
from app.models import Activity, Agent
from app.schemas.activity import ActivityCreate, ActivityFeedItem, ActivityRead
from app.schemas.agent import AgentRead
from app.scoring import calculate_points, record_activity_daily_score
from app.settings_store import get_point_overrides
from app.time_utils import business_today

router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db)):
    if not db.query(Agent.id).filter(Agent.id == payload.agent_id).first():
        raise HTTPException(status_code=404, detail=f"Agent {payload.agent_id} not found")

    point_overrides = get_point_overrides(db)
    activity = Activity(
        **payload.model_dump(),
        points=calculate_points(payload.activity_type, point_overrides),
    )
    db.add(activity)
    db.flush()
    record_activity_daily_score(
        db,
        agent_id=activity.agent_id,
        activity_type=activity.activity_type,
        points=activity.points,
        created_at=activity.created_at,
    )
    db.commit()
    db.refresh(activity)
    auto_renew_contests(db, business_today())

    return activity


@router.get("/feed", response_model=list[ActivityFeedItem])
def list_activity_feed(
    limit: int = Query(200, ge=1, le=2000),
    agent_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Activity, Agent)
        .join(Agent, Agent.id == Activity.agent_id)
        .order_by(Activity.created_at.desc(), Activity.id.desc())
    )
    if agent_id is not None:
        query = query.filter(Activity.agent_id == agent_id)

    rows = query.limit(limit).all()
    return [
        ActivityFeedItem(
            **ActivityRead.model_validate(activity).model_dump(),
            agent=AgentRead.model_validate(agent),
        )
        for activity, agent in rows
    ]
