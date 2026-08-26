import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, create_access_token
from app.models import Hospital, Branch, Department, Room, StaffUser, Queue, UserRole, QueueStatus


@pytest.mark.asyncio
async def test_doctor_and_receptionist_tenant_and_personal_scoping(client: AsyncClient, db_session: AsyncSession):
    """
    Verify strict scoping rules:
    - Receptionist A sees ONLY Hospital A queues (both Doc 1 and Doc 2).
    - Receptionist B sees ONLY Hospital B queues.
    - Doctor 1 (Hospital A) sees ONLY Doctor 1's queue, NOT Doctor 2's queue, NOT Hospital B's queue.
    - Doctor 2 (Hospital A) sees ONLY Doctor 2's queue.
    - Doctor 1 cannot perform call-next on Doctor 2's queue.
    - Receptionist A cannot issue walk-in token on Hospital B's queue.
    """
    # -------------------------------------------------------------
    # 1. Setup Hospital A with 2 Doctors, 1 Receptionist, 2 Queues
    # -------------------------------------------------------------
    hosp_a = Hospital(name="Apex Medical Center", slug=f"apex-{uuid.uuid4().hex[:6]}")
    db_session.add(hosp_a)
    await db_session.flush()

    branch_a = Branch(hospital_id=hosp_a.id, name="Apex Main", code="MAIN")
    db_session.add(branch_a)
    await db_session.flush()

    dept_a = Department(branch_id=branch_a.id, name="Cardiology", code="CRD")
    db_session.add(dept_a)
    await db_session.flush()

    doc_a1 = StaffUser(
        hospital_id=hosp_a.id,
        branch_id=branch_a.id,
        email=f"doc1@{hosp_a.slug}.com",
        hashed_password=get_password_hash("Doc1Pass!"),
        full_name="Dr. Alok Sharma",
        role=UserRole.DOCTOR,
    )
    doc_a2 = StaffUser(
        hospital_id=hosp_a.id,
        branch_id=branch_a.id,
        email=f"doc2@{hosp_a.slug}.com",
        hashed_password=get_password_hash("Doc2Pass!"),
        full_name="Dr. Priya Rao",
        role=UserRole.DOCTOR,
    )
    recep_a = StaffUser(
        hospital_id=hosp_a.id,
        branch_id=branch_a.id,
        email=f"recep@{hosp_a.slug}.com",
        hashed_password=get_password_hash("RecepPass!"),
        full_name="Ramesh Patel",
        role=UserRole.RECEPTIONIST,
    )
    db_session.add_all([doc_a1, doc_a2, recep_a])
    await db_session.flush()

    queue_a1 = Queue(
        department_id=dept_a.id,
        doctor_user_id=doc_a1.id,
        name="Dr. Sharma Cardiology",
        prefix="CRD1",
        status=QueueStatus.OPEN,
        default_consult_time_min=10,
    )
    queue_a2 = Queue(
        department_id=dept_a.id,
        doctor_user_id=doc_a2.id,
        name="Dr. Rao Cardiology",
        prefix="CRD2",
        status=QueueStatus.OPEN,
        default_consult_time_min=15,
    )
    db_session.add_all([queue_a1, queue_a2])
    await db_session.flush()

    # -------------------------------------------------------------
    # 2. Setup Hospital B with 1 Doctor, 1 Receptionist, 1 Queue
    # -------------------------------------------------------------
    hosp_b = Hospital(name="Beacon Hospital", slug=f"beacon-{uuid.uuid4().hex[:6]}")
    db_session.add(hosp_b)
    await db_session.flush()

    branch_b = Branch(hospital_id=hosp_b.id, name="Beacon Main", code="MAIN")
    db_session.add(branch_b)
    await db_session.flush()

    dept_b = Department(branch_id=branch_b.id, name="Pediatrics", code="PED")
    db_session.add(dept_b)
    await db_session.flush()

    doc_b1 = StaffUser(
        hospital_id=hosp_b.id,
        branch_id=branch_b.id,
        email=f"doc_b@{hosp_b.slug}.com",
        hashed_password=get_password_hash("DocBPass!"),
        full_name="Dr. Bob Beacon",
        role=UserRole.DOCTOR,
    )
    recep_b = StaffUser(
        hospital_id=hosp_b.id,
        branch_id=branch_b.id,
        email=f"recep_b@{hosp_b.slug}.com",
        hashed_password=get_password_hash("RecepBPass!"),
        full_name="Sunita Sharma",
        role=UserRole.RECEPTIONIST,
    )
    db_session.add_all([doc_b1, recep_b])
    await db_session.flush()

    queue_b1 = Queue(
        department_id=dept_b.id,
        doctor_user_id=doc_b1.id,
        name="Dr. Beacon Pediatrics",
        prefix="PED",
        status=QueueStatus.OPEN,
        default_consult_time_min=10,
    )
    db_session.add(queue_b1)
    await db_session.commit()

    # Generate Auth Tokens
    token_doc_a1 = create_access_token(str(doc_a1.id), "DOCTOR", str(hosp_a.id))
    token_doc_a2 = create_access_token(str(doc_a2.id), "DOCTOR", str(hosp_a.id))
    token_recep_a = create_access_token(str(recep_a.id), "RECEPTIONIST", str(hosp_a.id))
    token_recep_b = create_access_token(str(recep_b.id), "RECEPTIONIST", str(hosp_b.id))

    headers_doc_a1 = {"Authorization": f"Bearer {token_doc_a1}"}
    headers_doc_a2 = {"Authorization": f"Bearer {token_doc_a2}"}
    headers_recep_a = {"Authorization": f"Bearer {token_recep_a}"}
    headers_recep_b = {"Authorization": f"Bearer {token_recep_b}"}

    # -------------------------------------------------------------
    # 3. Test Receptionist A Queue Scoping
    # -------------------------------------------------------------
    res = await client.get("/api/v1/queues/", headers=headers_recep_a)
    assert res.status_code == 200
    queues_recep_a = res.json()
    assert len(queues_recep_a) == 2
    queue_ids_recep_a = [q["id"] for q in queues_recep_a]
    assert str(queue_a1.id) in queue_ids_recep_a
    assert str(queue_a2.id) in queue_ids_recep_a
    assert str(queue_b1.id) not in queue_ids_recep_a

    # -------------------------------------------------------------
    # 4. Test Receptionist B Queue Scoping
    # -------------------------------------------------------------
    res = await client.get("/api/v1/queues/", headers=headers_recep_b)
    assert res.status_code == 200
    queues_recep_b = res.json()
    assert len(queues_recep_b) == 1
    assert queues_recep_b[0]["id"] == str(queue_b1.id)

    # -------------------------------------------------------------
    # 5. Test Doctor A1 Personal Queue Scoping
    # -------------------------------------------------------------
    res = await client.get("/api/v1/queues/", headers=headers_doc_a1)
    assert res.status_code == 200
    queues_doc_a1 = res.json()
    assert len(queues_doc_a1) == 1
    assert queues_doc_a1[0]["id"] == str(queue_a1.id)
    assert queues_doc_a1[0]["name"] == "Dr. Sharma Cardiology"

    # -------------------------------------------------------------
    # 6. Test Doctor A2 Personal Queue Scoping
    # -------------------------------------------------------------
    res = await client.get("/api/v1/queues/", headers=headers_doc_a2)
    assert res.status_code == 200
    queues_doc_a2 = res.json()
    assert len(queues_doc_a2) == 1
    assert queues_doc_a2[0]["id"] == str(queue_a2.id)
    assert queues_doc_a2[0]["name"] == "Dr. Rao Cardiology"

    # -------------------------------------------------------------
    # 7. Test Doctor A1 trying to call next on Doctor A2's queue
    # -------------------------------------------------------------
    res = await client.post(f"/api/v1/doctor/queues/{queue_a2.id}/call-next", headers=headers_doc_a1)
    assert res.status_code == 404
    assert "not authorized" in res.json()["detail"].lower()

    # -------------------------------------------------------------
    # 8. Test Receptionist A trying to issue walk-in on Hospital B queue
    # -------------------------------------------------------------
    res = await client.post(
        "/api/v1/reception/tokens/walk-in",
        json={
            "queue_id": str(queue_b1.id),
            "patient_name": "Test Patient",
            "priority": "NORMAL",
        },
        headers=headers_recep_a,
    )
    assert res.status_code == 404
    assert "not found in this hospital" in res.json()["detail"].lower()
