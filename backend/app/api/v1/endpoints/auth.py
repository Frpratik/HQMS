import uuid
import re
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models import Hospital, Branch, Department, Room, Queue, StaffUser, UserRole, QueueStatus
from app.schemas.user import UserCreate, UserLogin, UserOut, TokenResponse, HospitalRegisterRequest
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
    email_clean = form_data.username.lower().strip()
    user = await db.scalar(
        select(StaffUser).where(StaffUser.email == email_clean)
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff user account is deactivated. Please contact your Hospital Administrator.",
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
    email_clean = credentials.email.lower().strip()
    user = await db.scalar(
        select(StaffUser).where(StaffUser.email == email_clean)
    )
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please verify your credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff user account is deactivated. Please contact your Hospital Administrator.",
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


@router.post("/register-hospital", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="Self-Register Hospital / Clinic")
async def register_hospital(
    req: HospitalRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Public Onboarding Endpoint:
    Allows healthcare facilities to self-register. Atomically provisions:
    1. Hospital Tenant
    2. Main OPD Branch & Initial Department
    3. Initial Examination Room & Queue
    4. Hospital Administrator account
    Returns signed JWT access token for immediate login.
    """
    email_clean = req.admin_email.lower().strip()

    # 1. Check if email already registered
    existing_user = await db.scalar(
        select(StaffUser).where(StaffUser.email == email_clean)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An administrator account with this work email already exists.",
        )

    # 2. Generate unique slug for hospital
    base_slug = re.sub(r"[^a-z0-9]+", "-", req.hospital_name.lower().strip()).strip("-")
    slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    # 3. Create Hospital Tenant
    hospital = Hospital(
        name=req.hospital_name.strip(),
        slug=slug,
        address=req.address.strip() if req.address else None,
        phone=req.phone_number.strip() if req.phone_number else None,
        tagline=req.tagline.strip() if req.tagline else "Smart Outpatient Management",
        primary_color="#047857",
        accent_color="#10b981",
    )
    db.add(hospital)
    await db.flush()

    # 4. Create Main Branch
    branch = Branch(
        hospital_id=hospital.id,
        name="Main OPD Wing",
        code="MAIN",
        is_active=True,
    )
    db.add(branch)
    await db.flush()

    # 5. Create Default Department & Room
    dept = Department(
        branch_id=branch.id,
        name="General Medicine OPD",
        code="GEN",
    )
    db.add(dept)
    await db.flush()

    room = Room(
        department_id=dept.id,
        name="Consultation Cabin 1",
        room_number="101",
    )
    db.add(room)
    await db.flush()

    # 6. Create Hospital Admin User
    admin_user = StaffUser(
        hospital_id=hospital.id,
        branch_id=branch.id,
        email=email_clean,
        hashed_password=get_password_hash(req.admin_password),
        full_name=req.admin_name.strip(),
        phone_number=req.phone_number.strip() if req.phone_number else None,
        role=UserRole.HOSPITAL_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.flush()

    # 7. Create Default Starter Queue
    starter_queue = Queue(
        department_id=dept.id,
        room_id=room.id,
        name="General OPD Queue",
        prefix="GEN",
        status=QueueStatus.OPEN,
        default_consult_time_min=10,
    )
    db.add(starter_queue)
    await db.commit()
    await db.refresh(admin_user)

    # 8. Generate JWT Token
    access_token = create_access_token(
        subject=str(admin_user.id),
        role=admin_user.role.value,
        hospital_id=str(admin_user.hospital_id),
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in_minutes": settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        "user": admin_user,
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
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Register a new staff member within the hospital.
    """
    email_clean = user_in.email.lower().strip()
    existing_user = await db.scalar(
        select(StaffUser).where(StaffUser.email == email_clean)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A staff user with this work email already exists.",
        )

    new_user = StaffUser(
        hospital_id=current_user.hospital_id if current_user.role != UserRole.SUPER_ADMIN else user_in.hospital_id,
        branch_id=user_in.branch_id,
        email=email_clean,
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
