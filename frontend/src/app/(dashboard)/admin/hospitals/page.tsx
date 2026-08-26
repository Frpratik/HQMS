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
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api, HospitalSummary, HospitalProvisionResponse } from "@/lib/api";

export default function PlatformAdminHospitalsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthorized } = useRequireAuth(["SUPER_ADMIN"]);
  const [hospitals, setHospitals] = useState<HospitalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState<HospitalProvisionResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Form State
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
        admin_email: form.admin_email.trim().toLowerCase(),
        admin_password: form.admin_password,
        admin_phone: form.admin_phone.trim() || undefined,
        branch_name: form.branch_name.trim(),
        department_name: form.department_name.trim(),
        department_code: form.department_code.trim().toUpperCase(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });

      setProvisionSuccess(result);
      fetchHospitals();
    } catch (err: any) {
      alert(`Provisioning Failed: ${err.message}`);
    } finally {
      setProvisioning(false);
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

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
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
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950">HQMS Platform</span>
              <span className="text-xs bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md ml-2 border border-purple-200">
                Super Admin
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <span>{user?.email || "super.admin@platform.com"}</span>
          </div>

          <button
            onClick={fetchHospitals}
            title="Refresh Fleet"
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
      {/* MAIN CONTENT WORKSPACE                                       */}
      {/* ============================================================ */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header & Onboard Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 flex items-center space-x-2.5">
              <span>Multi-Tenant Hospital Fleet</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                {hospitals.length} Tenants
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Provision, monitor, and manage independent hospital organizations with strict tenant data isolation.
            </p>
          </div>

          <button
            onClick={() => {
              setProvisionSuccess(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs flex items-center space-x-2 text-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Hospital</span>
          </button>
        </div>

        {/* Fleet KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Hospitals</span>
              <Building2 className="w-4 h-4 text-purple-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-purple-900 tracking-tight tabular-nums">
                {hospitals.length}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Independent SaaS tenants</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active Facilities</span>
              <Layers className="w-4 h-4 text-emerald-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-emerald-900 tracking-tight tabular-nums">
                {totalBranches}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Total hospital branches</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Staff Accounts</span>
              <Users className="w-4 h-4 text-blue-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-blue-900 tracking-tight tabular-nums">
                {totalStaff}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Doctors & Receptionists</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Live OPD Queues</span>
              <Activity className="w-4 h-4 text-teal-700" />
            </span>
            <div className="my-2">
              <span className="text-3xl font-mono font-black text-teal-900 tracking-tight tabular-nums">
                {totalQueues}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">Real-time active queues</span>
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
                        <button
                          onClick={() => handleToggleStatus(h)}
                          title={h.is_active ? "Suspend Hospital" : "Activate Hospital"}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ml-auto border ${
                            h.is_active
                              ? "bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-800"
                              : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{h.is_active ? "Suspend" : "Activate"}</span>
                        </button>
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
              /* Input Form */
              <form onSubmit={handleProvision} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-purple-700" />
                    <span>Onboard New Hospital Tenant</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Hospital Official Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apollo Super Specialty Hospital"
                      value={form.name}
                      onChange={handleNameChange}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Unique Tenant Slug <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="apollo-care"
                      value={form.slug}
                      onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Hospital Admin Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Ramesh Sharma"
                        value={form.admin_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, admin_name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Admin Login Email <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="admin@apollo.com"
                        value={form.admin_email}
                        onChange={(e) => setForm((prev) => ({ ...prev, admin_email: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Admin Initial Password <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={form.admin_password}
                      onChange={(e) => setForm((prev) => ({ ...prev, admin_password: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Default Branch Name
                      </label>
                      <input
                        type="text"
                        value={form.branch_name}
                        onChange={(e) => setForm((prev) => ({ ...prev, branch_name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Default Department Code
                      </label>
                      <input
                        type="text"
                        value={form.department_code}
                        onChange={(e) => setForm((prev) => ({ ...prev, department_code: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={provisioning}
                    className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-xs"
                  >
                    {provisioning ? "Provisioning Tenant..." : "Create Hospital Tenant"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
