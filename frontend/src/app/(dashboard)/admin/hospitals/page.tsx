"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  ShieldCheck,
  Activity,
  Users,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Power,
  Copy,
  Check,
  Search,
  Edit3,
  Trash2,
  Mail,
  X,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, HospitalSummary, HospitalProvisionResponse } from "@/lib/api";

export default function PlatformAdminHospitalsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthorized } = useRequireAuth(["SUPER_ADMIN"]);
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State: Onboard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState<HospitalProvisionResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Modal State: Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalSummary | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
  });
  const [updating, setUpdating] = useState(false);

  // Form State: Onboard
  const [form, setForm] = useState({
    name: "",
    slug: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
    admin_phone: "",
    branch_name: "Main Facility",
    department_name: "General OPD",
    department_code: "OPD",
    address: "",
    phone: "",
  });

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const data = await api.platform.listHospitals();
      setHospitals(data);
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
    fetchHospitals();
  }, [isAuthorized]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setForm((prev) => ({
      ...prev,
      name: val,
      slug: generatedSlug,
    }));
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.admin_name || !form.admin_email || !form.admin_password) {
      alert("Please fill in all mandatory fields.");
      return;
    }

    try {
      setProvisioning(true);
      const result = await api.platform.provisionHospital({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
        admin_password: form.admin_password,
        admin_phone: form.admin_phone?.trim() || undefined,
        branch_name: form.branch_name.trim(),
        department_name: form.department_name.trim(),
        department_code: form.department_code.trim(),
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      });

      setProvisionSuccess(result);
      fetchHospitals();
    } catch (err: any) {
      alert(`Provisioning Failed: ${err.message}`);
    } finally {
      setProvisioning(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (h: HospitalSummary) => {
    setEditingHospital(h);
    setEditForm({
      name: h.name,
      slug: h.slug,
      address: h.address || "",
      phone: h.phone || "",
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Hospital
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital || !editForm.name) return;

    try {
      setUpdating(true);
      await api.platform.updateHospital(editingHospital.id, {
        name: editForm.name.trim(),
        slug: editForm.slug.trim(),
        address: editForm.address.trim(),
        phone: editForm.phone.trim(),
      });
      setIsEditModalOpen(false);
      setEditingHospital(null);
      fetchHospitals();
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  // Delete Hospital with Confirmation
  const handleDeleteHospital = async (hospital: HospitalSummary) => {
    const confirmed = confirm(
      `⚠️ PERMANENT DELETION WARNING:\n\nAre you sure you want to permanently DELETE "${hospital.name}"?\n\nThis will purge all associated departments, rooms, queues, staff accounts, and patient tokens for this tenant.`
    );
    if (!confirmed) return;

    try {
      await api.platform.deleteHospital(hospital.id);
      fetchHospitals();
      alert(`Hospital "${hospital.name}" has been permanently deleted.`);
    } catch (err: any) {
      alert(`Deletion Failed: ${err.message}`);
    }
  };

  const handleToggleStatus = async (hospital: HospitalSummary) => {
    const nextStatus = !hospital.is_active;
    const confirmed = confirm(
      `Are you sure you want to ${nextStatus ? "ACTIVATE" : "SUSPEND"} "${hospital.name}"?`
    );
    if (!confirmed) return;

    try {
      await api.platform.updateStatus(hospital.id, nextStatus);
      fetchHospitals();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleResendEmail = async (hospitalId: string, name: string) => {
    try {
      const res = await api.platform.resendWelcomeEmail(hospitalId);
      alert(`Welcome credentials email successfully dispatched to ${res.recipient}!`);
    } catch (err: any) {
      alert(`Failed to send email: ${err.message}`);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    router.push("/platform-control/login");
  };

  const copyCredentials = () => {
    if (!provisionSuccess) return;
    const text = `Hospital: ${provisionSuccess.name}\nAdmin Login: ${provisionSuccess.admin_email}\nTemporary Password: ${form.admin_password}\nPortal URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBranches = hospitals.reduce((acc, h) => acc + h.branch_count, 0);
  const totalStaff = hospitals.reduce((acc, h) => acc + h.staff_count, 0);
  const totalQueues = hospitals.reduce((acc, h) => acc + h.queue_count, 0);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Activity className="w-8 h-8 text-purple-400 animate-spin mb-3" />
        <span className="text-sm font-bold text-slate-300">Verifying Super Admin Authorization...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-purple-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP NAVIGATION BAR                                           */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950">HQMS Platform</span>
              <span className="text-xs bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md ml-2 border border-purple-200">
                Super Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setProvisionSuccess(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Hospital</span>
          </button>

          <button
            onClick={fetchHospitals}
            title="Refresh list"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA                                            */}
      {/* ============================================================ */}
      <main className="max-w-7xl w-full mx-auto p-6 space-y-6 flex-1">
        {/* KPI Fleet Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Hospitals
              </span>
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">{hospitals.length}</div>
            <span className="text-xs text-slate-500 font-medium">Provisioned Tenants</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Branches
              </span>
              <Layers className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">{totalBranches}</div>
            <span className="text-xs text-slate-500 font-medium">Physical Facilities</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Clinical Staff
              </span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">{totalStaff}</div>
            <span className="text-xs text-slate-500 font-medium">Doctors & Receptionists</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total OPD Queues
              </span>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                Live
              </span>
            </div>
            <div className="text-3xl font-black text-slate-950 font-mono">{totalQueues}</div>
            <span className="text-xs text-slate-500 font-medium">Active Queue Engines</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center space-x-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <Search className="w-4 h-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search hospitals by name or unique slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none w-full font-medium"
          />
        </div>

        {/* Hospitals Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Hospital Name & Slug</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-center">Branches</th>
                  <th className="px-6 py-3.5 text-center">Staff</th>
                  <th className="px-6 py-3.5 text-center">Queues</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
                      Loading hospital fleet...
                    </td>
                  </tr>
                ) : filteredHospitals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 font-semibold text-xs">
                      No hospitals found. Click "Onboard Hospital" to provision your first tenant.
                    </td>
                  </tr>
                ) : (
                  filteredHospitals.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-950">{h.name}</div>
                        <div className="text-xs font-mono text-purple-700 mt-0.5">
                          slug: {h.slug}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {h.is_active ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            <span>SUSPENDED</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                        {h.branch_count}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-700">
                        {h.staff_count}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-teal-800">
                        {h.queue_count}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {new Date(h.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Resend Welcome Email */}
                          <button
                            onClick={() => handleResendEmail(h.id, h.name)}
                            title="Resend Welcome & Credentials Email"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Hospital */}
                          <button
                            onClick={() => openEditModal(h)}
                            title="Edit Hospital Profile"
                            className="p-1.5 text-slate-600 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Suspend */}
                          <button
                            onClick={() => handleToggleStatus(h)}
                            title={h.is_active ? "Suspend Hospital" : "Activate Hospital"}
                            className={`p-1.5 rounded-lg border transition ${
                              h.is_active
                                ? "text-amber-700 hover:bg-amber-50 border-amber-200"
                                : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Hospital */}
                          <button
                            onClick={() => handleDeleteHospital(h)}
                            title="Delete Hospital Tenant"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* MODAL: ONBOARD NEW HOSPITAL TENANT                           */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative my-8 text-slate-900">
            {provisionSuccess ? (
              /* Success View */
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Hospital Onboarded Successfully!</h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    "{provisionSuccess.name}" has been provisioned with its own isolated partition, default branch, OPD queue, and administrator account.
                  </p>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 font-semibold flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Welcome email with credentials was dispatched to <strong>{provisionSuccess.admin_email}</strong></span>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-left font-mono text-xs space-y-2.5">
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Tenant Slug:</span>
                    <span className="text-purple-700 font-bold">{provisionSuccess.slug}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Admin Email:</span>
                    <span className="text-slate-900 font-bold">{provisionSuccess.admin_email}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span className="text-slate-500">Initial Password:</span>
                    <span className="text-amber-800 font-bold">{form.admin_password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Default Queue ID:</span>
                    <span className="text-slate-600 truncate max-w-[200px]">{provisionSuccess.default_queue_id}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!provisionSuccess) return;
                      try {
                        await api.platform.resendWelcomeEmail(provisionSuccess.id);
                        alert(`Welcome credentials email re-sent to ${provisionSuccess.admin_email}!`);
                      } catch (err: any) {
                        alert(`Failed to send email: ${err.message}`);
                      }
                    }}
                    className="w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition border border-purple-200"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Resend Email</span>
                  </button>

                  <button
                    onClick={copyCredentials}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition border border-slate-200"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? "Credentials Copied!" : "Copy Admin Credentials"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setProvisionSuccess(null);
                      setForm({
                        name: "",
                        slug: "",
                        admin_name: "",
                        admin_email: "",
                        admin_password: "",
                        admin_phone: "",
                        branch_name: "Main Facility",
                        department_name: "General OPD",
                        department_code: "OPD",
                        address: "",
                        phone: "",
                      });
                    }}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs transition shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Provision Form View */
              <form onSubmit={handleProvision} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Onboard New Hospital Tenant</h2>
                    <p className="text-xs text-slate-500">Atomic setup of facility, admin account, and starter OPD queue</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                    1. Hospital Organization Profile
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Hospital Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={handleNameChange}
                        placeholder="e.g. Apollo City Hospital"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Unique Slug Identifier <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        placeholder="apollo-city-hospital"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
                    2. Primary Hospital Administrator
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Admin Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.admin_name}
                        onChange={(e) => setForm({ ...form, admin_name: e.target.value })}
                        placeholder="Dr. Rajesh Gupta"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Admin Login Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.admin_email}
                        onChange={(e) => setForm({ ...form, admin_email: e.target.value })}
                        placeholder="admin@apollo.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Initial Master Password <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.admin_password}
                        onChange={(e) => setForm({ ...form, admin_password: e.target.value })}
                        placeholder="AdminPass123!"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone (Optional)
                      </label>
                      <input
                        type="text"
                        value={form.admin_phone}
                        onChange={(e) => setForm({ ...form, admin_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {provisioning ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin" />
                        <span>Provisioning & Dispatching Email...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Onboarding</span>
                        <Plus className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT HOSPITAL PROFILE                                 */}
      {/* ============================================================ */}
      {isEditModalOpen && editingHospital && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-fade-in relative text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Update Hospital Profile</h2>
                <p className="text-xs text-slate-500">Edit metadata for "{editingHospital.name}"</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hospital Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Unique Slug Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.slug}
                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Plot 42, Medical Enclave"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
