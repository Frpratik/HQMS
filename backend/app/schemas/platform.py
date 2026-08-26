import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class HospitalProvisionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Official Hospital Name")
    slug: Optional[str] = Field(None, min_length=2, max_length=100, description="Unique URL slug (e.g. apollo-care)")
    admin_name: str = Field(..., min_length=2, max_length=255, description="Initial Hospital Admin Full Name")
    admin_email: EmailStr = Field(..., description="Hospital Admin Login Email")
    admin_password: str = Field(..., min_length=6, description="Initial Admin Password")
    admin_phone: Optional[str] = Field(None, max_length=50)
    branch_name: str = Field("Main Facility", max_length=255, description="Default primary branch name")
    department_name: str = Field("General OPD", max_length=255, description="Initial OPD department")
    department_code: str = Field("OPD", max_length=50, description="Department code")
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=50)


class HospitalProvisionOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    admin_user_id: uuid.UUID
    admin_email: str
    default_branch_id: uuid.UUID
    default_department_id: uuid.UUID
    default_queue_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HospitalSummaryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    is_active: bool
    address: Optional[str] = None
    phone: Optional[str] = None
    branch_count: int = 0
    staff_count: int = 0
    queue_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HospitalStatusUpdate(BaseModel):
    is_active: bool


class HospitalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

