import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Hospital, Branch, Department, Queue, Patient, Visit, QueueToken, TokenStatus, PriorityLevel


@pytest.mark.asyncio
async def test_patient_live_token_flow(client: AsyncClient, db_session: AsyncSession):
    """
    Verify public patient live tracking page and self-actions:
    1. Unauthenticated GET /tokens/{public_id} returns enriched OPD and ETA context
    2. Patient self-action mark away
    3. Patient self-action mark returning
    4. Patient self-action mark ready
    5. Invalid public ID returns 404
    """
    # 1. Setup Hospital, Branch, Department, Queue
    hospital = Hospital(name="Apex Heart Institute", slug="apex-heart")
    db_session.add(hospital)
    await db_session.flush()

    branch = Branch(hospital_id=hospital.id, name="South Campus", code="SOUTH")
    db_session.add(branch)
    await db_session.flush()

    dept = Department(branch_id=branch.id, name="Cardiology OPD", code="CARD")
    db_session.add(dept)
    await db_session.flush()

    queue = Queue(
        department_id=dept.id,
        name="Dr. Sharma OPD Queue",
        prefix="CRD",
        default_consult_time_min=12,
    )
    db_session.add(queue)
    await db_session.flush()

    # 2. Setup Patient, Visit, and Token
    patient = Patient(
        hospital_id=hospital.id,
        full_name="Vikram Seth",
        phone_number="+919988776655",
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

    token = QueueToken(
        queue_id=queue.id,
        visit_id=visit.id,
        patient_id=patient.id,
        token_display_number="CRD-005",
        sequence_number=5,
        priority=PriorityLevel.NORMAL,
        status=TokenStatus.READY,
        operational_position=3,
    )
    db_session.add(token)
    await db_session.commit()
    await db_session.refresh(token)

    public_id = token.public_id

    # 3. Unauthenticated GET /api/v1/patient/tokens/{public_id}
    resp = await client.get(f"/api/v1/patient/tokens/{public_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["token_display_number"] == "CRD-005"
    assert data["queue_name"] == "Dr. Sharma OPD Queue"
    assert data["department_name"] == "Cardiology OPD"
    assert data["patients_ahead"] == 2
    assert "mins" in data["estimated_wait_display"]
    assert data["can_mark_away"] is True
    assert data["can_mark_returning"] is False

    # 4. Patient marks AWAY
    away_resp = await client.post(f"/api/v1/patient/tokens/{public_id}/away")
    assert away_resp.status_code == 200
    away_data = away_resp.json()
    assert away_data["status"] == "AWAY"
    assert away_data["can_mark_returning"] is True
    assert "AWAY" in away_data["action_prompt"]

    # 5. Patient marks RETURNING
    ret_resp = await client.post(f"/api/v1/patient/tokens/{public_id}/returning")
    assert ret_resp.status_code == 200
    ret_data = ret_resp.json()
    assert ret_data["status"] == "RETURNING"
    assert ret_data["can_mark_ready"] is True
    assert "RETURNING" in ret_data["action_prompt"]

    # 6. Patient marks READY (confirms arrival in waiting area)
    ready_resp = await client.post(f"/api/v1/patient/tokens/{public_id}/ready")
    assert ready_resp.status_code == 200
    ready_data = ready_resp.json()
    assert ready_data["status"] == "READY"
    assert ready_data["can_mark_away"] is True

    # 7. Non-existent token returns 404
    bad_resp = await client.get("/api/v1/patient/tokens/nonexistent123456789")
    assert bad_resp.status_code == 404
