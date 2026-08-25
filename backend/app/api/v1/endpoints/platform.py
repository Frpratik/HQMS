import uuid
import re
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models import Hospital, Branch, Department, Room, Queue, StaffUser, UserRole, QueueStatus
from app.schemas.platform import (
    HospitalProvisionCreate,
    HospitalProvisionOut,
    HospitalSummaryOut,
    HospitalStatusUpdate,
)
from app.api.deps import require_roles

router = APIRouter()


def slugify(text: str) -> str:
    """Converts hospital name to a clean URL slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


@router.post(
    "/hospitals",
    response_model=HospitalProvisionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Provision New Hospital Tenant (Super Admin)",
)
async def provision_hospital(
    hospital_in: HospitalProvisionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Atomic 1-click onboarding for new hospital tenants.
    Provisions:
    1. Hospital record
    2. Default Primary Branch
    3. Initial OPD Department & Room
    4. Default Live Queue
    5. Primary Hospital Admin user account
    """
    # 1. Resolve and validate Slug
    raw_slug = hospital_in.slug or slugify(hospital_in.name)
    slug = slugify(raw_slug)
    if not slug:
        slug = f"hospital-{uuid.uuid4().hex[:8]}"

    existing_slug = await db.scalar(select(Hospital).where(Hospital.slug == slug))
    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hospital with slug '{slug}' already exists. Please choose a different name or slug.",
        )

    # 2. Validate Admin Email uniqueness
    existing_email = await db.scalar(
        select(StaffUser).where(StaffUser.email == hospital_in.admin_email.lower().strip())
    )
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A staff user account with email '{hospital_in.admin_email}' already exists.",
        )

    # 3. Create Hospital Tenant Record
    hospital = Hospital(
        name=hospital_in.name.strip(),
        slug=slug,
        address=hospital_in.address,
        phone=hospital_in.phone,
        is_active=True,
    )
    db.add(hospital)
    await db.flush()

    # 4. Create Default Branch
    branch = Branch(
        hospital_id=hospital.id,
        name=hospital_in.branch_name.strip(),
        code="MAIN",
        is_active=True,
    )
    db.add(branch)
    await db.flush()

    # 5. Create Initial Department
    dept = Department(
        branch_id=branch.id,
        name=hospital_in.department_name.strip(),
        code=hospital_in.department_code.strip().upper(),
        is_active=True,
    )
    db.add(dept)
    await db.flush()

    # 6. Create Initial Consultation Room
    room = Room(
        department_id=dept.id,
        name="Room 101",
        room_number="101",
        is_active=True,
    )
    db.add(room)
    await db.flush()

    # 7. Create Default Live Queue
    queue = Queue(
        department_id=dept.id,
        room_id=room.id,
        name=f"{hospital_in.department_name} Queue",
        prefix=hospital_in.department_code.strip().upper(),
        status=QueueStatus.OPEN,
        default_consult_time_min=10,
        current_sequence=0,
    )
    db.add(queue)
    await db.flush()

    # 8. Create Primary Hospital Admin Staff Account
    admin_user = StaffUser(
        hospital_id=hospital.id,
        branch_id=branch.id,
        email=hospital_in.admin_email.lower().strip(),
        hashed_password=get_password_hash(hospital_in.admin_password),
        full_name=hospital_in.admin_name.strip(),
        phone_number=hospital_in.admin_phone,
        role=UserRole.HOSPITAL_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(hospital)

    return {
        "id": hospital.id,
        "name": hospital.name,
        "slug": hospital.slug,
        "is_active": hospital.is_active,
        "admin_user_id": admin_user.id,
        "admin_email": admin_user.email,
        "default_branch_id": branch.id,
        "default_department_id": dept.id,
        "default_queue_id": queue.id,
        "created_at": hospital.created_at,
    }


@router.get(
    "/hospitals",
    response_model=List[HospitalSummaryOut],
    summary="List All Hospital Tenants (Super Admin)",
)
async def list_hospitals(
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Lists all hospital tenants with aggregate entity counts.
    """
    hospitals = (await db.scalars(select(Hospital).order_by(Hospital.created_at.desc()))).all()
    results = []
    for h in hospitals:
        branch_count = await db.scalar(
            select(func.count(Branch.id)).where(Branch.hospital_id == h.id)
        ) or 0
        staff_count = await db.scalar(
            select(func.count(StaffUser.id)).where(StaffUser.hospital_id == h.id)
        ) or 0
        queue_count = await db.scalar(
            select(func.count(Queue.id))
            .join(Department)
            .join(Branch)
            .where(Branch.hospital_id == h.id)
        ) or 0

        results.append(
            HospitalSummaryOut(
                id=h.id,
                name=h.name,
                slug=h.slug,
                is_active=h.is_active,
                address=h.address,
                phone=h.phone,
                branch_count=branch_count,
                staff_count=staff_count,
                queue_count=queue_count,
                created_at=h.created_at,
            )
        )
    return results


@router.patch(
    "/hospitals/{hospital_id}/status",
    response_model=HospitalSummaryOut,
    summary="Update Hospital Active Status (Super Admin)",
)
async def update_hospital_status(
    hospital_id: uuid.UUID,
    status_in: HospitalStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Activate or suspend a hospital tenant organization.
    """
    hospital = await db.scalar(select(Hospital).where(Hospital.id == hospital_id))
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital tenant not found")

    hospital.is_active = status_in.is_active
    await db.commit()
    await db.refresh(hospital)

    branch_count = await db.scalar(
        select(func.count(Branch.id)).where(Branch.hospital_id == hospital.id)
    ) or 0
    staff_count = await db.scalar(
        select(func.count(StaffUser.id)).where(StaffUser.hospital_id == hospital.id)
    ) or 0
    queue_count = await db.scalar(
        select(func.count(Queue.id))
        .join(Department)
        .join(Branch)
        .where(Branch.hospital_id == hospital.id)
    ) or 0

    return HospitalSummaryOut(
        id=hospital.id,
        name=hospital.name,
        slug=hospital.slug,
        is_active=hospital.is_active,
        address=hospital.address,
        phone=hospital.phone,
        branch_count=branch_count,
        staff_count=staff_count,
        queue_count=queue_count,
        created_at=hospital.created_at,
    )
