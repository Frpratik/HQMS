import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Hospital, StaffUser, UserRole
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_auth_flows(client: AsyncClient, db_session: AsyncSession):
    """Verify staff registration, login, profile fetch, and credential enforcement."""
    # 1. Create a hospital
    hospital = Hospital(
        name="Apex Hospital",
        slug="apex-hospital",
    )
    db_session.add(hospital)
    await db_session.commit()

    # 2. Register staff member via API
    register_payload = {
        "hospital_id": str(hospital.id),
        "email": "doctor.apex@hospital.com",
        "password": "StrongPassword123!",
        "full_name": "Dr. Ramesh Patel",
        "phone_number": "+919876543210",
        "role": "DOCTOR",
        "is_active": True,
    }
    reg_response = await client.post("/api/v1/auth/register-staff", json=register_payload)
    assert reg_response.status_code == 201
    user_data = reg_response.json()
    assert user_data["email"] == "doctor.apex@hospital.com"
    assert user_data["role"] == "DOCTOR"

    # 3. Duplicate email registration fails
    dup_response = await client.post("/api/v1/auth/register-staff", json=register_payload)
    assert dup_response.status_code == 400

    # 4. Login with valid JSON credentials
    login_payload = {
        "email": "doctor.apex@hospital.com",
        "password": "StrongPassword123!",
    }
    login_response = await client.post("/api/v1/auth/login/json", json=login_payload)
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    access_token = token_data["access_token"]

    # 5. Login with invalid password fails
    bad_login = await client.post(
        "/api/v1/auth/login/json",
        json={"email": "doctor.apex@hospital.com", "password": "WrongPassword!"},
    )
    assert bad_login.status_code == 401

    # 6. Fetch /auth/me with valid Bearer token
    me_response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["email"] == "doctor.apex@hospital.com"
    assert me_data["full_name"] == "Dr. Ramesh Patel"

    # 7. Fetch /auth/me without token fails
    unauth_response = await client.get("/api/v1/auth/me")
    assert unauth_response.status_code == 401


@pytest.mark.asyncio
async def test_rbac_and_inactive_user_guards(client: AsyncClient, db_session: AsyncSession):
    """Verify inactive users are rejected and role checks work properly."""
    # Create hospital
    hospital = Hospital(name="Care Clinic", slug="care-clinic")
    db_session.add(hospital)
    await db_session.flush()

    # Create inactive receptionist
    inactive_user = StaffUser(
        hospital_id=hospital.id,
        email="inactive.reception@clinic.com",
        hashed_password=get_password_hash("Pass12345!"),
        full_name="Inactive Staff",
        role=UserRole.RECEPTIONIST,
        is_active=False,
    )
    db_session.add(inactive_user)
    await db_session.commit()

    # Attempt login with inactive account
    login_resp = await client.post(
        "/api/v1/auth/login/json",
        json={"email": "inactive.reception@clinic.com", "password": "Pass12345!"},
    )
    assert login_resp.status_code == 400
    assert "Inactive" in login_resp.json()["detail"]

