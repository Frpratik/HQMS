from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, hospitals, queues, reception, doctor, patient_live, platform, hospital_admin

api_router = APIRouter()

# Health & Readiness checks
api_router.include_router(health.router, tags=["Health"])

# Platform Super Admin Tenant Management
api_router.include_router(platform.router, prefix="/platform", tags=["Platform Super Admin"])

# Hospital Admin Tenant Self-Management
api_router.include_router(hospital_admin.router, prefix="/hospital-admin", tags=["Hospital Admin"])

# Authentication & Staff Management
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])


# Hospital & Tenant Management
api_router.include_router(hospitals.router, prefix="/hospitals", tags=["Hospitals & Departments"])

# Queue Configuration
api_router.include_router(queues.router, prefix="/queues", tags=["Queues"])

# Reception Desk Workflow
api_router.include_router(reception.router, prefix="/reception", tags=["Reception"])

# Doctor & Assistant Console
api_router.include_router(doctor.router, prefix="/doctor", tags=["Doctor Console"])

# Patient Live Virtual Waiting Room
api_router.include_router(patient_live.router, prefix="/patient", tags=["Patient Live"])




