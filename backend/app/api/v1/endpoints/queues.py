import uuid
from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Queue, StaffUser, UserRole
from app.schemas.queue import QueueCreate, QueueOut, QueueUpdate
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()


@router.post("/", response_model=QueueOut, status_code=status.HTTP_201_CREATED, summary="Create Queue")
async def create_queue(
    queue_in: QueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.RECEPTIONIST)),
) -> Any:
    """Create a new clinical queue."""
    queue = Queue(**queue_in.model_dump())
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    return queue


@router.get("/", response_model=List[QueueOut], summary="List Queues")
async def list_queues(
    department_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(get_current_active_user),
) -> Any:
    """List queues optionally filtered by department."""
    query = select(Queue)
    if department_id:
        query = query.where(Queue.department_id == department_id)
    result = await db.scalars(query.order_by(Queue.name))
    return list(result.all())


@router.get("/{queue_id}", response_model=QueueOut, summary="Get Queue Details")
async def get_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(get_current_active_user),
) -> Any:
    """Fetch queue details by ID."""
    queue = await db.scalar(select(Queue).where(Queue.id == queue_id))
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")
    return queue
