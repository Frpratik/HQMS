export type UserRole = "SUPER_ADMIN" | "HOSPITAL_ADMIN" | "RECEPTIONIST" | "DOCTOR" | "DOCTOR_ASSISTANT";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";

export type QueueStatus = "OPEN" | "PAUSED" | "CLOSED";

export type TokenStatus =
  | "WAITING"
  | "READY"
  | "AWAY"
  | "RETURNING"
  | "CALLED"
  | "SERVING"
  | "MISSED"
  | "SKIPPED"
  | "COMPLETED"
  | "CANCELLED"
  | "TRANSFERRED";

export type PriorityLevel = "EMERGENCY" | "HIGH" | "NORMAL";

export interface StaffUser {
  id: string;
  hospital_id: string;
  branch_id?: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface Department {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export interface Queue {
  id: string;
  department_id: string;
  doctor_user_id?: string;
  room_id?: string;
  name: string;
  prefix: string;
  status: QueueStatus;
  default_consult_time_min: number;
  current_sequence: number;
  rejoin_policy: {
    strategy: string;
    offset: number;
    max_rejoins: number;
  };
  created_at: string;
}

export interface QueueToken {
  id: string;
  public_id: string;
  queue_id: string;
  visit_id: string;
  patient_id: string;
  token_display_number: string;
  sequence_number: number;
  priority: PriorityLevel;
  status: TokenStatus;
  operational_position?: number;
  estimated_wait_min?: number;
  estimated_wait_max?: number;
  missed_count: number;
  rejoin_count: number;
  created_at: string;
  ready_at?: string;
  called_at?: string;
  serving_at?: string;
  completed_at?: string;
}

export interface PatientLiveTokenView {
  public_id: string;
  token_display_number: string;
  sequence_number: number;
  status: TokenStatus;
  priority: PriorityLevel;
  queue_id: string;
  queue_name: string;
  queue_status: QueueStatus;
  doctor_name?: string;
  department_name: string;
  room_number?: string;
  currently_serving_token_number?: string;
  currently_called_token_number?: string;
  patients_ahead: number;
  operational_position?: number;
  estimated_wait_min?: number;
  estimated_wait_max?: number;
  estimated_wait_display: string;
  action_prompt: string;
  can_mark_away: boolean;
  can_mark_returning: boolean;
  can_mark_ready: boolean;
  created_at: string;
  ready_at?: string;
  called_at?: string;
  serving_at?: string;
  completed_at?: string;
}

export interface QueueSummary {
  queue: Queue;
  currently_serving_token?: QueueToken;
  currently_called_token?: QueueToken;
  total_waiting: number;
  total_ready: number;
  total_away: number;
  total_completed_today: number;
  active_tokens: QueueToken[];
}
