import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Hospital, Branch, Department, Room, Queue, StaffUser, Patient, Visit, QueueToken, UserRole, QueueStatus, TokenStatus, PriorityLevel
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_cross_tenant_queue_isolation(client: AsyncClient, db_session: AsyncSession):
    """
    Verify that a Doctor from Hospital A receives 403/404 when attempting to access Hospital B queues.
    """
    # 1. Create Hospital A and Hospital B
    hosp_a = Hospital(name="Hospital Alpha", slug="hosp-alpha")
    hosp_b = Hospital(name="Hospital Beta", slug="hosp-beta")
    db_session.add_all([hosp_a, hosp_b])
    await db_session.flush()

    # 2. Create Departments & Queues
    branch_a = Branch(hospital_id=hosp_a.id, name="Main Branch", code="MB-A")
    branch_b = Branch(hospital_id=hosp_b.id, name="Main Branch", code="MB-B")
    db_session.add_all([branch_a, branch_b])
    await db_session.flush()

    dept_a = Department(branch_id=branch_a.id, name="Cardiology", code="CRD-A")
    dept_b = Department(branch_id=branch_b.id, name="Cardiology", code="CRD-B")
    db_session.add_all([dept_a, dept_b])
    await db_session.flush()

    # 3. Create Doctor in Hospital A and Queue in Hospital B
    doc_a = StaffUser(
        hospital_id=hosp_a.id,
        email="doc.alpha@hospital.com",
        hashed_password=get_password_hash("pass123"),
        full_name="Dr. Alpha",
        role=UserRole.DOCTOR,
    )
    doc_b = StaffUser(
        hospital_id=hosp_b.id,
        email="doc.beta@hospital.com",
        hashed_password=get_password_hash("pass123"),
        full_name="Dr. Beta",
        role=UserRole.DOCTOR,
    )
    db_session.add_all([doc_a, doc_b])
    await db_session.flush()

    queue_b = Queue(
        department_id=dept_b.id,
        doctor_user_id=doc_b.id,
        name="Beta Cardiology Queue",
        prefix="CRD",
        status=QueueStatus.OPEN,
    )
    db_session.add(queue_b)
    await db_session.commit()

    # 4. Generate JWT for Doctor Alpha (Hospital A)
    token_doc_a = create_access_token(
        subject=str(doc_a.id),
        role=UserRole.DOCTOR.value,
        hospital_id=str(hosp_a.id),
        hospital_slug="hosp-alpha",
    )
    headers_a = {"Authorization": f"Bearer {token_doc_a}"}

    # 5. Doctor Alpha attempts to query/call queue from Hospital B
    res = await client.get(f"/api/v1/doctor/queues/{queue_b.id}/summary", headers=headers_a)
    # Must reject access
    assert res.status_code in [403, 404]


@pytest.mark.asyncio
async def test_tenant_independent_token_sequences(client: AsyncClient, db_session: AsyncSession):
    """
    Verify that monotonic sequence counters (CRD-001) increment independently in separate hospital tenants.
    """
    hosp_1 = Hospital(name="St. Mary", slug="st-mary")
    hosp_2 = Hospital(name="City General", slug="city-gen")
    db_session.add_all([hosp_1, hosp_2])
    await db_session.flush()

    b1 = Branch(hospital_id=hosp_1.id, name="Main", code="M1")
    b2 = Branch(hospital_id=hosp_2.id, name="Main", code="M2")
    db_session.add_all([b1, b2])
    await db_session.flush()

    d1 = Department(branch_id=b1.id, name="General", code="GEN1")
    d2 = Department(branch_id=b2.id, name="General", code="GEN2")
    db_session.add_all([d1, d2])
    await db_session.flush()

    q1 = Queue(department_id=d1.id, name="Q1", prefix="GEN", current_sequence=0)
    q2 = Queue(department_id=d2.id, name="Q2", prefix="GEN", current_sequence=0)
    db_session.add_all([q1, q2])
    await db_session.commit()

    rec1 = StaffUser(hospital_id=hosp_1.id, email="rec1@stmary.com", hashed_password=get_password_hash("pass"), full_name="Rec 1", role=UserRole.RECEPTIONIST)
    rec2 = StaffUser(hospital_id=hosp_2.id, email="rec2@citygen.com", hashed_password=get_password_hash("pass"), full_name="Rec 2", role=UserRole.RECEPTIONIST)
    db_session.add_all([rec1, rec2])
    await db_session.commit()

    token1 = create_access_token(subject=str(rec1.id), role="RECEPTIONIST", hospital_id=str(hosp_1.id))
    token2 = create_access_token(subject=str(rec2.id), role="RECEPTIONIST", hospital_id=str(hosp_2.id))

    # Issue walk-in in Hospital 1
    r1 = await client.post(
        "/api/v1/reception/tokens/walk-in",
        json={"queue_id": str(q1.id), "patient_name": "Patient 1", "priority": "NORMAL"},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert r1.status_code == 201
    assert r1.json()["token_display_number"] == "GEN-001"

    # Issue walk-in in Hospital 2
    r2 = await client.post(
        "/api/v1/reception/tokens/walk-in",
        json={"queue_id": str(q2.id), "patient_name": "Patient 2", "priority": "NORMAL"},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert r2.status_code == 201
    assert r2.json()["token_display_number"] == "GEN-001"
