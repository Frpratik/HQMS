import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Hospital,
    Branch,
    Department,
    Queue,
    QueueToken,
    Patient,
    Visit,
    TokenStatus,
    PriorityLevel,
    QueueStatus,
)
from app.domain.queue.state_machine import QueueStateMachine, InvalidStateTransitionError
from app.domain.queue.dispatcher import QueueDispatcher
from app.domain.queue.rejoin_policy import RejoinPolicyEngine
from app.domain.queue.eta_calculator import ETACalculator
from app.domain.queue.service import QueueDomainService



def test_state_machine_validations():
    """Verify legal vs illegal queue state transitions."""
    # Legal transitions
    assert QueueStateMachine.can_transition(TokenStatus.WAITING, TokenStatus.READY) is True
    assert QueueStateMachine.can_transition(TokenStatus.READY, TokenStatus.CALLED) is True
    assert QueueStateMachine.can_transition(TokenStatus.CALLED, TokenStatus.SERVING) is True
    assert QueueStateMachine.can_transition(TokenStatus.SERVING, TokenStatus.COMPLETED) is True
    assert QueueStateMachine.can_transition(TokenStatus.READY, TokenStatus.AWAY) is True
    assert QueueStateMachine.can_transition(TokenStatus.AWAY, TokenStatus.RETURNING) is True
    assert QueueStateMachine.can_transition(TokenStatus.RETURNING, TokenStatus.READY) is True
    assert QueueStateMachine.can_transition(TokenStatus.CALLED, TokenStatus.MISSED) is True
    assert QueueStateMachine.can_transition(TokenStatus.MISSED, TokenStatus.READY) is True

    # Illegal transitions
    assert QueueStateMachine.can_transition(TokenStatus.COMPLETED, TokenStatus.READY) is False
    assert QueueStateMachine.can_transition(TokenStatus.CANCELLED, TokenStatus.CALLED) is False
    assert QueueStateMachine.can_transition(TokenStatus.WAITING, TokenStatus.SERVING) is False

    with pytest.raises(InvalidStateTransitionError):
        QueueStateMachine.validate_transition(TokenStatus.COMPLETED, TokenStatus.READY)


def test_queue_dispatcher_priority_and_away_logic():
    """Verify dispatcher prioritizes EMERGENCY > HIGH > NORMAL and ignores AWAY patients."""
    t1 = QueueToken(
        token_display_number="A-001",
        sequence_number=1,
        priority=PriorityLevel.NORMAL,
        status=TokenStatus.READY,
        operational_position=1,
    )
    t2_away = QueueToken(
        token_display_number="A-002",
        sequence_number=2,
        priority=PriorityLevel.NORMAL,
        status=TokenStatus.AWAY,
        operational_position=2,
    )
    t3 = QueueToken(
        token_display_number="A-003",
        sequence_number=3,
        priority=PriorityLevel.NORMAL,
        status=TokenStatus.READY,
        operational_position=3,
    )
    t4_emergency = QueueToken(
        token_display_number="A-004",
        sequence_number=4,
        priority=PriorityLevel.EMERGENCY,
        status=TokenStatus.READY,
        operational_position=4,
    )

    # Dispatcher should choose emergency first
    next_token = QueueDispatcher.determine_next_token([t1, t2_away, t3, t4_emergency])
    assert next_token.token_display_number == "A-004"

    # If no emergency, it should pick t1 over t2 (since t2 is away) and t3
    next_normal = QueueDispatcher.determine_next_token([t1, t2_away, t3])
    assert next_normal.token_display_number == "A-001"

    # If t1 is completed and only t2 (away) and t3 (ready) remain, it should call t3
    next_when_away = QueueDispatcher.determine_next_token([t2_away, t3])
    assert next_when_away.token_display_number == "A-003"


def test_rejoin_policy_offset_calculation():
    """Verify missed patient is inserted N slots behind active queue."""
    policy = {"strategy": "OFFSET_BEHIND_CURRENT", "offset": 2}
    active_positions = [1, 2, 3, 4, 5]

    # Target position should be placed at offset 2 (position 3)
    target_pos = RejoinPolicyEngine.calculate_rejoin_position(
        policy=policy,
        active_candidate_positions=active_positions,
    )
    assert target_pos == 3


