import pytest
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import (
    Hospital,
    Branch,
    Department,
    Room,
    StaffUser,
    Patient,
    Visit,
    Queue,
    QueueToken,
    QueueEvent,
    QueuePause,
    UserRole,
    Gender,
    QueueStatus,
    TokenStatus,
    PriorityLevel,
    QueueEventType,
)


@pytest.mark.asyncio
async def test_full_domain_models_lifecycle(db_session: AsyncSession):
    """Verify creation, relationship resolution, and persistence of core domain models."""
    # 1. Create Hospital
    hospital = Hospital(
        name="City Care Hospital",
        slug="city-care-hospital",
        address="123 Health Ave, Metro City",
        phone="+919876543210",
    )
    db_session.add(hospital)
    await db_session.flush()
    assert hospital.id is not None
    assert hospital.is_active is True

    # 2. Create Branch
    branch = Branch(
        hospital_id=hospital.id,
        name="Main Campus",
        code="MAIN",
    )
    db_session.add(branch)
    await db_session.flush()
    assert branch.hospital_id == hospital.id

    # 3. Create Department
    department = Department(
        branch_id=branch.id,
        name="Cardiology",
        code="CARD",
    )
    db_session.add(department)
    await db_session.flush()

    # 4. Create Room
    room = Room(
        department_id=department.id,
        name="Consultation Room 1",
        room_number="101",
    )
    db_session.add(room)
    await db_session.flush()

    # 5. Create Staff Users (Doctor & Receptionist)
    doctor = StaffUser(
        hospital_id=hospital.id,
        branch_id=branch.id,
        email="dr.sharma@hospital.com",
        hashed_password="hashed_argon2_password_string",
        full_name="Dr. Alok Sharma",
        phone_number="+919876500001",
        role=UserRole.DOCTOR,
    )
    receptionist = StaffUser(
        hospital_id=hospital.id,
        branch_id=branch.id,
        email="reception@hospital.com",
        hashed_password="hashed_argon2_password_string",
        full_name="Priya Patel",
        phone_number="+919876500002",
        role=UserRole.RECEPTIONIST,
    )
    db_session.add_all([doctor, receptionist])
    await db_session.flush()

    # 6. Create Queue
    queue = Queue(
        department_id=department.id,
        doctor_user_id=doctor.id,
        room_id=room.id,
        name="Dr. Sharma Cardiology Queue",
        prefix="CARD",
        status=QueueStatus.OPEN,
        default_consult_time_min=12,
        current_sequence=1,
    )
    db_session.add(queue)
    await db_session.flush()
    assert queue.rejoin_policy["offset"] == 2

    # 7. Create Patient & Visit
    patient = Patient(
        hospital_id=hospital.id,
        full_name="Rahul Kumar",
        phone_number="+919811122233",
        gender=Gender.MALE,
        date_of_birth=date(1985, 4, 12),
    )
    db_session.add(patient)
    await db_session.flush()
    assert len(patient.public_id) >= 16

    visit = Visit(
        patient_id=patient.id,
        hospital_id=hospital.id,
        branch_id=branch.id,
        doctor_user_id=doctor.id,
        notes="Regular heart checkup",
    )
    db_session.add(visit)
    await db_session.flush()

    # 8. Create QueueToken
    token = QueueToken(
        queue_id=queue.id,
        visit_id=visit.id,
        patient_id=patient.id,
        token_display_number="CARD-001",
        sequence_number=1,
        priority=PriorityLevel.NORMAL,
        status=TokenStatus.READY,
        operational_position=1,
        estimated_wait_min=0,
        estimated_wait_max=12,
    )
    db_session.add(token)
    await db_session.flush()
    assert len(token.public_id) >= 20

    # 9. Create QueueEvent
    event = QueueEvent(
        queue_id=queue.id,
        token_id=token.id,
        actor_user_id=receptionist.id,
        event_type=QueueEventType.TOKEN_CREATED,
        to_status=TokenStatus.READY,
        event_data={"source": "walk_in_reception"},
    )
    db_session.add(event)
    await db_session.flush()

    # 10. Create QueuePause
    pause = QueuePause(
        queue_id=queue.id,
        paused_by_user_id=doctor.id,
        reason="Doctor attending emergency ward",
    )
    db_session.add(pause)
    await db_session.commit()

    # Verification Queries
    fetched_token = await db_session.scalar(
        select(QueueToken).where(QueueToken.id == token.id)
    )
    assert fetched_token is not None
    assert fetched_token.token_display_number == "CARD-001"
    assert fetched_token.status == TokenStatus.READY
    assert fetched_token.priority == PriorityLevel.NORMAL
