from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict


Theme = Literal["corporate", "neon", "sports", "casino"]


class SettingsRead(BaseModel):
    theme: Theme
    current_agent_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SettingsUpdate(BaseModel):
    theme: Optional[Theme] = None
    current_agent_id: Optional[int] = None
