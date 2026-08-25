import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Hospital, Branch, Department, Queue, StaffUser, UserRole
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_staff_api_workflows(client: AsyncClient, db_session: AsyncSession):
    """
    End-to-end integration test verifying:
    1. Hospital/Queue creation
    2. Receptionist walk-in token issuance
    3. Receptionist queue summary
    4. Doctor 1-click call-next, start-serving, complete, missed, and rejoin
    5. Queue pause and resume
    """
    # 1. Setup Hospital, Branch, Department
    hospital = Hospital(name="Sunrise Hospital", slug="sunrise-hospital")
    db_session.add(hospital)
    await db_session.flush()

    branch = Branch(hospital_id=hospital.id, name="City Center", code="CC")
    db_session.add(branch)
    await db_session.flush()

    dept = Department(branch_id=branch.id, name="Orthopedics", code="ORTHO")
    db_session.add(dept)
    await db_session.flush()

    # 2. Setup Staff: Admin, Receptionist, Doctor
    admin = StaffUser(
        hospital_id=hospital.id,
        email="admin@sunrise.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin User",
        role=UserRole.HOSPITAL_ADMIN,
    )
    receptionist = StaffUser(
        hospital_id=hospital.id,
        email="reception@sunrise.com",
        hashed_password=get_password_hash("RecepPass123!"),
        full_name="Receptionist Staff",
        role=UserRole.RECEPTIONIST,
    )
    doctor = StaffUser(
        hospital_id=hospital.id,
        email="doctor.ortho@sunrise.com",
        hashed_password=get_password_hash("DocPass123!"),
        full_name="Dr. Ortho Surgeon",
        role=UserRole.DOCTOR,
    )
    db_session.add_all([admin, receptionist, doctor])
    await db_session.commit()

    admin_token = create_access_token(str(admin.id), role=UserRole.HOSPITAL_ADMIN.value)
    recep_token = create_access_token(str(receptionist.id), role=UserRole.RECEPTIONIST.value)
    doc_token = create_access_token(str(doctor.id), role=UserRole.DOCTOR.value)

    # 3. Create Queue via API
    queue_payload = {
        "department_id": str(dept.id),
        "doctor_user_id": str(doctor.id),
        "name": "Dr. Ortho Consultation Queue",
        "prefix": "ORT",
        "default_consult_time_min": 15,
    }
    queue_resp = await client.post(
        "/api/v1/queues/",
        json=queue_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert queue_resp.status_code == 201
    queue_id = queue_resp.json()["id"]

    # 4. Reception Issues Walk-in Tokens
    walkin_1 = {
        "queue_id": queue_id,
        "patient_name": "Suresh Gupta",
        "patient_phone": "+919800011122",
        "patient_gender": "MALE",
        "priority": "NORMAL",
        "notes": "Knee pain",
    }
    w1_resp = await client.post(
        "/api/v1/reception/tokens/walk-in",
        json=walkin_1,
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert w1_resp.status_code == 201
    t1_data = w1_resp.json()
    assert t1_data["token_display_number"] == "ORT-001"
    assert t1_data["status"] == "READY"
    assert t1_data["operational_position"] == 1
    token1_id = t1_data["id"]

    walkin_2 = {
        "queue_id": queue_id,
        "patient_name": "Anita Verma",
        "patient_phone": "+919800011133",
        "patient_gender": "FEMALE",
        "priority": "NORMAL",
    }
    w2_resp = await client.post(
        "/api/v1/reception/tokens/walk-in",
        json=walkin_2,
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert w2_resp.status_code == 201
    t2_data = w2_resp.json()
    assert t2_data["token_display_number"] == "ORT-002"
    token2_id = t2_data["id"]

    # 5. Reception Queue Summary
    sum_resp = await client.get(
        f"/api/v1/reception/queues/{queue_id}/summary",
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert summary["total_ready"] == 2
    assert len(summary["active_tokens"]) == 2

    # 6. Patient Search
    search_resp = await client.get(
        "/api/v1/reception/patients/search?query=Suresh",
        headers={"Authorization": f"Bearer {recep_token}"},
    )
    assert search_resp.status_code == 200
    assert len(search_resp.json()) >= 1
    assert search_resp.json()[0]["full_name"] == "Suresh Gupta"

    # 7. Doctor 1-Click Call Next -> Calls Patient 1
    call_resp = await client.post(
        f"/api/v1/doctor/queues/{queue_id}/call-next",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert call_resp.status_code == 200
    called_t1 = call_resp.json()
    assert called_t1["id"] == token1_id
    assert called_t1["status"] == "CALLED"

    # 8. Doctor Starts Consultation
    serving_resp = await client.post(
        f"/api/v1/doctor/tokens/{token1_id}/start-serving",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert serving_resp.status_code == 200
    assert serving_resp.json()["status"] == "SERVING"

    # 9. Doctor Calls Next -> Auto-completes Patient 1 and Calls Patient 2
    call2_resp = await client.post(
        f"/api/v1/doctor/queues/{queue_id}/call-next",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert call2_resp.status_code == 200
    called_t2 = call2_resp.json()
    assert called_t2["id"] == token2_id
    assert called_t2["status"] == "CALLED"

    # 10. Patient 2 Misses Call
    missed_resp = await client.post(
        f"/api/v1/doctor/tokens/{token2_id}/missed",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert missed_resp.status_code == 200
    assert missed_resp.json()["status"] == "MISSED"

    # 11. Patient 2 Rejoins
    rejoin_resp = await client.post(
        f"/api/v1/doctor/tokens/{token2_id}/rejoin",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert rejoin_resp.status_code == 200
    assert rejoin_resp.json()["status"] == "READY"
    assert rejoin_resp.json()["rejoin_count"] == 1

    # 12. Doctor Pauses Queue
    pause_resp = await client.post(
        f"/api/v1/doctor/queues/{queue_id}/pause",
        json={"reason": "Emergency surgery", "expected_resume_minutes": 30},
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert pause_resp.status_code == 200
    assert pause_resp.json()["status"] == "PAUSED"

    # 13. Doctor Resumes Queue
    resume_resp = await client.post(
        f"/api/v1/doctor/queues/{queue_id}/resume",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resume_resp.status_code == 200
    assert resume_resp.json()["status"] == "OPEN"
