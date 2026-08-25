import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Queue, QueueToken, StaffUser, UserRole, TokenStatus
from app.schemas.queue import (
    QueueTokenOut,
    QueuePauseRequest,
    QueueOut,
    QueueSummaryOut,
)
from app.domain.queue.service import QueueDomainService
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()


@router.post("/queues/{queue_id}/call-next", response_model=Optional[QueueTokenOut], summary="1-Click Call Next Patient")
async def call_next_patient(
    queue_id: uuid.UUID,
    auto_complete_current: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Doctor 1-click action: Completes currently serving patient and calls the next eligible patient in queue.
    """
    service = QueueDomainService(db)
    next_token = await service.call_next(
        queue_id=queue_id,
        actor_user_id=current_user.id,
        auto_complete_current=auto_complete_current,
    )
    await db.commit()
    if next_token:
        await db.refresh(next_token)
    return next_token


@router.post("/tokens/{token_id}/start-serving", response_model=QueueTokenOut, summary="Doctor Starts Consultation")
async def start_serving_patient(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Transitions token from CALLED to SERVING when patient enters doctor's room.
    """
    service = QueueDomainService(db)
    token = await service.mark_serving(token_id=token_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(token)
    return token


@router.post("/tokens/{token_id}/complete", response_model=QueueTokenOut, summary="Complete Consultation")
async def complete_consultation(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Finishes patient consultation (SERVING -> COMPLETED).
    """
    service = QueueDomainService(db)
    token = await service.complete_token(token_id=token_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(token)
    return token


@router.post("/tokens/{token_id}/skip", response_model=QueueTokenOut, summary="Skip Called Patient")
async def skip_patient(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Skips called patient (CALLED -> SKIPPED).
    """
    service = QueueDomainService(db)
    token = await service.skip_token(token_id=token_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(token)
    return token


@router.post("/tokens/{token_id}/missed", response_model=QueueTokenOut, summary="Mark Called Patient as Missed")
async def mark_patient_missed(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Marks patient as missed when they fail to respond (CALLED -> MISSED).
    """
    service = QueueDomainService(db)
    token = await service.mark_missed(token_id=token_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(token)
    return token


@router.post("/tokens/{token_id}/rejoin", response_model=QueueTokenOut, summary="Rejoin Missed Patient to Queue")
async def rejoin_missed_patient(
    token_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Re-inserts a missed patient back into the active queue according to rejoin policy.
    """
    service = QueueDomainService(db)
    token = await service.rejoin_queue(token_id=token_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(token)
    return token


@router.post("/queues/{queue_id}/pause", response_model=QueueOut, summary="Pause Queue")
async def pause_queue_endpoint(
    queue_id: uuid.UUID,
    pause_in: QueuePauseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Pauses queue operations, recording the reason and expected resumption time.
    """
    service = QueueDomainService(db)
    await service.pause_queue(
        queue_id=queue_id,
        reason=pause_in.reason,
        expected_resume_minutes=pause_in.expected_resume_minutes,
        actor_user_id=current_user.id,
    )
    queue = await db.scalar(select(Queue).where(Queue.id == queue_id))
    await db.commit()
    await db.refresh(queue)
    return queue


@router.post("/queues/{queue_id}/resume", response_model=QueueOut, summary="Resume Queue")
async def resume_queue_endpoint(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.DOCTOR, UserRole.DOCTOR_ASSISTANT, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Resumes active queue operations.
    """
    service = QueueDomainService(db)
    queue = await service.resume_queue(queue_id=queue_id, actor_user_id=current_user.id)
    await db.commit()
    await db.refresh(queue)
    return queue
