import uuid
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, update, delete

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models import (
    Hospital,
    Branch,
    Department,
    Room,
    StaffUser,
    Queue,
    QueueToken,
    QueueEvent,
    QueuePause,
    UserRole,
    QueueStatus,
)
from app.schemas.hospital_admin import (
    DepartmentCreateIn,
    DepartmentUpdateIn,
    DepartmentItemOut,
    RoomCreateIn,
    RoomUpdateIn,
    RoomItemOut,
    StaffInviteIn,
    StaffUpdateIn,
    StaffItemOut,
    QueueCreateIn,
    QueueUpdateIn,
    QueueItemOut,
    HospitalAdminOverviewOut,
)
from app.api.deps import get_current_active_user, require_roles

router = APIRouter()


def _get_target_hospital_id(current_user: StaffUser, hospital_id_param: uuid.UUID | None = None) -> uuid.UUID:
    """Helper resolving tenant boundary for Hospital Admin vs Platform Super Admin."""
    if current_user.role == UserRole.SUPER_ADMIN:
        if not hospital_id_param:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform Super Admin must provide a target hospital_id query parameter",
            )
        return hospital_id_param
    if not current_user.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not bound to a hospital tenant",
        )
    return current_user.hospital_id


@router.get("/overview", response_model=HospitalAdminOverviewOut, summary="Hospital Admin Tenant Overview")
async def get_hospital_admin_overview(
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Returns full tenant topology for the hospital admin:
    - Branches, Departments, Rooms, Staff, and Queues.
    """
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    hospital = await db.scalar(select(Hospital).where(Hospital.id == target_hospital_id))
    if not hospital:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital tenant not found")

    # Branches
    branches_res = await db.scalars(select(Branch).where(Branch.hospital_id == target_hospital_id))
    branches = list(branches_res.all())
    branch_ids = [b.id for b in branches]

    # Departments
    departments_res = await db.scalars(select(Department).where(Department.branch_id.in_(branch_ids)))
    departments = list(departments_res.all())
    dept_ids = [d.id for d in departments]

    # Rooms
    rooms_res = await db.scalars(select(Room).where(Room.department_id.in_(dept_ids)))
    rooms = list(rooms_res.all())

    # Staff
    staff_res = await db.scalars(select(StaffUser).where(StaffUser.hospital_id == target_hospital_id))
    staff = list(staff_res.all())

    # Queues
    queues_res = await db.scalars(select(Queue).where(Queue.department_id.in_(dept_ids)))
    queues = list(queues_res.all())

    # Enrich departments
    dept_room_counts = {d.id: 0 for d in departments}
    dept_queue_counts = {d.id: 0 for d in departments}
    for r in rooms:
        dept_room_counts[r.department_id] = dept_room_counts.get(r.department_id, 0) + 1
    for q in queues:
        dept_queue_counts[q.department_id] = dept_queue_counts.get(q.department_id, 0) + 1

    dept_items = [
        DepartmentItemOut(
            id=d.id,
            branch_id=d.branch_id,
            name=d.name,
            code=d.code,
            room_count=dept_room_counts.get(d.id, 0),
            queue_count=dept_queue_counts.get(d.id, 0),
        )
        for d in departments
    ]

    staff_dict = {s.id: s.full_name for s in staff}
    room_dict = {r.id: r.room_number for r in rooms}
    dept_dict = {d.id: d.name for d in departments}

    queue_items = [
        QueueItemOut(
            id=q.id,
            department_id=q.department_id,
            department_name=dept_dict.get(q.department_id),
            doctor_user_id=q.doctor_user_id,
            doctor_name=staff_dict.get(q.doctor_user_id) if q.doctor_user_id else None,
            room_id=q.room_id,
            room_number=room_dict.get(q.room_id) if q.room_id else None,
            name=q.name,
            prefix=q.prefix,
            status=q.status,
            default_consult_time_min=q.default_consult_time_min,
            current_sequence=q.current_sequence,
        )
        for q in queues
    ]

    return HospitalAdminOverviewOut(
        hospital_id=hospital.id,
        hospital_name=hospital.name,
        hospital_slug=hospital.slug,
        branches=[{"id": str(b.id), "name": b.name, "code": b.code} for b in branches],
        departments=dept_items,
        rooms=[RoomItemOut.model_validate(r) for r in rooms],
        staff=[StaffItemOut.model_validate(s) for s in staff],
        queues=queue_items,
    )


@router.post("/departments", response_model=DepartmentItemOut, status_code=status.HTTP_201_CREATED, summary="Create OPD Department")
async def create_department(
    payload: DepartmentCreateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create a new clinical department under the hospital tenant."""
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    # Resolve branch
    branch_id = payload.branch_id
    if not branch_id:
        default_branch = await db.scalar(
            select(Branch).where(Branch.hospital_id == target_hospital_id).order_by(Branch.created_at)
        )
        if not default_branch:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No facility branch exists for tenant")
        branch_id = default_branch.id
    else:
        branch = await db.scalar(
            select(Branch).where(and_(Branch.id == branch_id, Branch.hospital_id == target_hospital_id))
        )
        if not branch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Branch not found in your hospital")

    # Check duplicate code within branch
    existing_dept = await db.scalar(
        select(Department).where(
            and_(
                Department.branch_id == branch_id,
                Department.code == payload.code.upper().strip(),
            )
        )
    )
    if existing_dept:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Department code '{payload.code.upper().strip()}' already exists in this facility",
        )

    dept = Department(
        branch_id=branch_id,
        name=payload.name.strip(),
        code=payload.code.upper().strip(),
    )
    db.add(dept)
    await db.commit()
    await db.refresh(dept)

    return DepartmentItemOut(
        id=dept.id,
        branch_id=dept.branch_id,
        name=dept.name,
        code=dept.code,
        room_count=0,
        queue_count=0,
    )


