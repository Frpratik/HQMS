import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.enums import UserRole, QueueStatus
from app.models.queue import default_rejoin_policy


class DepartmentCreateIn(BaseModel):
    branch_id: Optional[uuid.UUID] = None
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=2, max_length=50)


class RoomCreateIn(BaseModel):
    department_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=255)
    room_number: str = Field(..., min_length=1, max_length=50)


class StaffInviteIn(BaseModel):
    branch_id: Optional[uuid.UUID] = None
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)
    role: UserRole = UserRole.DOCTOR


class QueueCreateIn(BaseModel):
    department_id: uuid.UUID
    doctor_user_id: Optional[uuid.UUID] = None
    room_id: Optional[uuid.UUID] = None
    name: str = Field(..., min_length=2, max_length=255)
    prefix: str = Field(..., min_length=1, max_length=10)
    default_consult_time_min: int = Field(10, ge=1, le=120)
    rejoin_policy: Optional[Dict[str, Any]] = Field(default_factory=default_rejoin_policy)


class DepartmentItemOut(BaseModel):

    id: uuid.UUID
    branch_id: uuid.UUID
    name: str
    code: str
    room_count: int
    queue_count: int

    model_config = ConfigDict(from_attributes=True)


class RoomItemOut(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    name: str
    room_number: str

    model_config = ConfigDict(from_attributes=True)


class StaffItemOut(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    phone_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueItemOut(BaseModel):
    id: uuid.UUID
    department_id: uuid.UUID
    department_name: Optional[str] = None
    doctor_user_id: Optional[uuid.UUID] = None
    doctor_name: Optional[str] = None
    room_id: Optional[uuid.UUID] = None
    room_number: Optional[str] = None
    name: str
    prefix: str
    status: QueueStatus
    default_consult_time_min: int
    current_sequence: int

    model_config = ConfigDict(from_attributes=True)


class HospitalAdminOverviewOut(BaseModel):
    hospital_id: uuid.UUID
    hospital_name: str
    hospital_slug: str
    branches: List[dict]
    departments: List[DepartmentItemOut]
    rooms: List[RoomItemOut]
    staff: List[StaffItemOut]
    queues: List[QueueItemOut]
