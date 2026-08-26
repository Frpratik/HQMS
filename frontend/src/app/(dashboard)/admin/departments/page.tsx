"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Layers,
  Users,
  Activity,
  Plus,
  Stethoscope,
  DoorOpen,
  LogOut,
  RefreshCw,
  CheckCircle2,
  Shield,
  ChevronRight,
  UserCheck,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Mail,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  api,
  HospitalAdminOverview,
  DepartmentItem,
  RoomItem,
  StaffItem,
  QueueItem,
  UserRole,
  QueueStatus,
} from "@/lib/api";

type ActiveTab = "departments" | "staff" | "queues";

export default function HospitalAdminDepartmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthorized } = useRequireAuth(["HOSPITAL_ADMIN"]);
  const [overview, setOverview] = useState<HospitalAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("departments");

  // Creation Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Edit Modals
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffItem | null>(null);
  const [editingQueue, setEditingQueue] = useState<QueueItem | null>(null);

  // Delete Confirmation Modals
  const [deletingDept, setDeletingDept] = useState<DepartmentItem | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<RoomItem | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffItem | null>(null);
  const [deletingQueue, setDeletingQueue] = useState<QueueItem | null>(null);

  // Staff Success Modal
  const [staffSuccess, setStaffSuccess] = useState<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    password: string;
  } | null>(null);
  const [copiedStaffKey, setCopiedStaffKey] = useState(false);

  // Form states for creation
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [roomForm, setRoomForm] = useState({ department_id: "", name: "", room_number: "" });
  const [staffForm, setStaffForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
    role: "DOCTOR" as UserRole,
  });
  const [queueForm, setQueueForm] = useState({
    department_id: "",
    doctor_user_id: "",
    room_id: "",
    name: "",
    prefix: "",
    default_consult_time_min: 10,
  });

  // Edit form states
  const [editDeptForm, setEditDeptForm] = useState({ name: "", code: "" });
  const [editRoomForm, setEditRoomForm] = useState({ department_id: "", name: "", room_number: "" });
  const [editStaffForm, setEditStaffForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "DOCTOR" as UserRole,
    is_active: true,
    password: "",
  });
  const [editQueueForm, setEditQueueForm] = useState({
    department_id: "",
    doctor_user_id: "",
    room_id: "",
    name: "",
    prefix: "",
    default_consult_time_min: 10,
    status: "OPEN" as QueueStatus,
  });

  const [actionLoading, setActionLoading] = useState(false);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await api.hospitalAdmin.getOverview();
      setOverview(data);
      if (data.departments.length > 0 && !roomForm.department_id) {
        setRoomForm((prev) => ({ ...prev, department_id: data.departments[0].id }));
        setQueueForm((prev) => ({ ...prev, department_id: data.departments[0].id }));
      }
    } catch (err: any) {
      if (err.message.includes("403") || err.message.includes("401")) {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    fetchOverview();
  }, [isAuthorized]);

  // ==========================================
  // DEPARTMENT HANDLERS
  // ==========================================
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.createDepartment(deptForm);
      setDeptForm({ name: "", code: "" });
      setIsDeptModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error creating department: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.updateDepartment(editingDept.id, editDeptForm);
      setEditingDept(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error updating department: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDept) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.deleteDepartment(deletingDept.id);
      setDeletingDept(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error deleting department: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // ROOM HANDLERS
  // ==========================================
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.department_id || !roomForm.room_number) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.createRoom({
        department_id: roomForm.department_id,
        room_number: roomForm.room_number,
        name: roomForm.name || `Room ${roomForm.room_number}`,
      });
      setRoomForm({ department_id: overview?.departments[0]?.id || "", name: "", room_number: "" });
      setIsRoomModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error creating room: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.updateRoom(editingRoom.id, editRoomForm);
      setEditingRoom(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error updating room: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoom) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.deleteRoom(deletingRoom.id);
      setDeletingRoom(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error deleting room: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // STAFF HANDLERS
  // ==========================================
  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.email || !staffForm.full_name || !staffForm.password) return;
    try {
      setActionLoading(true);
      const res = await api.hospitalAdmin.inviteStaff(staffForm);
      const tempCreds = {
        id: res.id,
        full_name: res.full_name,
        email: res.email,
        role: res.role,
        password: staffForm.password,
      };
      setStaffForm({
        full_name: "",
        email: "",
        password: "",
        phone_number: "",
        role: "DOCTOR" as UserRole,
      });
      setIsStaffModalOpen(false);
      setStaffSuccess(tempCreds);
      fetchOverview();
    } catch (err: any) {
      alert(`Error onboarding staff: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      setActionLoading(true);
      const payload: any = {
        full_name: editStaffForm.full_name,
        email: editStaffForm.email,
        phone_number: editStaffForm.phone_number,
        role: editStaffForm.role,
        is_active: editStaffForm.is_active,
      };
      if (editStaffForm.password && editStaffForm.password.length >= 6) {
        payload.password = editStaffForm.password;
      }
      await api.hospitalAdmin.updateStaff(editingStaff.id, payload);
      setEditingStaff(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error updating staff member: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deletingStaff) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.deleteStaff(deletingStaff.id);
      setDeletingStaff(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error deleting staff member: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // QUEUE HANDLERS
  // ==========================================
  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queueForm.department_id || !queueForm.name || !queueForm.prefix) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.createQueue({
        department_id: queueForm.department_id,
        doctor_user_id: queueForm.doctor_user_id || undefined,
        room_id: queueForm.room_id || undefined,
        name: queueForm.name,
        prefix: queueForm.prefix,
        default_consult_time_min: Number(queueForm.default_consult_time_min) || 10,
      });
      setQueueForm({
        department_id: overview?.departments[0]?.id || "",
        doctor_user_id: "",
        room_id: "",
        name: "",
        prefix: "",
        default_consult_time_min: 10,
      });
      setIsQueueModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error deploying queue: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQueue) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.updateQueue(editingQueue.id, {
        department_id: editQueueForm.department_id,
        doctor_user_id: editQueueForm.doctor_user_id || undefined,
        room_id: editQueueForm.room_id || undefined,
        name: editQueueForm.name,
        prefix: editQueueForm.prefix,
        default_consult_time_min: Number(editQueueForm.default_consult_time_min) || 10,
        status: editQueueForm.status,
      });
      setEditingQueue(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error updating queue: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQueue = async () => {
    if (!deletingQueue) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.deleteQueue(deletingQueue.id);
      setDeletingQueue(null);
      fetchOverview();
    } catch (err: any) {
      alert(`Error deleting queue: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || (loading && !overview)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest">
            Loading Hospital Management Suite...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP CLINICAL COMMAND BAR                                     */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-xs shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-extrabold text-slate-950 tracking-tight">
                {overview?.hospital_name || "Hospital Admin"}
              </h1>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                TENANT SUITE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Departments, Clinical Rooms, Staff Onboarding & OPD Queues
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-700 transition"
            title="Refresh Overview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-slate-800 font-mono truncate max-w-[120px] sm:max-w-none">
              {user?.full_name || "Hospital Admin"}
            </span>
          </div>
          <button
            onClick={() => {
              api.auth.logout();
              router.push("/login");
            }}
            title="Sign Out"
            className="p-2 bg-slate-100 hover:bg-rose-50 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-700 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN WORKSPACE                                               */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Departments</span>
              <Layers className="w-4 h-4 text-emerald-700" />
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-950 tracking-tight tabular-nums">
                {overview?.departments.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Clinical specialties</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Exam Rooms</span>
              <DoorOpen className="w-4 h-4 text-blue-700" />
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-blue-900 tracking-tight tabular-nums">
                {overview?.rooms.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Active clinical cabins</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Staff</span>
              <Users className="w-4 h-4 text-purple-700" />
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-purple-900 tracking-tight tabular-nums">
                {overview?.staff.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Doctors & Reception</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>OPD Queues</span>
              <Activity className="w-4 h-4 text-teal-700" />
            </span>
            <div className="my-2">
              <span className="text-2xl sm:text-3xl font-mono font-black text-teal-900 tracking-tight tabular-nums">
                {overview?.queues.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Live patient queues</span>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab("departments")}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === "departments"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Departments & Rooms
              </button>
              <button
                onClick={() => setActiveTab("staff")}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === "staff"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Staff Directory
              </button>
              <button
                onClick={() => setActiveTab("queues")}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeTab === "queues"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Live OPD Queues
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {activeTab === "departments" && (
                <>
                  <button
                    onClick={() => setIsDeptModalOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Department</span>
                  </button>
                  <button
                    onClick={() => setIsRoomModalOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Room</span>
                  </button>
                </>
              )}
              {activeTab === "staff" && (
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              )}
              {activeTab === "queues" && (
                <button
                  onClick={() => setIsQueueModalOpen(true)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy New Queue</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: DEPARTMENTS & ROOMS */}
          {activeTab === "departments" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {overview?.departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-base">{dept.name}</span>
                        <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                          {dept.code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingDept(dept);
                            setEditDeptForm({ name: dept.name, code: dept.code });
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
                          title="Edit Department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDept(dept)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition"
                          title="Delete Department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block mb-3">
                      Specialty Department ({dept.queue_count} active queues)
                    </span>

                    {/* Associated Rooms */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Assigned Examination Rooms ({overview.rooms.filter((r) => r.department_id === dept.id).length})
                        </span>
                      </div>
                      {overview.rooms.filter((r) => r.department_id === dept.id).length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No examination rooms assigned yet</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {overview.rooms
                            .filter((r) => r.department_id === dept.id)
                            .map((r) => (
                              <div
                                key={r.id}
                                className="group flex items-center space-x-1.5 text-xs font-mono bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg hover:border-slate-300 transition"
                              >
                                <span>Room {r.room_number} · {r.name}</span>
                                <div className="flex items-center space-x-0.5 opacity-80 group-hover:opacity-100">
                                  <button
                                    onClick={() => {
                                      setEditingRoom(r);
                                      setEditRoomForm({
                                        department_id: r.department_id,
                                        name: r.name,
                                        room_number: r.room_number,
                                      });
                                    }}
                                    className="p-0.5 text-slate-400 hover:text-blue-600"
                                    title="Edit Room"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingRoom(r)}
                                    className="p-0.5 text-slate-400 hover:text-rose-600"
                                    title="Delete Room"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: STAFF DIRECTORY */}
          {activeTab === "staff" && (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview?.staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-950">{s.full_name}</div>
                        <div className="text-xs font-mono text-slate-500">{s.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {s.phone_number || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.is_active ? (
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={async () => {
                              try {
                                await api.hospitalAdmin.resendStaffInvite(s.id);
                                alert(`Credentials and station login email dispatched to ${s.email}!`);
                              } catch (err: any) {
                                alert(`Failed to send email: ${err.message}`);
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition whitespace-nowrap"
                          >
                            Email Credentials
                          </button>
                          <button
                            onClick={() => {
                              setEditingStaff(s);
                              setEditStaffForm({
                                full_name: s.full_name,
                                email: s.email,
                                phone_number: s.phone_number || "",
                                role: s.role,
                                is_active: s.is_active,
                                password: "",
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStaff(s)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LIVE OPD QUEUES */}
          {activeTab === "queues" && (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Queue Name</th>
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Doctor</th>
                    <th className="py-3 px-4">Room</th>
                    <th className="py-3 px-4">Pacing</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview?.queues.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-950">{q.name}</td>
                      <td className="py-3.5 px-4 font-mono font-black text-emerald-800">
                        {q.prefix}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                        {overview.departments.find((d) => d.id === q.department_id)?.name || "General"}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                        {q.doctor_name || <span className="text-slate-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-700">
                        {q.room_number ? `Room ${q.room_number}` : <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700">
                        {q.default_consult_time_min}m
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                            q.status === "OPEN"
                              ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                              : q.status === "PAUSED"
                              ? "text-amber-800 bg-amber-50 border-amber-200"
                              : "text-slate-600 bg-slate-100 border-slate-200"
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingQueue(q);
                              setEditQueueForm({
                                department_id: q.department_id,
                                doctor_user_id: q.doctor_user_id || "",
                                room_id: q.room_id || "",
                                name: q.name,
                                prefix: q.prefix,
                                default_consult_time_min: q.default_consult_time_min,
                                status: q.status,
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                            title="Edit Queue"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingQueue(q)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition"
                            title="Delete Queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL: ADD DEPARTMENT                                        */}
      {/* ============================================================ */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Add Department</h3>
            <p className="text-xs text-slate-500 mb-4">Create a clinical department specialty</p>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  placeholder="CRD"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT DEPARTMENT                                       */}
      {/* ============================================================ */}
      {editingDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit Department</h3>
            <p className="text-xs text-slate-500 mb-4">Update department name or clinical code</p>
            <form onSubmit={handleUpdateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={editDeptForm.name}
                  onChange={(e) => setEditDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={editDeptForm.code}
                  onChange={(e) => setEditDeptForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE DEPARTMENT CONFIRMATION                         */}
      {/* ============================================================ */}
      {deletingDept && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Delete Department?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-800">{deletingDept.name} ({deletingDept.code})</strong>? This will remove all associated rooms and queues.
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDepartment}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                {actionLoading ? "Deleting..." : "Delete Department"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD ROOM                                              */}
      {/* ============================================================ */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Add Examination Room</h3>
            <p className="text-xs text-slate-500 mb-4">Add a clinical cabin to a department</p>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                <select
                  value={roomForm.department_id}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Room / Cabin Number *</label>
                <input
                  type="text"
                  required
                  placeholder="101"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Room Display Name</label>
                <input
                  type="text"
                  placeholder="Consultation Cabin A"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Create Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT ROOM                                             */}
      {/* ============================================================ */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit Examination Room</h3>
            <p className="text-xs text-slate-500 mb-4">Update room details or assigned department</p>
            <form onSubmit={handleUpdateRoom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                <select
                  value={editRoomForm.department_id}
                  onChange={(e) => setEditRoomForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Room / Cabin Number *</label>
                <input
                  type="text"
                  required
                  value={editRoomForm.room_number}
                  onChange={(e) => setEditRoomForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Room Display Name</label>
                <input
                  type="text"
                  value={editRoomForm.name}
                  onChange={(e) => setEditRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE ROOM CONFIRMATION                              */}
      {/* ============================================================ */}
      {deletingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Delete Room?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-800">Room {deletingRoom.room_number} ({deletingRoom.name})</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingRoom(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRoom}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                {actionLoading ? "Deleting..." : "Delete Room"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD STAFF                                             */}
      {/* ============================================================ */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Onboard Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create credentials for Doctors, Receptionists, or Clinic Assistants
            </p>
            <form onSubmit={handleInviteStaff} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Emily Watson"
                    value={staffForm.full_name}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="DOCTOR_ASSISTANT">Doctor Assistant</option>
                    <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    placeholder="+919876543210"
                    value={staffForm.phone_number}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min. 6 chars"
                    value={staffForm.password}
                    onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Provisioning..." : "Onboard Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT STAFF                                            */}
      {/* ============================================================ */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit Staff Member</h3>
            <p className="text-xs text-slate-500 mb-4">Update profile, role, status, or reset password</p>
            <form onSubmit={handleUpdateStaff} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editStaffForm.full_name}
                    onChange={(e) => setEditStaffForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role *</label>
                  <select
                    value={editStaffForm.role}
                    onChange={(e) => setEditStaffForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DOCTOR">Doctor</option>
                    <option value="RECEPTIONIST">Receptionist</option>
                    <option value="DOCTOR_ASSISTANT">Doctor Assistant</option>
                    <option value="HOSPITAL_ADMIN">Hospital Administrator</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editStaffForm.email}
                  onChange={(e) => setEditStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editStaffForm.phone_number}
                    onChange={(e) => setEditStaffForm((prev) => ({ ...prev, phone_number: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Account Status</label>
                  <select
                    value={editStaffForm.is_active ? "true" : "false"}
                    onChange={(e) => setEditStaffForm((prev) => ({ ...prev, is_active: e.target.value === "true" }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Suspended / Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reset Password (Leave blank to keep unchanged)</label>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={editStaffForm.password}
                  onChange={(e) => setEditStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE STAFF CONFIRMATION                             */}
      {/* ============================================================ */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Delete Staff Member?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-800">{deletingStaff.full_name} ({deletingStaff.email})</strong>?
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                {actionLoading ? "Deleting..." : "Delete Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DEPLOY QUEUE                                          */}
      {/* ============================================================ */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Deploy OPD Queue</h3>
            <p className="text-xs text-slate-500 mb-4">Link department, room, and assigned physician</p>
            <form onSubmit={handleCreateQueue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Queue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Cardiology OPD"
                  value={queueForm.name}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prefix *</label>
                  <input
                    type="text"
                    required
                    placeholder="CRD"
                    value={queueForm.prefix}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pacing Target (Min)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={queueForm.default_consult_time_min}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, default_consult_time_min: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                <select
                  value={queueForm.department_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Physician</label>
                  <select
                    value={queueForm.doctor_user_id}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, doctor_user_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {overview?.staff
                      .filter((s) => s.role === "DOCTOR")
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Room</label>
                  <select
                    value={queueForm.room_id}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, room_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {overview?.rooms
                      .filter((r) => !queueForm.department_id || r.department_id === queueForm.department_id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} ({r.name})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Deploying..." : "Deploy Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT QUEUE                                            */}
      {/* ============================================================ */}
      {editingQueue && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Edit OPD Queue</h3>
            <p className="text-xs text-slate-500 mb-4">Update queue parameters, assigned doctor, or room</p>
            <form onSubmit={handleUpdateQueue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Queue Name *</label>
                <input
                  type="text"
                  required
                  value={editQueueForm.name}
                  onChange={(e) => setEditQueueForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prefix *</label>
                  <input
                    type="text"
                    required
                    value={editQueueForm.prefix}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Pacing Target (Min)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editQueueForm.default_consult_time_min}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, default_consult_time_min: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Department *</label>
                  <select
                    value={editQueueForm.department_id}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, department_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    {overview?.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Queue Status</label>
                  <select
                    value={editQueueForm.status}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, status: e.target.value as QueueStatus }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Physician</label>
                  <select
                    value={editQueueForm.doctor_user_id}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, doctor_user_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {overview?.staff
                      .filter((s) => s.role === "DOCTOR")
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Room</label>
                  <select
                    value={editQueueForm.room_id}
                    onChange={(e) => setEditQueueForm((prev) => ({ ...prev, room_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Unassigned</option>
                    {overview?.rooms
                      .filter((r) => !editQueueForm.department_id || r.department_id === editQueueForm.department_id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          Room {r.room_number} ({r.name})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingQueue(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE QUEUE CONFIRMATION                             */}
      {/* ============================================================ */}
      {deletingQueue && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Delete Queue?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Are you sure you want to delete <strong className="text-slate-800">{deletingQueue.name} ({deletingQueue.prefix})</strong>? This will remove all associated tokens.
            </p>
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingQueue(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteQueue}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                {actionLoading ? "Deleting..." : "Delete Queue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: STAFF PROVISIONED SUCCESS POPUP                       */}
      {/* ============================================================ */}
      {staffSuccess && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl animate-fade-in text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Staff Account Created</h3>
                <p className="text-xs text-slate-500">Invitation credentials generated</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{staffSuccess.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {staffSuccess.role}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-bold text-slate-900">{staffSuccess.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Password:</span>
                <span className="font-bold text-slate-900">{staffSuccess.password}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `HQMS Staff Login:\nRole: ${staffSuccess.role}\nEmail: ${staffSuccess.email}\nPassword: ${staffSuccess.password}\nLogin URL: ${window.location.origin}/login`
                  );
                  setCopiedStaffKey(true);
                  setTimeout(() => setCopiedStaffKey(false), 2000);
                }}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
              >
                {copiedStaffKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStaffKey ? "Copied" : "Copy Credentials"}</span>
              </button>
              <button
                onClick={() => setStaffSuccess(null)}
                className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
