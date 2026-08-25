import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class HospitalBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=50)
    is_active: bool = True


class HospitalCreate(HospitalBase):
    pass


class HospitalOut(HospitalBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BranchBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True


class BranchCreate(BranchBase):
    hospital_id: uuid.UUID


class BranchOut(BranchBase):
    id: uuid.UUID
    hospital_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True


class DepartmentCreate(DepartmentBase):
    branch_id: uuid.UUID


class DepartmentOut(DepartmentBase):
    id: uuid.UUID
    branch_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoomBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    room_number: str = Field(..., min_length=1, max_length=50)
    is_active: bool = True


class RoomCreate(RoomBase):
    department_id: uuid.UUID


class RoomOut(RoomBase):
    id: uuid.UUID
    department_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
