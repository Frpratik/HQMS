from typing import List, Optional
from app.models.enums import PriorityLevel, TokenStatus
from app.models.queue_token import QueueToken


# Numeric mapping for priority sorting (lower number = higher priority)
PRIORITY_WEIGHTS = {
    PriorityLevel.EMERGENCY: 1,
    PriorityLevel.HIGH: 2,
    PriorityLevel.NORMAL: 3,
}

STATUS_ELIGIBILITY = {
    TokenStatus.READY: 1,
    TokenStatus.RETURNING: 2,
}


class QueueDispatcher:
    """
    Deterministic queue ordering and next candidate selection engine.
    """

    @staticmethod
    def sort_tokens_by_eligibility(tokens: List[QueueToken]) -> List[QueueToken]:
        """
        Sort candidate tokens deterministically by:
        1. Priority (EMERGENCY -> HIGH -> NORMAL)
        2. Status readiness (READY -> RETURNING)
        3. Operational Position (lowest position first)
        4. Sequence Number (FIFO arrival)
        """
        def sort_key(token: QueueToken):
            priority_val = PRIORITY_WEIGHTS.get(token.priority, 99)
            status_val = STATUS_ELIGIBILITY.get(token.status, 99)
            pos_val = token.operational_position if token.operational_position is not None else 999999
            seq_val = token.sequence_number
            return (priority_val, status_val, pos_val, seq_val)

        return sorted(tokens, key=sort_key)

    @classmethod
    def determine_next_token(cls, active_tokens: List[QueueToken]) -> Optional[QueueToken]:
        """
        Evaluate candidate tokens and pick the next eligible token to be called.
        Tokens with status AWAY, WAITING, MISSED, or SKIPPED are excluded from automatic call.
        """
        eligible = [
            t for t in active_tokens
            if t.status in (TokenStatus.READY, TokenStatus.RETURNING)
        ]
        if not eligible:
            return None

        sorted_eligible = cls.sort_tokens_by_eligibility(eligible)
        return sorted_eligible[0]
