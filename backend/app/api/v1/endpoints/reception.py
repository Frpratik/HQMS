import uuid
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models import (
    Hospital,
    Department,
    Branch,
    Queue,
    Patient,
    Visit,
    QueueToken,
    StaffUser,
    UserRole,
    TokenStatus,
    QueueStatus,
    Gender,
)
from app.schemas.queue import (
    QueueTokenCreateWalkIn,
    QueueTokenOut,
    QueueSummaryOut,
    QueueOut,
)
from app.schemas.patient import PatientOut
from app.domain.queue.service import QueueDomainService
from app.api.deps import get_current_active_user, get_optional_current_user, require_roles

router = APIRouter()


@router.post("/tokens/walk-in", response_model=QueueTokenOut, status_code=status.HTTP_201_CREATED, summary="Issue Walk-In Token")
async def issue_walk_in_token(
    walkin_in: QueueTokenCreateWalkIn,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(require_roles(UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
) -> Any:
    """
    Receptionist workflow: Registers patient (if new), creates visit, and atomically generates token.
    Enforces hospital tenant isolation.
    """
    # 1. Verify Queue belongs to receptionist's hospital
    query = (
        select(Queue)
        .join(Department, Queue.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(Queue.id == walkin_in.queue_id)
    )
    if current_user.role != UserRole.SUPER_ADMIN:
        query = query.where(Branch.hospital_id == current_user.hospital_id)

    queue = await db.scalar(query)
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found in this hospital")
    if queue.status == QueueStatus.CLOSED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot issue token for a closed queue")

    # 2. Find or create patient within this hospital
    h_id = uuid.UUID(str(current_user.hospital_id)) if current_user.hospital_id else queue.id
    b_id = uuid.UUID(str(current_user.branch_id)) if current_user.branch_id else None
    
    patient = None
    if walkin_in.patient_phone:
        patient = await db.scalar(
            select(Patient).where(
                and_(
                    Patient.hospital_id == h_id,
                    Patient.phone_number == walkin_in.patient_phone.strip(),
                )
            )
        )

    if not patient:
        patient = Patient(
            hospital_id=h_id,
            full_name=walkin_in.patient_name.strip(),
            phone_number=walkin_in.patient_phone.strip() if walkin_in.patient_phone else None,
            gender=walkin_in.patient_gender or Gender.UNSPECIFIED,
        )
        db.add(patient)
        await db.flush()

    # 3. Create Visit
    visit = Visit(
        patient_id=patient.id,
        hospital_id=h_id,
        branch_id=b_id,
        doctor_user_id=queue.doctor_user_id,
        notes=walkin_in.notes,
    )
    db.add(visit)
    await db.flush()

    # 4. Generate Token via Domain Service
    service = QueueDomainService(db)
    token = await service.create_token(
        queue_id=queue.id,
        visit_id=visit.id,
        patient_id=patient.id,
        priority=walkin_in.priority,
        initial_status=TokenStatus.READY,
        actor_user_id=current_user.id,
    )
    await db.commit()
    await db.refresh(token)
    return token


@router.get("/queues/{queue_id}/summary", response_model=QueueSummaryOut, summary="Get Live Queue Summary")
async def get_reception_queue_summary(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[StaffUser] = Depends(get_optional_current_user),
) -> Any:
    """
    Returns full live queue dashboard with role & tenant isolation:
    - Super Admin & Public TV: can view summary
    - Receptionist / Hospital Admin: can view any queue in their hospital
    - Doctor: can ONLY view queues assigned to them
    """
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found or access denied")

    tokens_res = await db.scalars(
        select(QueueToken)
        .where(QueueToken.queue_id == queue_id)
        .order_by(QueueToken.sequence_number)
    )
    all_tokens = list(tokens_res.all())

    serving_token = next((t for t in all_tokens if t.status == TokenStatus.SERVING), None)
    called_token = next((t for t in all_tokens if t.status == TokenStatus.CALLED), None)

    active_tokens = [
        t for t in all_tokens
        if t.status in (TokenStatus.WAITING, TokenStatus.READY, TokenStatus.AWAY, TokenStatus.RETURNING)
    ]
    # Sort active tokens by operational position
    active_tokens.sort(key=lambda x: x.operational_position or 999999)

    total_waiting = sum(1 for t in all_tokens if t.status == TokenStatus.WAITING)
    total_ready = sum(1 for t in all_tokens if t.status == TokenStatus.READY)
    total_away = sum(1 for t in all_tokens if t.status == TokenStatus.AWAY)
    total_completed = sum(1 for t in all_tokens if t.status == TokenStatus.COMPLETED)

    return {
        "queue": queue,
        "currently_serving_token": serving_token,
        "currently_called_token": called_token,
        "total_waiting": total_waiting,
        "total_ready": total_ready,
        "total_away": total_away,
        "total_completed_today": total_completed,
        "active_tokens": active_tokens,
    }


@router.get("/patients/search", response_model=List[PatientOut], summary="Search Patients")
async def search_patients(
    query: str,
    db: AsyncSession = Depends(get_db),
    current_user: StaffUser = Depends(get_current_active_user),
) -> Any:
    """Search patients by name or phone number within the hospital."""
    q_str = f"%{query.strip()}%"
    result = await db.scalars(
        select(Patient)
        .where(
            and_(
                Patient.hospital_id == current_user.hospital_id,
                (Patient.full_name.ilike(q_str) | Patient.phone_number.ilike(q_str)),
            )
        )
        .limit(20)
    )
    return list(result.all())
