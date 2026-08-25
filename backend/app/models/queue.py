import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import QueueStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def default_rejoin_policy() -> Dict[str, Any]:
    return {
        "strategy": "OFFSET_BEHIND_CURRENT",  # OFFSET_BEHIND_CURRENT | END_OF_QUEUE | MANUAL_APPROVAL
        "offset": 2,
        "max_rejoins": 2,
    }


class Queue(Base):
    __tablename__ = "queues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    room_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    prefix: Mapped[str] = mapped_column(String(10), default="A", nullable=False)
    status: Mapped[QueueStatus] = mapped_column(
        SQLEnum(QueueStatus, name="queue_status_enum", native_enum=False),
        default=QueueStatus.OPEN,
        nullable=False,
        index=True,
    )
    default_consult_time_min: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    current_sequence: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejoin_policy: Mapped[Dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        default=default_rejoin_policy,
        nullable=False,
    )
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    department: Mapped["Department"] = relationship("Department", back_populates="queues")
    doctor_user: Mapped[Optional["StaffUser"]] = relationship(
        "StaffUser", back_populates="managed_queues", foreign_keys=[doctor_user_id]
    )
    room: Mapped[Optional["Room"]] = relationship("Room", back_populates="queues")
    tokens: Mapped[List["QueueToken"]] = relationship(
        "QueueToken", back_populates="queue", cascade="all, delete-orphan"
    )
    events: Mapped[List["QueueEvent"]] = relationship(
        "QueueEvent", back_populates="queue", cascade="all, delete-orphan"
    )
    pauses: Mapped[List["QueuePause"]] = relationship(
        "QueuePause", back_populates="queue", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_queues_dept_status", "department_id", "status"),
    )
