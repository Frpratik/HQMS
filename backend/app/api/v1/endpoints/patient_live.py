from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models import (
    QueueToken,
    Queue,
    Department,
    Room,
    StaffUser,
    TokenStatus,
    QueueStatus,
)
from app.schemas.patient_live import PatientLiveTokenView
from app.domain.queue.service import QueueDomainService
from app.domain.queue.eta_calculator import ETACalculator

router = APIRouter()


async def _resolve_patient_live_view(token: QueueToken, db: AsyncSession) -> PatientLiveTokenView:
    """Helper constructing the enriched live patient queue view."""
    # Fetch queue
    queue = await db.scalar(select(Queue).where(Queue.id == token.queue_id))
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated queue not found")

    # Fetch Department
    department = await db.scalar(select(Department).where(Department.id == queue.department_id))
    dept_name = department.name if department else "Outpatient Department"

    # Fetch Doctor
    doctor_name = None
    if queue.doctor_user_id:
        doctor = await db.scalar(select(StaffUser).where(StaffUser.id == queue.doctor_user_id))
        if doctor:
            doctor_name = doctor.full_name

    # Fetch Room
    room_number = None
    if queue.room_id:
        room = await db.scalar(select(Room).where(Room.id == queue.room_id))
        if room:
            room_number = f"Room {room.room_number}"

    # Fetch currently serving and called tokens
    active_tokens_res = await db.scalars(
        select(QueueToken)
        .where(
            and_(
                QueueToken.queue_id == queue.id,
                QueueToken.status.in_([
                    TokenStatus.WAITING,
                    TokenStatus.READY,
                    TokenStatus.AWAY,
                    TokenStatus.RETURNING,
                    TokenStatus.CALLED,
                    TokenStatus.SERVING,
                ]),
            )
        )
        .order_by(QueueToken.operational_position)
    )
    active_tokens = list(active_tokens_res.all())

    serving_token = next((t for t in active_tokens if t.status == TokenStatus.SERVING), None)
    called_token = next((t for t in active_tokens if t.status == TokenStatus.CALLED), None)

    # Calculate patients ahead
    if token.status in (TokenStatus.CALLED, TokenStatus.SERVING):
        patients_ahead = 0
    elif token.operational_position:
        patients_ahead = max(0, token.operational_position - 1)
    else:
        patients_ahead = 0

    # Calculate ETA display
    is_paused = queue.status == QueueStatus.PAUSED
    min_w, max_w, eta_display = ETACalculator.calculate_wait_range(
        patients_ahead=patients_ahead,
        avg_consult_min=queue.default_consult_time_min,
        is_paused=is_paused,
    )

    # Generate patient action prompts and permitted controls
    can_mark_away = token.status in (TokenStatus.WAITING, TokenStatus.READY)
    can_mark_returning = token.status == TokenStatus.AWAY
    can_mark_ready = token.status in (TokenStatus.AWAY, TokenStatus.RETURNING)

    if token.status == TokenStatus.CALLED:
        action_prompt = f"YOUR TURN! Please proceed immediately to {room_number or 'Doctor Room'}."
    elif token.status == TokenStatus.SERVING:
        action_prompt = "Consultation in progress."
    elif token.status == TokenStatus.COMPLETED:
        action_prompt = "Your consultation has ended. Thank you!"
    elif token.status == TokenStatus.MISSED:
        action_prompt = "You missed your call. Please contact reception or request to rejoin the queue."
    elif token.status == TokenStatus.AWAY:
        action_prompt = "You are currently marked AWAY. Tap 'I am Returning' when heading back."
    elif token.status == TokenStatus.RETURNING:
        action_prompt = "You are marked RETURNING. Please confirm when you arrive in the waiting room."
    elif patients_ahead == 0:
        action_prompt = f"You are next in line! Please wait near {room_number or 'the consultation room'}."
    elif is_paused:
        action_prompt = "The doctor is currently attending an urgent case. The queue is temporarily paused."
    else:
        action_prompt = f"You are #{patients_ahead + 1} in line. Relax comfortably; we will alert you when your turn approaches."

    return PatientLiveTokenView(
        public_id=token.public_id,
        token_display_number=token.token_display_number,
        sequence_number=token.sequence_number,
        status=token.status,
        priority=token.priority,
        queue_id=queue.id,
        queue_name=queue.name,
        queue_status=queue.status,
        doctor_name=doctor_name,
        department_name=dept_name,
        room_number=room_number,
        currently_serving_token_number=serving_token.token_display_number if serving_token else None,
        currently_called_token_number=called_token.token_display_number if called_token else None,
        patients_ahead=patients_ahead,
        operational_position=token.operational_position,
        estimated_wait_min=token.estimated_wait_min or min_w,
        estimated_wait_max=token.estimated_wait_max or max_w,
        estimated_wait_display=eta_display,
        action_prompt=action_prompt,
        can_mark_away=can_mark_away,
        can_mark_returning=can_mark_returning,
        can_mark_ready=can_mark_ready,
        created_at=token.created_at,
        ready_at=token.ready_at,
        called_at=token.called_at,
        serving_at=token.serving_at,
        completed_at=token.completed_at,
    )


@router.get("/tokens/{public_id}", response_model=PatientLiveTokenView, summary="Get Live Patient Token Status")
async def get_patient_live_token(
    public_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Public unauthenticated endpoint for live mobile tracking via secure token link.
    """
    token = await db.scalar(select(QueueToken).where(QueueToken.public_id == public_id))
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")
    return await _resolve_patient_live_view(token, db)


@router.post("/tokens/{public_id}/away", response_model=PatientLiveTokenView, summary="Patient Marks Away")
async def patient_mark_away(
    public_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Patient self-action: Indicates they are stepping away from the waiting area.
    """
    token = await db.scalar(select(QueueToken).where(QueueToken.public_id == public_id))
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    service = QueueDomainService(db)
    token = await service.mark_patient_away(token_id=token.id)
    await db.commit()
    await db.refresh(token)
    return await _resolve_patient_live_view(token, db)


@router.post("/tokens/{public_id}/returning", response_model=PatientLiveTokenView, summary="Patient Marks Returning")
async def patient_mark_returning(
    public_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Patient self-action: Indicates they are heading back to the waiting area.
    """
    token = await db.scalar(select(QueueToken).where(QueueToken.public_id == public_id))
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    service = QueueDomainService(db)
    token = await service.mark_patient_returning(token_id=token.id)
    await db.commit()
    await db.refresh(token)
    return await _resolve_patient_live_view(token, db)


@router.post("/tokens/{public_id}/ready", response_model=PatientLiveTokenView, summary="Patient Confirms Back in Room")
async def patient_mark_ready(
    public_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Patient self-action: Confirms physical presence back in the waiting area.
    """
    token = await db.scalar(select(QueueToken).where(QueueToken.public_id == public_id))
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found")

    service = QueueDomainService(db)
    token = await service.mark_patient_ready(token_id=token.id)
    await db.commit()
    await db.refresh(token)
    return await _resolve_patient_live_view(token, db)