@router.post("/rooms", response_model=RoomItemOut, status_code=status.HTTP_201_CREATED, summary="Create Consultation Room")
async def create_room(
    payload: RoomCreateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create a new consultation room in a department."""
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    # Validate department tenant ownership
    dept = await db.scalar(
        select(Department)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Department.id == payload.department_id, Branch.hospital_id == target_hospital_id))
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in your hospital")

    room = Room(
        department_id=dept.id,
        name=payload.name.strip(),
        room_number=payload.room_number.strip(),
    )
    db.add(room)
    await db.commit()
    await db.refresh(room)

    return RoomItemOut.model_validate(room)


@router.post("/staff", response_model=StaffItemOut, status_code=status.HTTP_201_CREATED, summary="Invite or Register Clinical Staff")
async def invite_staff(
    payload: StaffInviteIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Invite and register a Doctor, Receptionist, or Assistant under this hospital tenant."""
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    # Check email duplicate
    existing_staff = await db.scalar(
        select(StaffUser).where(StaffUser.email == payload.email.lower().strip())
    )
    if existing_staff:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email address already exists")

    # Resolve branch
    branch_id = payload.branch_id
    if not branch_id:
        default_branch = await db.scalar(
            select(Branch).where(Branch.hospital_id == target_hospital_id).order_by(Branch.created_at)
        )
        branch_id = default_branch.id if default_branch else None

    new_staff = StaffUser(
        hospital_id=target_hospital_id,
        branch_id=branch_id,
        email=payload.email.lower().strip(),
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name.strip(),
        phone_number=payload.phone_number.strip() if payload.phone_number else None,
        role=payload.role,
        is_active=True,
    )
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)

    # Asynchronously dispatch staff invitation email with credentials in background
    import asyncio
    from app.domain.notifications.email_service import EmailService
    hospital = await db.scalar(select(Hospital).where(Hospital.id == target_hospital_id))
    asyncio.create_task(
        EmailService.send_staff_invitation(
            staff_email=new_staff.email,
            staff_name=new_staff.full_name,
            role=new_staff.role.value,
            hospital_name=hospital.name if hospital else "Hospital",
            temp_password=payload.password,
        )
    )

    return StaffItemOut.model_validate(new_staff)


