import asyncio
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.core.database import Base
from app.core.security import get_password_hash
from app.models import Hospital, Branch, Department, Room, StaffUser, Queue, UserRole, QueueStatus

NEON_RAW_URL = "postgresql+asyncpg://neondb_owner:npg_EDIJlB68iFOy@ep-floral-wildflower-axxa793r-pooler.c-4.us-east-2.aws.neon.tech/neondb"


async def init_neon():
    print("=" * 60, flush=True)
    print(" CONNECTING TO NEON POSTGRESQL DATABASE & CREATING TABLES", flush=True)
    print("=" * 60, flush=True)

    engine = create_async_engine(
        NEON_RAW_URL,
        connect_args={"ssl": True},
        echo=False,
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("\n[1/3] Creating all schema tables on Neon PostgreSQL...", flush=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(" [OK] All tables successfully created!", flush=True)

    print("\n[2/3] Checking and seeding default Multi-Tenant Hospital data...", flush=True)
    async with async_session() as session:
        existing_hospital = await session.scalar(select(Hospital).limit(1))
        if not existing_hospital:
            print(" -> Seeding Apex Multi-Specialty Hospital...", flush=True)
            hospital = Hospital(
                name="Apex Multi-Specialty Hospital",
                slug="apex-health",
                address="104 Medical Enclave, Sector 4",
                phone="+91-9876543210",
                primary_color="#047857",
                accent_color="#10b981",
                tagline="Precision Outpatient Care & Diagnostics",
            )
            session.add(hospital)
            await session.flush()

            branch = Branch(hospital_id=hospital.id, name="Main OPD Wing", code="MAIN")
            session.add(branch)
            await session.flush()

            card_dept = Department(branch_id=branch.id, name="Cardiology OPD", code="CRD")
            session.add(card_dept)
            await session.flush()

            room101 = Room(department_id=card_dept.id, name="Consultation Cabin A", room_number="101")
            session.add(room101)
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
            hospital_admin_user = StaffUser(
                hospital_id=hospital.id,
                branch_id=branch.id,
                email="admin@apex.com",
                hashed_password=get_password_hash("Admin123!"),
                full_name="Apex Hospital Administrator",
                role=UserRole.HOSPITAL_ADMIN,
                is_active=True,
            )
            session.add_all([doctor, receptionist, super_admin, hospital_admin_user])
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
            print(" [OK] Default hospital, departments, staff, and queues seeded successfully on Neon!", flush=True)
        else:
            print(f" [OK] Existing database found on Neon (Hospital: {existing_hospital.name})", flush=True)

    print("\n[3/3] Verifying Database Connection...", flush=True)
    async with async_session() as session:
        staff_count = len(list((await session.scalars(select(StaffUser))).all()))
        queue_count = len(list((await session.scalars(select(Queue))).all()))
        print(f" [OK] Verified: {staff_count} Staff Users | {queue_count} Queues on Neon PostgreSQL", flush=True)

    print("\n" + "=" * 60, flush=True)
    print(" NEON POSTGRESQL DATABASE INITIALIZED & 100% READY!", flush=True)
    print("=" * 60, flush=True)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_neon())
