from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Activity, Agent
from app.schemas.activity import ActivityCreate, ActivityRead
from app.scoring import calculate_points, recalculate_daily_score

router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("", response_model=ActivityRead, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db)):
    if not db.query(Agent.id).filter(Agent.id == payload.agent_id).first():
        raise HTTPException(status_code=404, detail=f"Agent {payload.agent_id} not found")

    activity = Activity(
        **payload.model_dump(),
        points=calculate_points(payload.activity_type),
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    recalculate_daily_score(db, activity.agent_id, activity.created_at.date())
    db.commit()

    return activity
