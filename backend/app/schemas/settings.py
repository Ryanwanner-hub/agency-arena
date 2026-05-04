from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.scoring import ACTIVITY_TYPES


Theme = Literal["corporate", "neon", "sports", "casino"]


class SettingsRead(BaseModel):
    theme: Theme
    current_agent_id: int
    point_overrides: dict[str, int] = {}
    daily_policy_goal: int = 6
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    theme: Optional[Theme] = None
    current_agent_id: Optional[int] = None
    point_overrides: Optional[dict[str, int]] = None
    daily_policy_goal: Optional[int] = None

    @field_validator("daily_policy_goal")
    @classmethod
    def validate_daily_policy_goal(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if value < 1:
            raise ValueError("daily_policy_goal must be at least 1")
        if value > 1000:
            raise ValueError("daily_policy_goal must be 1000 or fewer")
        return value

    @field_validator("point_overrides")
    @classmethod
    def validate_point_overrides(
        cls,
        value: Optional[dict[str, int]],
    ) -> Optional[dict[str, int]]:
        if value is None:
            return None
        normalized: dict[str, int] = {}
        for key, points in value.items():
            activity_type = key.strip()
            if activity_type not in ACTIVITY_TYPES:
                raise ValueError(
                    f"point_overrides keys must be one of {sorted(ACTIVITY_TYPES)}"
                )
            if points < 0:
                raise ValueError("point override values must be >= 0")
            normalized[activity_type] = points
        return normalized
