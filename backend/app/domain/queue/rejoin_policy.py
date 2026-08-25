from typing import Dict, Any, List, Optional
from app.models.enums import TokenStatus


class RejoinPolicyEngine:
    """
    Calculates target operational placement when a missed patient rejoins the active queue.
    """

    @staticmethod
    def calculate_rejoin_position(
        policy: Dict[str, Any],
        active_candidate_positions: List[int],
        current_serving_position: Optional[int] = None,
    ) -> int:
        """
        Calculates the new operational position index for a rejoining token.
        
        :param policy: Dictionary containing rejoin configuration (e.g. strategy, offset, max_rejoins).
        :param active_candidate_positions: Sorted list of current operational positions of active waiting tokens.
        :param current_serving_position: The operational position of the token currently being served, if any.
        :return: The target operational position integer.
        """
        strategy = policy.get("strategy", "OFFSET_BEHIND_CURRENT")
        offset = policy.get("offset", 2)

        if not active_candidate_positions:
            # Queue is empty, rejoining patient is first in line
            base_pos = current_serving_position or 0
            return base_pos + 1

        if strategy == "END_OF_QUEUE":
            # Place after the highest operational position
            return max(active_candidate_positions) + 1

        if strategy == "OFFSET_BEHIND_CURRENT":
            # Target is N slots behind the currently active token
            if len(active_candidate_positions) <= offset:
                # If there are fewer patients than the offset, place at the end of existing candidates
                return max(active_candidate_positions) + 1
            else:
                # Position between offset-th and (offset+1)-th patient
                target_idx = min(offset, len(active_candidate_positions) - 1)
                # Calculate midpoint position or safe integer slot
                return active_candidate_positions[target_idx]

        # Default fallback
        return max(active_candidate_positions) + 1
