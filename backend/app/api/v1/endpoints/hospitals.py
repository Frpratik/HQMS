import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Hospital, Branch, Department, Room, StaffUser, UserRole
from app.schemas.hospital import (
    HospitalCreate,
    HospitalOut,
    BranchCreate,
    BranchOut,
    DepartmentCreate,
    DepartmentOut,
    RoomCreate,
    RoomOut,
)
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()


@router.post("/", response_model=HospitalOut, status_code=status.HTTP_201_CREATED, summary="Create Hospital")
async def create_hospital(
    hospital_in: HospitalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
) -> Any:
    """Create a new hospital tenant."""
    existing = await db.scalar(select(Hospital).where(Hospital.slug == hospital_in.slug))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hospital with this slug already exists",
        )
    hospital = Hospital(**hospital_in.model_dump())
    db.add(hospital)
    await db.commit()
    await db.refresh(hospital)
    return hospital


@router.get("/", response_model=List[HospitalOut], summary="List Hospitals")
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(get_current_active_user),
) -> Any:
    """List all registered hospitals."""
    result = await db.scalars(select(Hospital).order_by(Hospital.name))
    return list(result.all())


@router.post("/branches", response_model=BranchOut, status_code=status.HTTP_201_CREATED, summary="Create Branch")
async def create_branch(
    branch_in: BranchCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
) -> Any:
    """Create a new hospital branch campus."""
    branch = Branch(**branch_in.model_dump())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    return branch


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED, summary="Create Department")
async def create_department(
    dept_in: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
) -> Any:
    """Create a clinical department within a branch."""
    department = Department(**dept_in.model_dump())
    db.add(department)
    await db.commit()
    await db.refresh(department)
    return department


@router.post("/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED, summary="Create Room")
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN)),
) -> Any:
    """Create a consultation room/counter in a department."""
    room = Room(**room_in.model_dump())
    db.add(room)
    await db.commit()
    await db.refresh(room)
    return room
