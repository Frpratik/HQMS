from fastapi import APIRouter
from app.api.v1.endpoints import health, auth

api_router = APIRouter()

# Health & Readiness checks
api_router.include_router(health.router, tags=["Health"])

# Authentication & Staff Management
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

