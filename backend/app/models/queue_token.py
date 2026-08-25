import uuid
from datetime import datetime, timezone
from typing import Optional, List
import secrets
import string
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import TokenStatus, PriorityLevel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def generate_token_public_id(length: int = 21) -> str:
    """Generate an unguessable, secure URL identifier for patient live token view."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


class QueueToken(Base):
    __tablename__ = "queue_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    public_id: Mapped[str] = mapped_column(
        String(32), unique=True, default=generate_token_public_id, nullable=False, index=True
    )
    queue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    visit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Token visual identification (Immutable ticket number)
    token_display_number: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Operational queue sorting and eligibility
    priority: Mapped[PriorityLevel] = mapped_column(
        SQLEnum(PriorityLevel, name="priority_level_enum", native_enum=False),
        default=PriorityLevel.NORMAL,
        nullable=False,
        index=True,
    )
    status: Mapped[TokenStatus] = mapped_column(
        SQLEnum(TokenStatus, name="token_status_enum", native_enum=False),
        default=TokenStatus.WAITING,
        nullable=False,
        index=True,
    )
    operational_position: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    # Statistical ETA predictions
    estimated_call_time_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_call_time_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_wait_min: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    estimated_wait_max: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Counters
    missed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rejoin_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Lifecycle Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    ready_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    called_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    serving_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    queue: Mapped["Queue"] = relationship("Queue", back_populates="tokens")
    visit: Mapped["Visit"] = relationship("Visit", back_populates="tokens")
    patient: Mapped["Patient"] = relationship("Patient", back_populates="tokens")
    events: Mapped[List["QueueEvent"]] = relationship(
        "QueueEvent", back_populates="token", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_tokens_queue_status_priority", "queue_id", "status", "priority"),
        Index("ix_tokens_queue_sequence", "queue_id", "sequence_number"),
    )
