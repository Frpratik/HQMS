import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import QueueStatus, TokenStatus, PriorityLevel, Gender


class QueueBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    prefix: str = Field("A", min_length=1, max_length=10)
    default_consult_time_min: int = Field(10, ge=1, le=120)
    rejoin_policy: Dict[str, Any] = Field(
        default_factory=lambda: {
            "strategy": "OFFSET_BEHIND_CURRENT",
            "offset": 2,
            "max_rejoins": 2,
        }
    )


class QueueCreate(QueueBase):
    department_id: uuid.UUID
    doctor_user_id: Optional[uuid.UUID] = None
    room_id: Optional[uuid.UUID] = None


class QueueUpdate(BaseModel):
    name: Optional[str] = None
    prefix: Optional[str] = None
    doctor_user_id: Optional[uuid.UUID] = None
    room_id: Optional[uuid.UUID] = None
    default_consult_time_min: Optional[int] = None
    rejoin_policy: Optional[Dict[str, Any]] = None
    status: Optional[QueueStatus] = None


class QueueOut(QueueBase):
    id: uuid.UUID
    department_id: uuid.UUID
    doctor_user_id: Optional[uuid.UUID] = None
    room_id: Optional[uuid.UUID] = None
    status: QueueStatus
    current_sequence: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueTokenOut(BaseModel):
    id: uuid.UUID
    public_id: str
    queue_id: uuid.UUID
    visit_id: uuid.UUID
    patient_id: uuid.UUID
    token_display_number: str
    sequence_number: int
    priority: PriorityLevel
    status: TokenStatus
    operational_position: Optional[int] = None
    estimated_wait_min: Optional[int] = None
    estimated_wait_max: Optional[int] = None
    missed_count: int
    rejoin_count: int
    created_at: datetime
    ready_at: Optional[datetime] = None
    called_at: Optional[datetime] = None
    serving_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class QueueTokenCreateWalkIn(BaseModel):
    queue_id: uuid.UUID
    # Patient Information (auto finds or creates patient)
    patient_name: str = Field(..., min_length=2, max_length=255)
    patient_phone: Optional[str] = Field(None, max_length=50)
    patient_gender: Gender = Gender.UNSPECIFIED
    # Consultation details
    priority: PriorityLevel = PriorityLevel.NORMAL
    notes: Optional[str] = None


class QueuePauseRequest(BaseModel):
    reason: str = Field(..., min_length=2, max_length=255)
    expected_resume_minutes: Optional[int] = Field(None, ge=1, le=240)


class QueueSummaryOut(BaseModel):
    queue: QueueOut
    currently_serving_token: Optional[QueueTokenOut] = None
    currently_called_token: Optional[QueueTokenOut] = None
    total_waiting: int
    total_ready: int
    total_away: int
    total_completed_today: int
    active_tokens: List[QueueTokenOut]
