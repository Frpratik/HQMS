"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-25 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Hospitals
    op.create_table(
        'hospitals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_hospitals_slug', 'hospitals', ['slug'], unique=True)

    # 2. Branches
    op.create_table(
        'branches',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hospital_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['hospital_id'], ['hospitals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_branches_hospital_id', 'branches', ['hospital_id'], unique=False)
    op.create_index('ix_branches_hospital_code', 'branches', ['hospital_id', 'code'], unique=True)

    # 3. Departments
    op.create_table(
        'departments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_departments_branch_id', 'departments', ['branch_id'], unique=False)
    op.create_index('ix_departments_branch_code', 'departments', ['branch_id', 'code'], unique=True)

    # 4. Rooms
    op.create_table(
        'rooms',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('room_number', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_rooms_department_id', 'rooms', ['department_id'], unique=False)

    # 5. Staff Users
    op.create_table(
        'staff_users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hospital_id', sa.UUID(), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone_number', sa.String(length=50), nullable=True),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['hospital_id'], ['hospitals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_staff_users_email', 'staff_users', ['email'], unique=True)
    op.create_index('ix_staff_users_hospital_id', 'staff_users', ['hospital_id'], unique=False)
    op.create_index('ix_staff_users_branch_id', 'staff_users', ['branch_id'], unique=False)
    op.create_index('ix_staff_users_role', 'staff_users', ['role'], unique=False)

    # 6. Patients
    op.create_table(
        'patients',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('hospital_id', sa.UUID(), nullable=False),
        sa.Column('public_id', sa.String(length=32), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('phone_number', sa.String(length=50), nullable=True),
        sa.Column('gender', sa.String(length=20), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['hospital_id'], ['hospitals.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_patients_hospital_id', 'patients', ['hospital_id'], unique=False)
    op.create_index('ix_patients_public_id', 'patients', ['public_id'], unique=True)
    op.create_index('ix_patients_full_name', 'patients', ['full_name'], unique=False)
    op.create_index('ix_patients_phone_number', 'patients', ['phone_number'], unique=False)

    # 7. Visits
    op.create_table(
        'visits',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('hospital_id', sa.UUID(), nullable=False),
        sa.Column('branch_id', sa.UUID(), nullable=True),
        sa.Column('doctor_user_id', sa.UUID(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['hospital_id'], ['hospitals.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['doctor_user_id'], ['staff_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_visits_patient_id', 'visits', ['patient_id'], unique=False)
    op.create_index('ix_visits_hospital_id', 'visits', ['hospital_id'], unique=False)
    op.create_index('ix_visits_branch_id', 'visits', ['branch_id'], unique=False)
    op.create_index('ix_visits_doctor_user_id', 'visits', ['doctor_user_id'], unique=False)

    # 8. Queues
    op.create_table(
        'queues',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('department_id', sa.UUID(), nullable=False),
        sa.Column('doctor_user_id', sa.UUID(), nullable=True),
        sa.Column('room_id', sa.UUID(), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('prefix', sa.String(length=10), nullable=False, server_default='A'),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('default_consult_time_min', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('current_sequence', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rejoin_policy', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['doctor_user_id'], ['staff_users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['room_id'], ['rooms.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_queues_department_id', 'queues', ['department_id'], unique=False)
    op.create_index('ix_queues_doctor_user_id', 'queues', ['doctor_user_id'], unique=False)
    op.create_index('ix_queues_room_id', 'queues', ['room_id'], unique=False)
    op.create_index('ix_queues_status', 'queues', ['status'], unique=False)
    op.create_index('ix_queues_dept_status', 'queues', ['department_id', 'status'], unique=False)

    # 9. Queue Tokens
    op.create_table(
        'queue_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('public_id', sa.String(length=32), nullable=False),
        sa.Column('queue_id', sa.UUID(), nullable=False),
        sa.Column('visit_id', sa.UUID(), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('token_display_number', sa.String(length=20), nullable=False),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('operational_position', sa.Integer(), nullable=True),
        sa.Column('estimated_call_time_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_call_time_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('estimated_wait_min', sa.Integer(), nullable=True),
        sa.Column('estimated_wait_max', sa.Integer(), nullable=True),
        sa.Column('missed_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rejoin_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ready_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('serving_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['queue_id'], ['queues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_queue_tokens_public_id', 'queue_tokens', ['public_id'], unique=True)
    op.create_index('ix_queue_tokens_queue_id', 'queue_tokens', ['queue_id'], unique=False)
    op.create_index('ix_queue_tokens_visit_id', 'queue_tokens', ['visit_id'], unique=False)
    op.create_index('ix_queue_tokens_patient_id', 'queue_tokens', ['patient_id'], unique=False)
    op.create_index('ix_queue_tokens_token_display_number', 'queue_tokens', ['token_display_number'], unique=False)
    op.create_index('ix_queue_tokens_priority', 'queue_tokens', ['priority'], unique=False)
    op.create_index('ix_queue_tokens_status', 'queue_tokens', ['status'], unique=False)
    op.create_index('ix_queue_tokens_operational_position', 'queue_tokens', ['operational_position'], unique=False)
    op.create_index('ix_tokens_queue_status_priority', 'queue_tokens', ['queue_id', 'status', 'priority'], unique=False)
    op.create_index('ix_tokens_queue_sequence', 'queue_tokens', ['queue_id', 'sequence_number'], unique=False)

    # 10. Queue Events
    op.create_table(
        'queue_events',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('queue_id', sa.UUID(), nullable=False),
        sa.Column('token_id', sa.UUID(), nullable=True),
        sa.Column('actor_user_id', sa.UUID(), nullable=True),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('from_status', sa.String(length=20), nullable=True),
        sa.Column('to_status', sa.String(length=20), nullable=True),
        sa.Column('event_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['queue_id'], ['queues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['token_id'], ['queue_tokens.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['actor_user_id'], ['staff_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_queue_events_queue_id', 'queue_events', ['queue_id'], unique=False)
    op.create_index('ix_queue_events_token_id', 'queue_events', ['token_id'], unique=False)
    op.create_index('ix_queue_events_actor_user_id', 'queue_events', ['actor_user_id'], unique=False)
    op.create_index('ix_queue_events_event_type', 'queue_events', ['event_type'], unique=False)
    op.create_index('ix_events_queue_created', 'queue_events', ['queue_id', 'created_at'], unique=False)
    op.create_index('ix_events_token_created', 'queue_events', ['token_id', 'created_at'], unique=False)

    # 11. Queue Pauses
    op.create_table(
        'queue_pauses',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('queue_id', sa.UUID(), nullable=False),
        sa.Column('paused_by_user_id', sa.UUID(), nullable=True),
        sa.Column('reason', sa.String(length=255), nullable=False),
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expected_resume_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resumed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['queue_id'], ['queues.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['paused_by_user_id'], ['staff_users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_queue_pauses_queue_id', 'queue_pauses', ['queue_id'], unique=False)
    op.create_index('ix_queue_pauses_paused_by_user_id', 'queue_pauses', ['paused_by_user_id'], unique=False)
    op.create_index('ix_pauses_queue_paused_at', 'queue_pauses', ['queue_id', 'paused_at'], unique=False)


def downgrade() -> None:
    op.drop_table('queue_pauses')
    op.drop_table('queue_events')
    op.drop_table('queue_tokens')
    op.drop_table('queues')
    op.drop_table('visits')
    op.drop_table('patients')
    op.drop_table('staff_users')
    op.drop_table('rooms')
    op.drop_table('departments')
    op.drop_table('branches')
    op.drop_table('hospitals')
