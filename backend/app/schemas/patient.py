import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.enums import Gender


class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=50)
    gender: Gender = Gender.UNSPECIFIED
    date_of_birth: Optional[date] = None


class PatientCreate(PatientBase):
    hospital_id: uuid.UUID


class PatientOut(PatientBase):
    id: uuid.UUID
    hospital_id: uuid.UUID
    public_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VisitCreate(BaseModel):
    patient_id: uuid.UUID
    hospital_id: uuid.UUID
    branch_id: Optional[uuid.UUID] = None
    doctor_user_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class VisitOut(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    hospital_id: uuid.UUID
    branch_id: Optional[uuid.UUID] = None
    doctor_user_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
