import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import DateTime, ForeignKey, Enum as SQLEnum, JSON, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import QueueEventType, TokenStatus


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class QueueEvent(Base):
    __tablename__ = "queue_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    queue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queues.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("queue_tokens.id", ondelete="CASCADE"), nullable=True, index=True
    )
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[QueueEventType] = mapped_column(
        SQLEnum(QueueEventType, name="queue_event_type_enum", native_enum=False),
        nullable=False,
        index=True,
    )
    from_status: Mapped[Optional[TokenStatus]] = mapped_column(
        SQLEnum(TokenStatus, name="token_status_enum", native_enum=False),
        nullable=True,
    )
    to_status: Mapped[Optional[TokenStatus]] = mapped_column(
        SQLEnum(TokenStatus, name="token_status_enum", native_enum=False),
        nullable=True,
    )
    event_data: Mapped[Dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )

    # Relationships
    queue: Mapped["Queue"] = relationship("Queue", back_populates="events")
    token: Mapped[Optional["QueueToken"]] = relationship("QueueToken", back_populates="events")
    actor_user: Mapped[Optional["StaffUser"]] = relationship("StaffUser")

    __table_args__ = (
        Index("ix_events_queue_created", "queue_id", "created_at"),
        Index("ix_events_token_created", "token_id", "created_at"),
    )
