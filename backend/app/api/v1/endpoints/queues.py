import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Queue, StaffUser, UserRole, Department, Branch
from app.schemas.queue import QueueCreate, QueueOut, QueueUpdate
from app.api.deps import get_current_active_user, get_optional_current_user, require_roles

router = APIRouter()


@router.post("/", response_model=QueueOut, status_code=status.HTTP_201_CREATED, summary="Create Queue")
async def create_queue(
    queue_in: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.RECEPTIONIST)),
) -> Any:
    """Create a new clinical queue."""
    # Verify department exists and belongs to user's hospital (if not super admin)
    dept_query = select(Department).join(Branch, Department.branch_id == Branch.id).where(Department.id == queue_in.department_id)
    if current_user.role != UserRole.SUPER_ADMIN:
        dept_query = dept_query.where(Branch.hospital_id == current_user.hospital_id)

    dept = await db.scalar(dept_query)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in this hospital")

    queue = Queue(**queue_in.model_dump())
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    return queue


@router.get("/", response_model=List[QueueOut], summary="List Queues")
async def list_queues(
    department_id: uuid.UUID | None = None,
    hospital_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[StaffUser] = Depends(get_optional_current_user),
) -> Any:
    """
    List queues with strict tenant and role isolation:
    - Super Admin: sees all queues or filtered by department/hospital
    - Hospital Admin / Receptionist: sees all queues in their hospital
    - Doctor / Doctor Assistant: sees ONLY queues assigned to them in their hospital
    - Unauthenticated: sees queues for public display
    """
    query = (
        select(Queue)
        .join(Department, Queue.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
    )

    if current_user:
        if current_user.role == UserRole.SUPER_ADMIN:
            if hospital_id:
                query = query.where(Branch.hospital_id == hospital_id)
            if department_id:
                query = query.where(Queue.department_id == department_id)
        elif current_user.role in (UserRole.HOSPITAL_ADMIN, UserRole.RECEPTIONIST):
            query = query.where(Branch.hospital_id == current_user.hospital_id)
            if department_id:
                query = query.where(Queue.department_id == department_id)
        elif current_user.role in (UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT):
            query = query.where(
                Branch.hospital_id == current_user.hospital_id,
                Queue.doctor_user_id == current_user.id,
            )
            if department_id:
                query = query.where(Queue.department_id == department_id)
    else:
        # Public unauthenticated
        if hospital_id:
            query = query.where(Branch.hospital_id == hospital_id)
        if department_id:
            query = query.where(Queue.department_id == department_id)

    result = await db.scalars(query.order_by(Queue.name))
    return list(result.all())


@router.get("/{queue_id}", response_model=QueueOut, summary="Get Queue Details")
async def get_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[StaffUser] = Depends(get_optional_current_user),
) -> Any:
    """Fetch queue details with role and tenant isolation."""
    query = (
        select(Queue)
        .join(Department, Queue.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(Queue.id == queue_id)
    )
    if current_user:
        if current_user.role in (UserRole.HOSPITAL_ADMIN, UserRole.RECEPTIONIST):
            query = query.where(Branch.hospital_id == current_user.hospital_id)
        elif current_user.role in (UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT):
            query = query.where(
                Branch.hospital_id == current_user.hospital_id,
                Queue.doctor_user_id == current_user.id,
            )

    queue = await db.scalar(query)
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")
    return queue
