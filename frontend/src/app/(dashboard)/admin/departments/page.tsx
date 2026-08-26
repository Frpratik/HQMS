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
} from "@/lib/api";

type ActiveTab = "departments" | "staff" | "queues";

export default function HospitalAdminDepartmentsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthorized } = useRequireAuth(["HOSPITAL_ADMIN"]);
  const [overview, setOverview] = useState<HospitalAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("departments");

  // Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Form states
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

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.department_id || !roomForm.room_number) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.createRoom(roomForm);
      setRoomForm((prev) => ({ ...prev, name: "", room_number: "" }));
      setIsRoomModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error creating room: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.full_name || !staffForm.email || !staffForm.password) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.inviteStaff(staffForm);
      setStaffForm({
        full_name: "",
        email: "",
        password: "",
        phone_number: "",
        role: "DOCTOR",
      });
      setIsStaffModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error creating staff member: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    const deptId = queueForm.department_id || overview?.departments[0]?.id;
    if (!queueForm.name || !queueForm.prefix || !deptId) {
      alert("Please select a department and fill in queue name and prefix.");
      return;
    }
    try {
      setActionLoading(true);
      await api.hospitalAdmin.createQueue({
        ...queueForm,
        department_id: deptId,
        doctor_user_id: queueForm.doctor_user_id || undefined,
        room_id: queueForm.room_id || undefined,
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

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
  };

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Activity className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <span className="text-sm font-bold text-slate-300">Verifying Hospital Administration Privileges...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP NAVIGATION BAR                                           */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950">
                {overview?.hospital_name || "Hospital Admin"}
              </span>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md ml-2 border border-emerald-200">
                Operations Console
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>{user?.email || "admin@hospital.com"}</span>
          </div>

          <button
            onClick={fetchOverview}
            title="Refresh Facility Topology"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Departments</span>
              <Layers className="w-4 h-4 text-emerald-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-slate-950 tracking-tight tabular-nums">
                {overview?.departments.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Clinical specialties</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Examination Rooms</span>
              <DoorOpen className="w-4 h-4 text-blue-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-blue-900 tracking-tight tabular-nums">
                {overview?.rooms.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Active clinical cabins</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Hospital Staff</span>
              <Users className="w-4 h-4 text-purple-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-purple-900 tracking-tight tabular-nums">
                {overview?.staff.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Doctors & Receptionists</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active OPD Queues</span>
              <Activity className="w-4 h-4 text-teal-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-teal-900 tracking-tight tabular-nums">
                {overview?.queues.length || 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Real-time patient queues</span>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("departments")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "departments"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Departments & Rooms
              </button>
              <button
                onClick={() => setActiveTab("staff")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === "staff"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Staff Directory
              </button>
              <button
                onClick={() => setActiveTab("queues")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
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
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Department</span>
                  </button>
                  <button
                    onClick={() => setIsRoomModalOpen(true)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Room</span>
                  </button>
                </>
              )}
              {activeTab === "staff" && (
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Staff Member</span>
                </button>
              )}
              {activeTab === "queues" && (
                <button
                  onClick={() => setIsQueueModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition"
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
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-900 text-base">{dept.name}</span>
                      <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-md">
                        {dept.code}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block mb-3">
                      Specialty Department
                    </span>

                    {/* Associated Rooms */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Assigned Consultation Rooms
                      </span>
                      {overview.rooms.filter((r) => r.department_id === dept.id).length === 0 ? (
                        <div className="text-xs text-slate-400 italic">No rooms assigned yet</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {overview.rooms
                            .filter((r) => r.department_id === dept.id)
                            .map((r) => (
                              <span
                                key={r.id}
                                className="text-xs font-mono bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg"
                              >
                                Room {r.room_number} · {r.name}
                              </span>
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
            <div className="overflow-x-auto">
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
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={async () => {
                            try {
                              await api.hospitalAdmin.resendStaffInvite(s.id);
                              alert(`Credentials and station login email dispatched to ${s.email}!`);
                            } catch (err: any) {
                              alert(`Failed to send email: ${err.message}`);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg transition"
                        >
                          Email Credentials
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: LIVE OPD QUEUES */}
          {activeTab === "queues" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Queue Name</th>
                    <th className="py-3 px-4">Prefix</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Pacing Target</th>
                    <th className="py-3 px-4">Status</th>
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
                      <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700">
                        {q.default_consult_time_min} mins
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {q.status}
                        </span>
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-xl animate-fade-in text-slate-900">
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
      {/* MODAL: ADD ROOM                                              */}
      {/* ============================================================ */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-xl animate-fade-in text-slate-900">
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
      {/* MODAL: ADD STAFF MEMBER                                      */}
      {/* ============================================================ */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-xl animate-fade-in text-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Add Staff Account</h3>
            <p className="text-xs text-slate-500 mb-4">Create physician or receptionist login</p>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Ananya Roy"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@hospital.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
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
                </select>
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
                  {actionLoading ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DEPLOY NEW QUEUE                                       */}
      {/* ============================================================ */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-xl animate-fade-in text-slate-900">
            <h3 className="text-lg font-extrabold text-slate-900 mb-1">Deploy Live Queue</h3>
            <p className="text-xs text-slate-500 mb-4">Set up a live consultation queue</p>
            <form onSubmit={handleCreateQueue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Queue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Cardiology Morning OPD"
                  value={queueForm.name}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Token Prefix *</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Department</label>
                <select
                  value={queueForm.department_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Department --</option>
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Doctor</label>
                <select
                  value={queueForm.doctor_user_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, doctor_user_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Select Doctor (Optional) --</option>
                  {overview?.staff
                    .filter((s) => s.role === "DOCTOR")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} ({d.email})
                      </option>
                    ))}
                </select>
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
                  {actionLoading ? "Deploying..." : "Deploy Live Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
