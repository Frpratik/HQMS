import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("hqms")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup initialization and shutdown cleanup.
    """
    logger.info("Initializing HQMS Backend Service...")
    logger.info(f"Environment: {settings.ENVIRONMENT} | Debug: {settings.DEBUG}")
    
    # Initialize DB tables
    from app.core.database import engine, AsyncSessionLocal
    from app.models import Base, Hospital, Branch, Department, Room, StaffUser, Queue, UserRole, QueueStatus
    from app.core.security import get_password_hash
    from sqlalchemy import select, func

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed demo hospital and staff if empty
    async with AsyncSessionLocal() as session:
        count = await session.scalar(select(func.count(Hospital.id)))
        if not count or count == 0:
            logger.info("Database is empty. Seeding demo hospital, staff, and queues...")
            hospital = Hospital(
                name="Apex Multi-Specialty Hospital",
                slug="apex-hospital",
                address="Plot 42, Healthcare City",
                phone="+919876543210",
            )
            session.add(hospital)
            await session.flush()

            branch = Branch(hospital_id=hospital.id, name="Main Campus", code="MAIN")
            session.add(branch)
            await session.flush()

            card_dept = Department(branch_id=branch.id, name="Cardiology OPD", code="CARD")
            ortho_dept = Department(branch_id=branch.id, name="Orthopedics OPD", code="ORTHO")
            session.add_all([card_dept, ortho_dept])
            await session.flush()

            room101 = Room(department_id=card_dept.id, name="Cardio Consultation 1", room_number="101")
            room102 = Room(department_id=ortho_dept.id, name="Ortho Consultation 1", room_number="102")
            session.add_all([room101, room102])
            await session.flush()

            doctor = StaffUser(
                hospital_id=hospital.id,
                branch_id=branch.id,
                email="doctor@hospital.com",
                hashed_password=get_password_hash("Doctor123!"),
                full_name="Dr. Alok Sharma, MD",
                role=UserRole.DOCTOR,
            )
            receptionist = StaffUser(
                hospital_id=hospital.id,
                branch_id=branch.id,
                email="reception@hospital.com",
                hashed_password=get_password_hash("Recep123!"),
                full_name="Priya Patel",
                role=UserRole.RECEPTIONIST,
            )
            super_admin = StaffUser(
                email="super.admin@platform.com",
                hashed_password=get_password_hash("supersecurepass"),
                full_name="Global Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
            )
            session.add_all([doctor, receptionist, super_admin])
            await session.flush()

            card_queue = Queue(
                department_id=card_dept.id,
                doctor_user_id=doctor.id,
                room_id=room101.id,
                name="Dr. Sharma Cardiology Queue",
                prefix="CRD",
                status=QueueStatus.OPEN,
                default_consult_time_min=12,
            )
            session.add(card_queue)
            await session.commit()
            logger.info("Demo data seeded successfully! Demo login: doctor@hospital.com / Doctor123!, reception@hospital.com / Recep123!, or super.admin@platform.com / supersecurepass")

        # Also ensure super admin exists if DB was already partially seeded
        existing_super = await session.scalar(select(StaffUser).where(StaffUser.email == "super.admin@platform.com"))
        if not existing_super:
            super_user = StaffUser(
                email="super.admin@platform.com",
                hashed_password=get_password_hash("supersecurepass"),
                full_name="Global Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
            )
            session.add(super_user)
            await session.commit()
            logger.info("Seeded super.admin@platform.com")

    yield

    # Shutdown tasks
    logger.info("Shutting down HQMS Backend Service...")



def create_application() -> FastAPI:
    """
    Factory creating configured FastAPI instance.
    """
    application = FastAPI(
        title=settings.PROJECT_NAME,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Set all CORS enabled origins
    if settings.BACKEND_CORS_ORIGINS:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include API Routers
    application.include_router(api_router, prefix=settings.API_V1_STR)

    # Include WebSocket Router
    from app.websockets.router import ws_router
    application.include_router(ws_router)

    @application.get("/", tags=["Root"])

    async def root():
        return {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "docs": f"{settings.API_V1_STR}/docs",
            "status": "online",
        }

    return application


app = create_application()
