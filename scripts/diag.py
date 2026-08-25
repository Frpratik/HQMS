import asyncio
import sys
sys.path.insert(0, "./backend")

from app.core.database import AsyncSessionLocal
from app.models import StaffUser, Queue, UserRole
from app.schemas.queue import QueueTokenCreateWalkIn
from app.api.v1.endpoints.reception import issue_walk_in_token
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        staff = await session.scalar(select(StaffUser).where(StaffUser.role == UserRole.RECEPTIONIST))
        queue = await session.scalar(select(Queue))
        print("Found staff:", staff.email, "Queue:", queue.name)
        walkin = QueueTokenCreateWalkIn(
            queue_id=queue.id,
            patient_name="Test Patient",
            patient_phone="+919876543210",
            priority="NORMAL"
        )
        try:
            res = await issue_walk_in_token(walkin, session, staff)
            print("SUCCESS! Token created:", res.token_display_number)
        except Exception as e:
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
