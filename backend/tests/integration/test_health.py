import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Verify root endpoint returns system information and online status."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["version"] == "0.1.0"
    assert "/api/v1/docs" in data["docs"]


@pytest.mark.asyncio
async def test_health_check_healthy(client: AsyncClient):
    """Verify health endpoint successfully reports healthy when DB and Redis are up."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["components"]["database"] == "healthy"
    assert data["components"]["redis"] == "healthy"