@router.post("/staff/{user_id}/resend-invite", summary="Resend Staff Invitation Email")
async def resend_staff_invite(
    user_id: uuid.UUID,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Dispatches a fresh invitation & login credentials email to a Doctor or Receptionist."""
    from app.domain.notifications.email_service import EmailService

    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)
    staff = await db.scalar(
        select(StaffUser).where(
            and_(
                StaffUser.id == user_id,
                StaffUser.hospital_id == target_hospital_id,
            )
        )
    )
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found in this hospital")

    hospital = await db.scalar(select(Hospital).where(Hospital.id == target_hospital_id))

    sent = await EmailService.send_staff_invitation(
        staff_email=staff.email,
        staff_name=staff.full_name,
        role=staff.role.value,
        hospital_name=hospital.name if hospital else "Hospital",
        temp_password="[Configured by Administrator - contact Hospital Admin to reset]",
    )
    return {"status": "success", "sent": sent, "recipient": staff.email}


@router.post("/queues", response_model=QueueItemOut, status_code=status.HTTP_201_CREATED, summary="Create OPD Live Queue")
async def create_queue(
    payload: QueueCreateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create a new live queue linking department, assigned doctor, and room."""
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    # Validate department tenant ownership
    dept = await db.scalar(
        select(Department)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Department.id == payload.department_id, Branch.hospital_id == target_hospital_id))
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in your hospital")

    # Validate doctor if specified
    doctor_name = None
    if payload.doctor_user_id:
        doctor = await db.scalar(
            select(StaffUser).where(
                and_(
                    StaffUser.id == payload.doctor_user_id,
                    StaffUser.hospital_id == target_hospital_id,
                )
            )
        )
        if not doctor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found in your hospital")
        doctor_name = doctor.full_name

    # Validate room if specified
    room_number = None
    if payload.room_id:
        room = await db.scalar(
            select(Room).where(and_(Room.id == payload.room_id, Room.department_id == dept.id))
        )
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found in specified department")
        room_number = room.room_number

    queue = Queue(
        department_id=dept.id,
        doctor_user_id=payload.doctor_user_id,
        room_id=payload.room_id,
        name=payload.name.strip(),
        prefix=payload.prefix.upper().strip(),
        status=QueueStatus.OPEN,
        default_consult_time_min=payload.default_consult_time_min,
        rejoin_policy=payload.rejoin_policy,
        current_sequence=0,
    )
    db.add(queue)
    await db.commit()
    await db.refresh(queue)

    return QueueItemOut(
        id=queue.id,
        department_id=queue.department_id,
        department_name=dept.name,
        doctor_user_id=queue.doctor_user_id,
        doctor_name=doctor_name,
        room_id=queue.room_id,
        room_number=room_number,
        name=queue.name,
        prefix=queue.prefix,
        status=queue.status,
        default_consult_time_min=queue.default_consult_time_min,
        current_sequence=queue.current_sequence,
    )


# =========================================================================
# Department Update & Delete
# =========================================================================

@router.patch("/departments/{dept_id}", response_model=DepartmentItemOut, summary="Update Department")
async def update_department(
    dept_id: uuid.UUID,
    payload: DepartmentUpdateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    dept = await db.scalar(
        select(Department)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Department.id == dept_id, Branch.hospital_id == target_hospital_id))
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in your hospital")

    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.code is not None:
        new_code = payload.code.upper().strip()
        # Check duplicate code within branch
        existing = await db.scalar(
            select(Department).where(
                and_(
                    Department.branch_id == dept.branch_id,
                    Department.code == new_code,
                    Department.id != dept.id,
                )
            )
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Department code '{new_code}' already in use",
            )
        dept.code = new_code

    await db.commit()
    await db.refresh(dept)

    # Get room and queue counts
    room_count = await db.scalar(select(func.count(Room.id)).where(Room.department_id == dept.id)) or 0
    queue_count = await db.scalar(select(func.count(Queue.id)).where(Queue.department_id == dept.id)) or 0

    return DepartmentItemOut(
        id=dept.id,
        branch_id=dept.branch_id,
        name=dept.name,
        code=dept.code,
        room_count=room_count,
        queue_count=queue_count,
    )


