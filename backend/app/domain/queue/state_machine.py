from typing import Dict, Set, Tuple
from app.models.enums import TokenStatus


class InvalidStateTransitionError(Exception):
    """Raised when an illegal token state transition is attempted."""
    def __init__(self, from_status: TokenStatus, to_status: TokenStatus, reason: str = ""):
        self.from_status = from_status
        self.to_status = to_status
        self.reason = reason
        message = f"Illegal transition from '{from_status.value}' to '{to_status.value}'"
        if reason:
            message += f": {reason}"
        super().__init__(message)


class QueueStateMachine:
    """
    Strict finite state machine for Queue Token lifecycle management.
    """

    # Mapping of allowed transitions: { CurrentStatus: { AllowedTargetStatuses } }
    _TRANSITIONS: Dict[TokenStatus, Set[TokenStatus]] = {
        TokenStatus.WAITING: {
            TokenStatus.READY,
            TokenStatus.AWAY,
            TokenStatus.CANCELLED,
            TokenStatus.TRANSFERRED,
        },
        TokenStatus.READY: {
            TokenStatus.CALLED,
            TokenStatus.AWAY,
            TokenStatus.CANCELLED,
            TokenStatus.TRANSFERRED,
        },
        TokenStatus.AWAY: {
            TokenStatus.RETURNING,
            TokenStatus.READY,
            TokenStatus.CANCELLED,
        },
        TokenStatus.RETURNING: {
            TokenStatus.READY,
            TokenStatus.AWAY,
            TokenStatus.CANCELLED,
        },
        TokenStatus.CALLED: {
            TokenStatus.SERVING,
            TokenStatus.COMPLETED,  # 1-click complete directly from called
            TokenStatus.MISSED,
            TokenStatus.SKIPPED,
            TokenStatus.READY,  # Return to ready on recall reset
        },

        TokenStatus.SERVING: {
            TokenStatus.COMPLETED,
            TokenStatus.CANCELLED,
        },
        TokenStatus.MISSED: {
            TokenStatus.READY,  # Rejoin queue flow
            TokenStatus.CANCELLED,
        },
        TokenStatus.SKIPPED: {
            TokenStatus.READY,  # Receptionist manual recall flow
            TokenStatus.CANCELLED,
        },
        TokenStatus.COMPLETED: set(),  # Terminal state
        TokenStatus.CANCELLED: set(),  # Terminal state
        TokenStatus.TRANSFERRED: set(),  # Terminal state (new token created in target queue)
    }

    @classmethod
    def can_transition(cls, from_status: TokenStatus, to_status: TokenStatus) -> bool:
        """Check if a transition from from_status to to_status is mathematically permitted."""
        return to_status in cls._TRANSITIONS.get(from_status, set())

    @classmethod
    def validate_transition(cls, from_status: TokenStatus, to_status: TokenStatus) -> None:
        """Validate transition and raise InvalidStateTransitionError if illegal."""
        if from_status == to_status:
            return  # Idempotent no-op
        if not cls.can_transition(from_status, to_status):
            raise InvalidStateTransitionError(from_status, to_status)

    @classmethod
    def is_terminal(cls, status: TokenStatus) -> bool:
        """Check if status is a final non-mutable terminal state."""
        return len(cls._TRANSITIONS.get(status, set())) == 0

    @classmethod
    def is_eligible_for_call(cls, status: TokenStatus) -> bool:
        """Tokens that can be selected for immediate consultation."""
        return status in {TokenStatus.READY, TokenStatus.RETURNING}
