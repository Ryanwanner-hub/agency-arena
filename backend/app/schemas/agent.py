from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class AgentBase(BaseModel):
    name: str
    role: str = "agent"
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_frame: Optional[str] = None
    status_effect: Optional[str] = None
    nickname: Optional[str] = None
    title: Optional[str] = None
    active: bool = True
    weekly_premium_goal: int = 10000
    start_date: Optional[date] = None

    @field_validator("weekly_premium_goal")
    @classmethod
    def validate_goal(cls, value: int) -> int:
        if value < 0:
            raise ValueError("weekly_premium_goal must be >= 0")
        if value > 1_000_000:
            raise ValueError("weekly_premium_goal must be <= 1,000,000")
        return value

    @field_validator("name", "role")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized

    @field_validator(
        "avatar_url",
        "avatar_preset",
        "avatar_color",
        "avatar_frame",
        "status_effect",
        "nickname",
        "title",
    )
    @classmethod
    def normalize_optional_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_preset: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_frame: Optional[str] = None
    status_effect: Optional[str] = None
    nickname: Optional[str] = None
    title: Optional[str] = None
    active: Optional[bool] = None
    weekly_premium_goal: Optional[int] = None

    @field_validator("weekly_premium_goal")
    @classmethod
    def validate_goal_optional(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if value < 0:
            raise ValueError("weekly_premium_goal must be >= 0")
        if value > 1_000_000:
            raise ValueError("weekly_premium_goal must be <= 1,000,000")
        return value

    @field_validator("name", "role")
    @classmethod
    def validate_optional_required_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("value must not be blank")
        return normalized

    @field_validator(
        "avatar_url",
        "avatar_preset",
        "avatar_color",
        "avatar_frame",
        "status_effect",
        "nickname",
        "title",
    )
    @classmethod
    def normalize_optional_update_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AgentRead(AgentBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
