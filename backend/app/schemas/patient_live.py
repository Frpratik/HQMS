import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import TokenStatus, QueueStatus, PriorityLevel


class PatientLiveTokenView(BaseModel):
    public_id: str
    token_display_number: str
    sequence_number: int
    status: TokenStatus
    priority: PriorityLevel

    # Tenant Branding
    hospital_name: Optional[str] = None
    hospital_slug: Optional[str] = None
    hospital_logo_url: Optional[str] = None
    hospital_primary_color: Optional[str] = "#0d9488"
    hospital_accent_color: Optional[str] = "#14b8a6"
    hospital_tagline: Optional[str] = None

    # Queue & OPD Context
    queue_id: uuid.UUID
    queue_name: str
    queue_status: QueueStatus
    doctor_name: Optional[str] = None
    department_name: str
    room_number: Optional[str] = None


    # Live Queue Position & Wait Predictions
    currently_serving_token_number: Optional[str] = None
    currently_called_token_number: Optional[str] = None
    patients_ahead: int
    operational_position: Optional[int] = None
    estimated_wait_min: Optional[int] = None
    estimated_wait_max: Optional[int] = None
    estimated_wait_display: str

    # Status instructions & permitted self actions
    action_prompt: str
    can_mark_away: bool
    can_mark_returning: bool
    can_mark_ready: bool

    # Timestamps
    created_at: datetime
    ready_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    serving_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