@router.delete("/departments/{dept_id}", summary="Delete Department")
async def delete_department(
    dept_id: uuid.UUID,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    dept = await db.scalar(
        select(Department)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Department.id == dept_id, Branch.hospital_id == target_hospital_id))
    )
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found in your hospital")

    # Fetch and delete associated queues (and their tokens/events/pauses)
    queues_res = await db.scalars(select(Queue).where(Queue.department_id == dept.id))
    queues = list(queues_res.all())
    for q in queues:
        token_ids = list(await db.scalars(select(QueueToken.id).where(QueueToken.queue_id == q.id)))
        if token_ids:
            await db.execute(delete(QueueEvent).where(QueueEvent.token_id.in_(token_ids)))
        await db.execute(delete(QueueEvent).where(QueueEvent.queue_id == q.id))
        await db.execute(delete(QueuePause).where(QueuePause.queue_id == q.id))
        await db.execute(delete(QueueToken).where(QueueToken.queue_id == q.id))
        await db.delete(q)

    # Delete rooms
    await db.execute(delete(Room).where(Room.department_id == dept.id))
    # Delete department
    await db.delete(dept)
    await db.commit()

    return {"status": "success", "message": f"Department '{dept.name}' and related resources deleted successfully"}


# =========================================================================
# Room Update & Delete
# =========================================================================

@router.patch("/rooms/{room_id}", response_model=RoomItemOut, summary="Update Consultation Room")
async def update_room(
    room_id: uuid.UUID,
    payload: RoomUpdateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    room = await db.scalar(
        select(Room)
        .join(Department, Room.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Room.id == room_id, Branch.hospital_id == target_hospital_id))
    )
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found in your hospital")

    if payload.department_id is not None:
        dept = await db.scalar(
            select(Department)
            .join(Branch, Department.branch_id == Branch.id)
            .where(and_(Department.id == payload.department_id, Branch.hospital_id == target_hospital_id))
        )
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target department not found")
        room.department_id = payload.department_id

    if payload.name is not None:
        room.name = payload.name.strip()
    if payload.room_number is not None:
        room.room_number = payload.room_number.strip()

    await db.commit()
    await db.refresh(room)
    return RoomItemOut.model_validate(room)


@router.delete("/rooms/{room_id}", summary="Delete Consultation Room")
async def delete_room(
    room_id: uuid.UUID,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    room = await db.scalar(
        select(Room)
        .join(Department, Room.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Room.id == room_id, Branch.hospital_id == target_hospital_id))
    )
    if not room:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found in your hospital")

    # Unassign room from any active queues
    await db.execute(
        update(Queue).where(Queue.room_id == room.id).values(room_id=None)
    )
    await db.delete(room)
    await db.commit()

    return {"status": "success", "message": f"Room '{room.name}' deleted successfully"}


# =========================================================================
# Staff Update & Delete
# =========================================================================

