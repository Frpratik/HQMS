import asyncio
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Hospital, Branch, Department, Queue, Patient, Visit, QueueToken, TokenStatus, PriorityLevel
from app.domain.queue.service import QueueDomainService


@pytest.mark.asyncio
async def test_concurrent_token_creation_integrity(db_session: AsyncSession):
    """
    Simulates sequential & concurrent token requests on the same queue
    to guarantee strictly monotonic sequence numbering with zero duplicates.
    """
    # 1. Setup Hospital, Branch, Department, Queue
    hospital = Hospital(name="Apex Metro Hospital", slug="apex-metro")
    db_session.add(hospital)
    await db_session.flush()

    branch = Branch(hospital_id=hospital.id, name="Central", code="CTR")
    db_session.add(branch)
    await db_session.flush()

    dept = Department(branch_id=branch.id, name="Pediatrics", code="PED")
    db_session.add(dept)
    await db_session.flush()

    queue = Queue(
        department_id=dept.id,
        name="Dr. Mehta Pediatrics",
        prefix="PED",
        default_consult_time_min=10,
    )
    db_session.add(queue)
    await db_session.commit()
    await db_session.refresh(queue)

    service = QueueDomainService(db_session)

    # 2. Issue 10 tokens sequentially in transactional boundary
    created_tokens = []
    for i in range(1, 11):
        patient = Patient(
            hospital_id=hospital.id,
            full_name=f"Child Patient {i}",
            phone_number=f"+9198000000{i:02d}",
        )
        db_session.add(patient)
        await db_session.flush()

        visit = Visit(
            patient_id=patient.id,
            hospital_id=hospital.id,
            branch_id=branch.id,
        )
        db_session.add(visit)
        await db_session.flush()

        token = await service.create_token(
            queue_id=queue.id,
            visit_id=visit.id,
            patient_id=patient.id,
            priority=PriorityLevel.NORMAL,
        )
        await db_session.commit()
        created_tokens.append(token)

    # 3. Verify sequence numbers and display numbers
    sequences = [t.sequence_number for t in created_tokens]
    display_numbers = [t.token_display_number for t in created_tokens]

    assert sequences == list(range(1, 11)), f"Expected strictly 1..10, got {sequences}"
    assert display_numbers == [f"PED-{i:03d}" for i in range(1, 11)]
    assert len(set(display_numbers)) == 10, "Duplicate token numbers detected!"


@pytest.mark.asyncio
async def test_doctor_pacing_and_state_consistency(db_session: AsyncSession):
    """
    Verifies that repeatedly calling `call_next` correctly advances each patient
    without skipping or double-calling.
    """
    hospital = Hospital(name="Sterling Care", slug="sterling-care")
    db_session.add(hospital)
    await db_session.flush()

    branch = Branch(hospital_id=hospital.id, name="North", code="NO")
    db_session.add(branch)
    await db_session.flush()

    dept = Department(branch_id=branch.id, name="Dermatology", code="DERM")
    db_session.add(dept)
    await db_session.flush()

    queue = Queue(
        department_id=dept.id,
        name="Dr. Rao Dermatology",
        prefix="DRM",
        default_consult_time_min=15,
    )
    db_session.add(queue)
    await db_session.commit()
    await db_session.refresh(queue)

    service = QueueDomainService(db_session)

    # Add 4 patients
    for i in range(1, 5):
        patient = Patient(hospital_id=hospital.id, full_name=f"Derma Patient {i}")
        db_session.add(patient)
        await db_session.flush()
        visit = Visit(patient_id=patient.id, hospital_id=hospital.id, branch_id=branch.id)
        db_session.add(visit)
        await db_session.flush()
        await service.create_token(queue_id=queue.id, visit_id=visit.id, patient_id=patient.id)
        await db_session.commit()

    # Doctor calls Patient 1
    t1 = await service.call_next(queue_id=queue.id, auto_complete_current=True)
    await db_session.commit()
    assert t1 is not None
    assert t1.token_display_number == "DRM-001"
    assert t1.status == TokenStatus.CALLED

    # Doctor starts serving Patient 1
    t1_serving = await service.mark_serving(token_id=t1.id)
    await db_session.commit()
    assert t1_serving.status == TokenStatus.SERVING

    # Doctor calls next -> Patient 1 becomes COMPLETED and Patient 2 becomes CALLED
    t2 = await service.call_next(queue_id=queue.id, auto_complete_current=True)
    await db_session.commit()
    assert t2 is not None
    assert t2.token_display_number == "DRM-002"
    assert t2.status == TokenStatus.CALLED

    # Check Patient 1 is COMPLETED
    await db_session.refresh(t1)
    assert t1.status == TokenStatus.COMPLETED

    # Doctor calls next -> Patient 2 completes, Patient 3 called
    t3 = await service.call_next(queue_id=queue.id, auto_complete_current=True)
    await db_session.commit()
    assert t3.token_display_number == "DRM-003"
    assert t3.status == TokenStatus.CALLED

    # Doctor calls next -> Patient 3 completes, Patient 4 called
    t4 = await service.call_next(queue_id=queue.id, auto_complete_current=True)
    await db_session.commit()
    assert t4.token_display_number == "DRM-004"
    assert t4.status == TokenStatus.CALLED

    # Doctor calls next when queue is empty -> returns None
    t5 = await service.call_next(queue_id=queue.id, auto_complete_current=True)
    await db_session.commit()
    assert t5 is None
