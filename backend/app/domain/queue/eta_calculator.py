from typing import Tuple, Optional
from datetime import datetime, timezone
import math


class ETACalculator:
    """
    Statistical Expected Time of Arrival (ETA) calculation engine.
    Avoids false precision by producing robust, windowed time ranges.
    """

    @staticmethod
    def calculate_wait_range(
        patients_ahead: int,
        avg_consult_min: int = 10,
        is_paused: bool = False,
        pause_remaining_min: int = 0,
        currently_serving_elapsed_min: int = 0,
        confidence_percent: int = 20,
    ) -> Tuple[int, int, str]:
        """
        Calculates (min_wait_minutes, max_wait_minutes, display_summary).
        """
        if patients_ahead == 0:
            if is_paused:
                return (
                    pause_remaining_min,
                    pause_remaining_min + avg_consult_min,
                    f"Queue Paused (~{pause_remaining_min}m remaining)",
                )
            return (0, max(2, avg_consult_min), "You are next!")

        # Effective remaining time for the currently serving patient
        current_patient_remaining = max(0, avg_consult_min - currently_serving_elapsed_min)

        # Baseline expected wait for patients ahead
        raw_expected_wait = current_patient_remaining + ((patients_ahead - 1) * avg_consult_min)

        # Factor in queue pause if applicable
        if is_paused:
            raw_expected_wait += pause_remaining_min

        # Compute confidence interval bounds
        margin = math.ceil(raw_expected_wait * (confidence_percent / 100.0))
        margin = max(3, margin)  # Minimum 3-minute window to avoid misleading precision

        min_wait = max(1, raw_expected_wait - margin)
        max_wait = raw_expected_wait + margin

        # Produce patient-friendly display string
        if min_wait == max_wait:
            display = f"~{min_wait} mins"
        else:
            display = f"{min_wait}–{max_wait} mins"

        if is_paused:
            display += f" (Includes {pause_remaining_min}m pause)"

        return (min_wait, max_wait, display)