@router.patch("/staff/{user_id}", response_model=StaffItemOut, summary="Update Staff User")
async def update_staff_user(
    user_id: uuid.UUID,
    payload: StaffUpdateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    staff = await db.scalar(
        select(StaffUser).where(
            and_(StaffUser.id == user_id, StaffUser.hospital_id == target_hospital_id)
        )
    )
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found in your hospital")

    if payload.full_name is not None:
        staff.full_name = payload.full_name.strip()
    if payload.email is not None:
        new_email = payload.email.lower().strip()
        existing = await db.scalar(
            select(StaffUser).where(and_(StaffUser.email == new_email, StaffUser.id != staff.id))
        )
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use by another user")
        staff.email = new_email
    if payload.phone_number is not None:
        staff.phone_number = payload.phone_number.strip() if payload.phone_number else None
    if payload.role is not None:
        staff.role = payload.role
    if payload.is_active is not None:
        staff.is_active = payload.is_active
    if payload.password is not None and len(payload.password) >= 6:
        staff.hashed_password = get_password_hash(payload.password)

    await db.commit()
    await db.refresh(staff)
    return StaffItemOut.model_validate(staff)


@router.delete("/staff/{user_id}", summary="Delete Staff User")
async def delete_staff_user(
    user_id: uuid.UUID,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own user account")

    staff = await db.scalar(
        select(StaffUser).where(
            and_(StaffUser.id == user_id, StaffUser.hospital_id == target_hospital_id)
        )
    )
    if not staff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff user not found in your hospital")

    # Unassign doctor from any queues
    await db.execute(
        update(Queue).where(Queue.doctor_user_id == staff.id).values(doctor_user_id=None)
    )
    await db.delete(staff)
    await db.commit()

    return {"status": "success", "message": f"Staff user '{staff.full_name}' deleted successfully"}


# =========================================================================
# Queue Update & Delete
# =========================================================================

@router.patch("/queues/{queue_id}", response_model=QueueItemOut, summary="Update OPD Queue")
async def update_queue(
    queue_id: uuid.UUID,
    payload: QueueUpdateIn,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    queue = await db.scalar(
        select(Queue)
        .join(Department, Queue.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Queue.id == queue_id, Branch.hospital_id == target_hospital_id))
    )
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found in your hospital")

    if payload.department_id is not None:
        dept = await db.scalar(
            select(Department)
            .join(Branch, Department.branch_id == Branch.id)
            .where(and_(Department.id == payload.department_id, Branch.hospital_id == target_hospital_id))
        )
        if not dept:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target department not found")
        queue.department_id = payload.department_id

    if payload.doctor_user_id is not None:
        if payload.doctor_user_id:
            doctor = await db.scalar(
                select(StaffUser).where(
                    and_(
                        StaffUser.id == payload.doctor_user_id,
                        StaffUser.hospital_id == target_hospital_id,
                    )
                )
            )
            if not doctor:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
            queue.doctor_user_id = payload.doctor_user_id
        else:
            queue.doctor_user_id = None

    if payload.room_id is not None:
        if payload.room_id:
            room = await db.scalar(
                select(Room).where(and_(Room.id == payload.room_id, Room.department_id == queue.department_id))
            )
            if not room:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found in queue department")
            queue.room_id = payload.room_id
        else:
            queue.room_id = None

    if payload.name is not None:
        queue.name = payload.name.strip()
    if payload.prefix is not None:
        queue.prefix = payload.prefix.upper().strip()
    if payload.default_consult_time_min is not None:
        queue.default_consult_time_min = payload.default_consult_time_min
    if payload.status is not None:
        queue.status = payload.status

    await db.commit()
    await db.refresh(queue)

    dept = await db.scalar(select(Department).where(Department.id == queue.department_id))
    doctor = await db.scalar(select(StaffUser).where(StaffUser.id == queue.doctor_user_id)) if queue.doctor_user_id else None
    room = await db.scalar(select(Room).where(Room.id == queue.room_id)) if queue.room_id else None

    return QueueItemOut(
        id=queue.id,
        department_id=queue.department_id,
        department_name=dept.name if dept else None,
        doctor_user_id=queue.doctor_user_id,
        doctor_name=doctor.full_name if doctor else None,
        room_id=queue.room_id,
        room_number=room.room_number if room else None,
        name=queue.name,
        prefix=queue.prefix,
        status=queue.status,
        default_consult_time_min=queue.default_consult_time_min,
        current_sequence=queue.current_sequence,
    )


@router.delete("/queues/{queue_id}", summary="Delete OPD Queue")
async def delete_queue(
    queue_id: uuid.UUID,
    hospital_id: uuid.UUID | None = Query(None),
    current_user: StaffUser = Depends(require_roles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> Any:
    target_hospital_id = _get_target_hospital_id(current_user, hospital_id)

    queue = await db.scalar(
        select(Queue)
        .join(Department, Queue.department_id == Department.id)
        .join(Branch, Department.branch_id == Branch.id)
        .where(and_(Queue.id == queue_id, Branch.hospital_id == target_hospital_id))
    )
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found in your hospital")

    # Cascade delete tokens and events
    token_ids = list(await db.scalars(select(QueueToken.id).where(QueueToken.queue_id == queue.id)))
    if token_ids:
        await db.execute(delete(QueueEvent).where(QueueEvent.token_id.in_(token_ids)))
    await db.execute(delete(QueueEvent).where(QueueEvent.queue_id == queue.id))
    await db.execute(delete(QueuePause).where(QueuePause.queue_id == queue.id))
    await db.execute(delete(QueueToken).where(QueueToken.queue_id == queue.id))
    await db.delete(queue)
    await db.commit()

    return {"status": "success", "message": f"Queue '{queue.name}' deleted successfully"}

