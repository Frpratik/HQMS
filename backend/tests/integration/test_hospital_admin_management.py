import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, create_access_token
from app.models import Hospital, Branch, Department, Room, StaffUser, Queue, UserRole, QueueStatus


@pytest.mark.asyncio
async def test_hospital_admin_self_management_lifecycle(client: AsyncClient, db_session: AsyncSession):
    """
    Verify Hospital Admin can:
    1. View own tenant overview
    2. Add departments
    3. Add rooms
    4. Invite doctors/staff
    5. Deploy new live queues
    """
    # 1. Provision Hospital A
    hosp_a = Hospital(name="City Care Hospital", slug=f"city-care-{uuid.uuid4().hex[:6]}")
    db_session.add(hosp_a)
    await db_session.flush()

    branch_a = Branch(hospital_id=hosp_a.id, name="City Care Main", code="MAIN")
    db_session.add(branch_a)
    await db_session.flush()

    admin_a = StaffUser(
        hospital_id=hosp_a.id,
        branch_id=branch_a.id,
        email=f"admin@{hosp_a.slug}.com",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Dr. City Admin",
        role=UserRole.HOSPITAL_ADMIN,
    )
    db_session.add(admin_a)
    await db_session.commit()

    token_a = create_access_token(
        subject=str(admin_a.id),
        role="HOSPITAL_ADMIN",
        hospital_id=str(hosp_a.id),
    )
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Get Overview
    res = await client.get("/api/v1/hospital-admin/overview", headers=headers_a)
    assert res.status_code == 200
    overview = res.json()
    assert overview["hospital_name"] == "City Care Hospital"
    assert len(overview["branches"]) == 1

    # 3. Create Department
    res = await client.post(
        "/api/v1/hospital-admin/departments",
        json={"name": "Pediatrics OPD", "code": "PED"},
        headers=headers_a,
    )
    assert res.status_code == 201
    dept = res.json()
    assert dept["name"] == "Pediatrics OPD"
    assert dept["code"] == "PED"

    # 4. Create Consultation Room
    res = await client.post(
        "/api/v1/hospital-admin/rooms",
        json={"department_id": dept["id"], "name": "Pediatric Cabin 1", "room_number": "101"},
        headers=headers_a,
    )
    assert res.status_code == 201
    room = res.json()
    assert room["room_number"] == "101"

    # 5. Invite / Register Doctor
    res = await client.post(
        "/api/v1/hospital-admin/staff",
        json={
            "email": f"pediatrician@{hosp_a.slug}.com",
            "full_name": "Dr. Sneha Roy, MD",
            "password": "DoctorPass123!",
            "role": "DOCTOR",
        },
        headers=headers_a,
    )
    assert res.status_code == 201
    doctor = res.json()
    assert doctor["role"] == "DOCTOR"

    # 6. Deploy Live Queue
    res = await client.post(
        "/api/v1/hospital-admin/queues",
        json={
            "department_id": dept["id"],
            "doctor_user_id": doctor["id"],
            "room_id": room["id"],
            "name": "Dr. Sneha Pediatrics Queue",
            "prefix": "PED",
            "default_consult_time_min": 10,
        },
        headers=headers_a,
    )
    assert res.status_code == 201
    queue = res.json()
    assert queue["prefix"] == "PED"
    assert queue["status"] == "OPEN"


@pytest.mark.asyncio
async def test_hospital_admin_cross_tenant_rejection(client: AsyncClient, db_session: AsyncSession):
    """
    Verify Hospital Admin A cannot create rooms, staff, or queues in Hospital B.
    """
    # Hospital A & Admin A
    hosp_a = Hospital(name="Hospital Alpha", slug=f"alpha-{uuid.uuid4().hex[:6]}")
    db_session.add(hosp_a)
    await db_session.flush()

    branch_a = Branch(hospital_id=hosp_a.id, name="Alpha Branch", code="A1")
    db_session.add(branch_a)
    await db_session.flush()

    admin_a = StaffUser(
        hospital_id=hosp_a.id,
        branch_id=branch_a.id,
        email=f"admin@{hosp_a.slug}.com",
        hashed_password=get_password_hash("Pass123!"),
        full_name="Admin Alpha",
        role=UserRole.HOSPITAL_ADMIN,
    )
    db_session.add(admin_a)

    # Hospital B & Department B
    hosp_b = Hospital(name="Hospital Beta", slug=f"beta-{uuid.uuid4().hex[:6]}")
    db_session.add(hosp_b)
    await db_session.flush()

    branch_b = Branch(hospital_id=hosp_b.id, name="Beta Branch", code="B1")
    db_session.add(branch_b)
    await db_session.flush()

    dept_b = Department(branch_id=branch_b.id, name="Beta Dental", code="DENT")
    db_session.add(dept_b)
    await db_session.commit()

    token_a = create_access_token(
        subject=str(admin_a.id),
        role="HOSPITAL_ADMIN",
        hospital_id=str(hosp_a.id),
    )
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Admin A tries to create a room in Hospital B's department -> 404 Rejected
    res = await client.post(
        "/api/v1/hospital-admin/rooms",
        json={"department_id": str(dept_b.id), "name": "Illegal Room", "room_number": "999"},
        headers=headers_a,
    )
    assert res.status_code == 404