def test_eta_calculator_bounds_and_pause_dilation():
    """Verify statistical wait ranges and pause dilation."""
    # 0 patients ahead
    min_w, max_w, label = ETACalculator.calculate_wait_range(patients_ahead=0, avg_consult_min=10)
    assert min_w == 0
    assert max_w == 10
    assert "next" in label.lower()

    # 3 patients ahead with 10 min consult
    min_w3, max_w3, label3 = ETACalculator.calculate_wait_range(patients_ahead=3, avg_consult_min=10)
    assert min_w3 < 30
    assert max_w3 > 30

    # Queue paused for 20 mins
    min_wp, max_wp, label_p = ETACalculator.calculate_wait_range(
        patients_ahead=2,
        avg_consult_min=10,
        is_paused=True,
        pause_remaining_min=20,
    )
    assert min_wp >= 20
    assert "pause" in label_p.lower()


@pytest.mark.asyncio
async def test_queue_domain_service_lifecycle_scenarios(db_session: AsyncSession):
    """End-to-end verification of QueueDomainService mutations, call next, away, missed, and rejoin."""
    # 1. Setup Hospital, Branch, Department, Queue, Patients
    hospital = Hospital(name="Metro Health", slug="metro-health")
    db_session.add(hospital)
    await db_session.flush()

    branch = Branch(hospital_id=hospital.id, name="Main Wing", code="MAIN")
    db_session.add(branch)
    await db_session.flush()

    dept = Department(branch_id=branch.id, name="General OPD", code="GEN")
    db_session.add(dept)
    await db_session.flush()

    queue = Queue(
        department_id=dept.id,
        name="General OPD Queue",
        prefix="OPD",
        status=QueueStatus.OPEN,
        default_consult_time_min=10,
    )
    db_session.add(queue)
    await db_session.flush()


    # Create 3 Patients and Visits
    patients = []
    visits = []
    for i in range(3):
        p = Patient(hospital_id=hospital.id, full_name=f"Patient {i+1}")
        db_session.add(p)
        await db_session.flush()
        v = Visit(patient_id=p.id, hospital_id=hospital.id)
        db_session.add(v)
        await db_session.flush()
        patients.append(p)
        visits.append(v)

    svc = QueueDomainService(db_session)

    # 2. Create 3 tokens
    t1 = await svc.create_token(queue.id, visits[0].id, patients[0].id, PriorityLevel.NORMAL)
    t2 = await svc.create_token(queue.id, visits[1].id, patients[1].id, PriorityLevel.NORMAL)
    t3 = await svc.create_token(queue.id, visits[2].id, patients[2].id, PriorityLevel.NORMAL)

    assert t1.token_display_number == "OPD-001"
    assert t2.token_display_number == "OPD-002"
    assert t3.token_display_number == "OPD-003"
    assert t1.operational_position == 1

    # 3. Patient 2 steps AWAY
    await svc.mark_patient_away(t2.id)
    assert t2.status == TokenStatus.AWAY

    # 4. Doctor calls next -> t1 should be called
    called_1 = await svc.call_next(queue.id)
    assert called_1.id == t1.id
    assert called_1.status == TokenStatus.CALLED

    # 5. Doctor starts consultation
    await svc.mark_serving(t1.id)
    assert t1.status == TokenStatus.SERVING

    # 6. Doctor calls next -> t1 is auto-completed; t2 is AWAY so t3 should be called!
    called_2 = await svc.call_next(queue.id)
    assert called_2.id == t3.id
    assert called_2.status == TokenStatus.CALLED
    assert t1.status == TokenStatus.COMPLETED

    # 7. t3 doesn't show up -> doctor marks missed
    await svc.mark_missed(t3.id)
    assert t3.status == TokenStatus.MISSED
    assert t3.missed_count == 1

    # 8. t3 returns -> rejoin queue
    rejoined_t3 = await svc.rejoin_queue(t3.id)
    assert rejoined_t3.status == TokenStatus.READY
    assert rejoined_t3.rejoin_count == 1
