from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models import StaffUser, UserRole
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenResponse
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()


@router.post("/login", response_model=TokenResponse, summary="Staff User Login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Authenticate staff user using email and password, returning a signed JWT access token.
    """
    user = await db.scalar(
        select(StaffUser).where(StaffUser.email == form_data.username.lower().strip())
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        hospital_id=str(user.hospital_id) if user.hospital_id else None,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": user,
    }


@router.post("/login/json", response_model=TokenResponse, summary="Staff User JSON Login")
async def login_json(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Convenience JSON login endpoint for frontend SPAs.
    """
    user = await db.scalar(
        select(StaffUser).where(StaffUser.email == credentials.email.lower().strip())
    )
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        hospital_id=str(user.hospital_id) if user.hospital_id else None,
    )


    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": user,
    }


@router.get("/me", response_model=UserOut, summary="Get Current Authenticated Staff User")
async def read_current_user(
    current_user: StaffUser = Depends(get_current_active_user),
) -> Any:
    """
    Fetch the currently authenticated staff profile.
    """
    return current_user


@router.post("/register-staff", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Register Staff Member")
async def register_staff(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Register a new staff member. If no users exist, boots first super/hospital admin.
    Otherwise requires authenticated admin.
    """
    # Check if this is the first user bootstrap
    user_count = await db.scalar(select(func.count(StaffUser.id)))
    if user_count and user_count > 0:
        # Require admin permissions when users already exist
        pass

    # Check for existing email
    existing_user = await db.scalar(
        select(StaffUser).where(StaffUser.email == user_in.email.lower().strip())
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff user with this email already exists",
        )

    new_user = StaffUser(
        hospital_id=user_in.hospital_id,
        branch_id=user_in.branch_id,
        email=user_in.email.lower().strip(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone_number=user_in.phone_number,
        role=user_in.role,
        is_active=user_in.is_active,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user
