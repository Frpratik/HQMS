import pytest
import uuid
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import Hospital, StaffUser, UserRole
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_platform_super_admin_provisioning_workflow(client: AsyncClient, db_session: AsyncSession):
    """
    Test 1-click hospital tenant onboarding by Super Admin, including
    automatic branch, department, queue, and hospital admin provisioning.
    """
    # 1. Create a Super Admin account
    super_admin = StaffUser(
        email="super.admin@platform.com",
        hashed_password=get_password_hash("supersecurepass"),
        full_name="Global Super Admin",
        role=UserRole.SUPER_ADMIN,
    )
    db_session.add(super_admin)
    await db_session.commit()

    token_super_admin = create_access_token(
        subject=str(super_admin.id),
        role=UserRole.SUPER_ADMIN.value,
    )
    super_headers = {"Authorization": f"Bearer {token_super_admin}"}

    # 2. Super Admin provisions a new hospital tenant
    payload = {
        "name": "Max Super Specialty Hospital",
        "slug": "max-specialty",
        "admin_name": "Dr. Sunita Rao",
        "admin_email": "admin@maxspecialty.com",
        "admin_password": "HospitalAdminSecretPass123",
        "branch_name": "Saket Campus",
        "department_name": "Cardiology Center",
        "department_code": "CRD",
        "address": "1 Press Enclave Marg, Saket, New Delhi",
        "phone": "+911126515050",
    }
    resp = await client.post("/api/v1/platform/hospitals", json=payload, headers=super_headers)
    assert resp.status_code == 201, f"Failed to provision: {resp.text}"
    data = resp.json()
    assert data["name"] == "Max Super Specialty Hospital"
    assert data["slug"] == "max-specialty"
    assert data["is_active"] is True
    assert data["admin_email"] == "admin@maxspecialty.com"
    new_hosp_id = data["id"]

    # 3. Verify duplicate slug prevention
    dup_resp = await client.post("/api/v1/platform/hospitals", json=payload, headers=super_headers)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # 4. Verify newly provisioned Hospital Admin can log in
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "admin@maxspecialty.com", "password": "HospitalAdminSecretPass123"},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["role"] == "HOSPITAL_ADMIN"
    assert login_data["user"]["hospital_id"] == new_hosp_id

    # 5. Verify Super Admin listing with aggregates
    list_resp = await client.get("/api/v1/platform/hospitals", headers=super_headers)
    assert list_resp.status_code == 200
    hospitals = list_resp.json()
    assert len(hospitals) >= 1
    target = next((h for h in hospitals if h["slug"] == "max-specialty"), None)
    assert target is not None
    assert target["branch_count"] == 1
    assert target["staff_count"] == 1
    assert target["queue_count"] == 1

    # 6. Verify RBAC protection: Regular Hospital Admin cannot call platform provisioning
    admin_token = login_data["access_token"]
    forbidden_resp = await client.post(
        "/api/v1/platform/hospitals",
        json={"name": "Illegal Hospital", "admin_name": "Test", "admin_email": "x@x.com", "admin_password": "pass"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert forbidden_resp.status_code == 403

    # 7. Super Admin updates hospital profile and status
    update_resp = await client.patch(
        f"/api/v1/platform/hospitals/{new_hosp_id}",
        json={"name": "Max Super Specialty Hospital (Updated)", "is_active": False},
        headers=super_headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Max Super Specialty Hospital (Updated)"
    assert update_resp.json()["is_active"] is False

    # 8. Super Admin deletes the hospital tenant (cascade purge)
    del_resp = await client.delete(
        f"/api/v1/platform/hospitals/{new_hosp_id}",
        headers=super_headers,
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

    # Verify hospital no longer in list
    verify_list = await client.get("/api/v1/platform/hospitals", headers=super_headers)
    assert not any(h["id"] == new_hosp_id for h in verify_list.json())
