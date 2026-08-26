import uuid
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from app.models.enums import UserRole


def validate_strong_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter (A-Z)")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter (a-z)")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one number (0-9)")
    if not re.search(r"[@$!%*?&#^_\-+=~]", password):
        raise ValueError("Password must contain at least one special character (@$!%*?&#^_-+=~)")
    return password


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=50)
    role: UserRole = UserRole.RECEPTIONIST
    is_active: bool = True


class UserCreate(UserBase):
    hospital_id: uuid.UUID
    branch_id: Optional[uuid.UUID] = None
    password: str = Field(..., min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_strong_password(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class HospitalRegisterRequest(BaseModel):
    hospital_name: str = Field(..., min_length=3, max_length=255)
    admin_name: str = Field(..., min_length=2, max_length=255)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=8, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    tagline: Optional[str] = Field(None, max_length=255)

    @field_validator("admin_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_strong_password(v)


class UserOut(UserBase):
    id: uuid.UUID
    hospital_id: Optional[uuid.UUID] = None
    branch_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserOut


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None
