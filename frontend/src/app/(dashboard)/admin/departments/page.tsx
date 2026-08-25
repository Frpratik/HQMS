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
  const [overview, setOverview] = useState<HospitalAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("departments");
  const [user, setUser] = useState<any>(null);

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
    const activeUser = api.auth.getUser();
    if (!activeUser || (activeUser.role !== "HOSPITAL_ADMIN" && activeUser.role !== "SUPER_ADMIN")) {
      if (activeUser?.role === "DOCTOR") router.push("/doctor");
      else if (activeUser?.role === "RECEPTIONIST") router.push("/reception");
      else router.push("/login");
      return;
    }
    setUser(activeUser);
    fetchOverview();
  }, []);

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

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.full_name || !staffForm.email || !staffForm.password) return;
    try {
      setActionLoading(true);
      await api.hospitalAdmin.inviteStaff({
        full_name: staffForm.full_name,
        email: staffForm.email,
        password: staffForm.password,
        phone_number: staffForm.phone_number || undefined,
        role: staffForm.role,
      });
      setStaffForm({
        full_name: "",
        email: "",
        password: "",
        phone_number: "",
        role: "DOCTOR" as UserRole,
      });
      setIsStaffModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      alert(`Error inviting staff: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

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
        prefix: queueForm.prefix.toUpperCase(),
        default_consult_time_min: Number(queueForm.default_consult_time_min),
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
      alert(`Error creating queue: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center font-black text-slate-950 shadow-md shadow-teal-500/20">
              <Building2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                {overview?.hospital_name || "HQMS Hospital Admin"}
              </span>
              <span className="text-xs bg-teal-500/20 text-teal-300 font-semibold px-2 py-0.5 rounded-md ml-2">
                Tenant: {overview?.hospital_slug || "..."}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>{user?.email || "admin@hospital.com"}</span>
          </div>

          <button
            onClick={fetchOverview}
            title="Refresh"
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 bg-slate-800 hover:bg-rose-900/40 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Top Header & Tab Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Hospital Operations Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Configure OPD clinical departments, register doctors, assign consultation rooms, and deploy live queues.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("departments")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === "departments"
                  ? "bg-teal-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Departments ({overview?.departments.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("staff")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === "staff"
                  ? "bg-teal-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff ({overview?.staff.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab("queues")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
                activeTab === "queues"
                  ? "bg-teal-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Queues ({overview?.queues.length || 0})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DEPARTMENTS & ROOMS */}
        {activeTab === "departments" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <span>Clinical OPD Departments & Rooms</span>
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsRoomModalOpen(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Room</span>
                </button>
                <button
                  onClick={() => setIsDeptModalOpen(true)}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-teal-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Department</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {overview?.departments.map((dept) => {
                const deptRooms = overview.rooms.filter((r) => r.department_id === dept.id);
                const deptQueues = overview.queues.filter((q) => q.department_id === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-teal-500/40 transition space-y-4 shadow-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-extrabold text-white text-base">{dept.name}</h3>
                        <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                          Code: {dept.code}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Room Chips */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Consultation Rooms ({deptRooms.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {deptRooms.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No rooms added yet</span>
                        ) : (
                          deptRooms.map((r) => (
                            <span
                              key={r.id}
                              className="text-xs bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 font-mono"
                            >
                              Room {r.room_number} ({r.name})
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Associated Queues */}
                    <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>Active Queues:</span>
                      <span className="font-bold text-white">{deptQueues.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DOCTORS & STAFF */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-teal-400" />
                <span>Clinical Staff Directory</span>
              </h2>
              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Invite Staff Member</span>
              </button>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Work Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {overview?.staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-6 py-4 font-bold text-white flex items-center space-x-2">
                        {s.role === "DOCTOR" ? (
                          <Stethoscope className="w-4 h-4 text-emerald-400" />
                        ) : s.role === "HOSPITAL_ADMIN" ? (
                          <Shield className="w-4 h-4 text-purple-400" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-blue-400" />
                        )}
                        <span>{s.full_name}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-300">{s.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            s.role === "DOCTOR"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : s.role === "HOSPITAL_ADMIN"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                              : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                          }`}
                        >
                          {s.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          ACTIVE
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: LIVE QUEUES */}
        {activeTab === "queues" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-teal-400" />
                <span>Live Outpatient Queues</span>
              </h2>
              <button
                onClick={() => setIsQueueModalOpen(true)}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-teal-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Deploy New Queue</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {overview?.queues.map((q) => (
                <div
                  key={q.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-teal-500/40 transition space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-base">{q.name}</h3>
                      <span className="text-xs font-mono font-bold text-teal-400">
                        Prefix: {q.prefix} | Sequence: #{q.current_sequence}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {q.status}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Department:</span>
                      <span className="font-bold text-slate-300">{q.department_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Doctor:</span>
                      <span className="font-bold text-emerald-400">{q.doctor_name || "Unassigned"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Consultation Room:</span>
                      <span className="font-bold text-slate-300">Room {q.room_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pacing Pace:</span>
                      <span className="font-bold text-teal-300">{q.default_consult_time_min} mins/pt</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD DEPARTMENT */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-teal-400" />
              <span>Add OPD Clinical Department</span>
            </h2>
            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pediatrics OPD"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="PED"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono text-teal-400 uppercase focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs"
                >
                  {actionLoading ? "Creating..." : "Save Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ROOM */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <DoorOpen className="w-5 h-5 text-teal-400" />
              <span>Add Consultation Room</span>
            </h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Department</label>
                <select
                  value={roomForm.department_id}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                >
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  placeholder="201"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Room Label / Name</label>
                <input
                  type="text"
                  required
                  placeholder="Consultation Cabin A"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs"
                >
                  {actionLoading ? "Creating..." : "Save Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVITE STAFF */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-teal-400" />
              <span>Invite Clinical Staff</span>
            </h2>
            <form onSubmit={handleInviteStaff} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Sunita Rao"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, full_name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  placeholder="sunita@hospital.com"
                  value={staffForm.email}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Staff Role</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="DOCTOR">Doctor (Consultation Console)</option>
                  <option value="RECEPTIONIST">Receptionist (Walk-in Desk)</option>
                  <option value="DOCTOR_ASSISTANT">Doctor Assistant</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs"
                >
                  {actionLoading ? "Inviting..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QUEUE */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <Activity className="w-5 h-5 text-teal-400" />
              <span>Deploy New Live Queue</span>
            </h2>
            <form onSubmit={handleCreateQueue} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Queue Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Rao Pediatrics OPD"
                  value={queueForm.name}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Token Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="PED"
                    value={queueForm.prefix}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, prefix: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono text-teal-400 uppercase focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Pacing (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={queueForm.default_consult_time_min}
                    onChange={(e) => setQueueForm((prev) => ({ ...prev, default_consult_time_min: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Department</label>
                <select
                  value={queueForm.department_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                >
                  {overview?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Assigned Doctor</label>
                <select
                  value={queueForm.doctor_user_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, doctor_user_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
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
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Consultation Room</label>
                <select
                  value={queueForm.room_id}
                  onChange={(e) => setQueueForm((prev) => ({ ...prev, room_id: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Select Room (Optional) --</option>
                  {overview?.rooms
                    .filter((r) => !queueForm.department_id || r.department_id === queueForm.department_id)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} - {r.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQueueModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-xl text-xs"
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
