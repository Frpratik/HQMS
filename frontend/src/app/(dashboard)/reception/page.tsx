"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Printer,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  LogOut,
  ExternalLink,
  ChevronRight,
  Stethoscope,
  Activity,
  QrCode,
  Building2,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { Queue, QueueSummary, QueueToken, PriorityLevel, Gender } from "@/types/queue";

export default function ReceptionDashboardPage() {
  const router = useRouter();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | "READY" | "AWAY" | "MISSED">("ALL");

  // Walk-in Registration Modal State
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientGender, setPatientGender] = useState<Gender>("UNSPECIFIED");
  const [priority, setPriority] = useState<PriorityLevel>("NORMAL");
  const [notes, setNotes] = useState("");
  const [issuingToken, setIssuingToken] = useState(false);

  // Token Slip Print Modal State
  const [lastIssuedToken, setLastIssuedToken] = useState<QueueToken | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch Queues on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const queueList = await api.queues.list();
        setQueues(queueList);
        if (queueList.length > 0) {
          setSelectedQueueId(queueList[0].id);
        }
      } catch (err) {
        console.error("Failed to load queues:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch Queue Summary whenever selectedQueueId changes
  const fetchSummary = useCallback(async () => {
    if (!selectedQueueId) return;
    try {
      const data = await api.reception.getSummary(selectedQueueId);
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch queue summary:", err);
    }
  }, [selectedQueueId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Real-time WebSocket synchronization
  useQueueWebSocket(selectedQueueId, {
    channel: "public",
    onEvent: () => {
      fetchSummary();
    },
  });

  const handleIssueWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueId || !patientName.trim()) return;

    setIssuingToken(true);
    try {
      const newToken = await api.reception.issueWalkIn({
        queue_id: selectedQueueId,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim() || undefined,
        patient_gender: patientGender,
        priority: priority,
        notes: notes.trim() || undefined,
      });

      setLastIssuedToken(newToken);
      setShowWalkInModal(false);
      setShowPrintModal(true);

      // Reset form
      setPatientName("");
      setPatientPhone("");
      setPatientGender("UNSPECIFIED");
      setPriority("NORMAL");
      setNotes("");

      fetchSummary();
    } catch (err: any) {
      alert(`Error issuing token: ${err.message}`);
    } finally {
      setIssuingToken(false);
    }
  };

  const handleRejoin = async (tokenId: string) => {
    try {
      await api.doctor.rejoin(tokenId);
      fetchSummary();
    } catch (err: any) {
      alert(`Failed to rejoin token: ${err.message}`);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
  };

  const filteredTokens = (summary?.active_tokens || []).filter((t) => {
    if (activeTab === "READY") return t.status === "READY" || t.status === "RETURNING";
    if (activeTab === "AWAY") return t.status === "AWAY";
    if (activeTab === "MISSED") return t.status === "MISSED";
    return true;
  });

  const isPaused = summary?.queue.status === "PAUSED";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP NAVIGATION BAR                                           */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950">HQMS Front Desk</span>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md ml-2 border border-slate-200">
                Reception Desk
              </span>
            </div>
          </Link>
        </div>

        {/* Active Queue Switcher & Global Actions */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
            Active Queue:
          </label>
          <select
            value={selectedQueueId || ""}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className={`border text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 shadow-xs ${
              isPaused
                ? "bg-amber-50 border-amber-300 text-amber-950 focus:ring-amber-500"
                : "bg-slate-50 border-slate-300 text-slate-900 focus:ring-emerald-500"
            }`}
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.prefix})
              </option>
            ))}
          </select>

          {isPaused && (
            <span className="hidden sm:inline-flex items-center space-x-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black px-2.5 py-1 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
              <span>DOCTOR PAUSED</span>
            </span>
          )}

          <button
            onClick={() => fetchSummary()}
            title="Refresh Live Queue"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 text-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
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
      {!loading && queues.length === 0 ? (
        <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col items-center justify-center text-center my-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center mx-auto">
              <Users className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">No OPD Queues Found in Hospital</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              There are no active OPD consultation queues deployed in your hospital yet. Please contact your Hospital Administrator to deploy a queue in the Operations Console.
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* DOCTOR UNAVAILABLE / QUEUE PAUSED ALERT BANNER */}
          {isPaused && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex items-start sm:items-center justify-between gap-4 text-amber-950 animate-fade-in">
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-800">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base text-amber-900 block uppercase tracking-tight">
                  DOCTOR TEMPORARILY UNAVAILABLE / CONSULTATIONS PAUSED
                </span>
                <p className="text-xs sm:text-sm text-amber-800 mt-0.5 font-medium">
                  The consulting physician has paused this queue. Walk-in registration remains open; patients will see updated wait times on their trackers.
                </p>
              </div>
            </div>
            <div className="shrink-0 hidden md:block text-right font-mono text-xs text-amber-900 font-bold bg-white px-3 py-1.5 rounded-lg border border-amber-300">
              STATUS: PAUSED
            </div>
          </div>
        )}

        {/* KPI & LIVE SERVING HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Currently Serving */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Now Serving</span>
              {isPaused ? (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </span>
            <div className="my-2">
              <span className={`text-3xl sm:text-4xl font-mono font-black tracking-tight tabular-nums ${isPaused ? "text-amber-700" : "text-slate-950"}`}>
                {isPaused
                  ? "PAUSED"
                  : summary?.currently_serving_token?.token_display_number || "—"}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium truncate">
              {isPaused
                ? "Procedure in progress"
                : summary?.currently_serving_token
                ? "Inside Cabin 101"
                : "Doctor waiting for patient"}
            </span>
          </div>

          {/* Card 2: Currently Called */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Called / Entering Room
            </span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-mono font-black text-amber-800 tracking-tight tabular-nums">
                {summary?.currently_called_token?.token_display_number || "—"}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium truncate">
              {summary?.currently_called_token ? "Walking into room" : "No active call"}
            </span>
          </div>

          {/* Card 3: Waiting in OPD */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Waiting in OPD
            </span>
            <div className="my-2">
              <span className="text-3xl sm:text-4xl font-mono font-black text-emerald-700 tracking-tight tabular-nums">
                {summary?.total_ready ?? 0}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium truncate">
              {summary?.total_away ?? 0} marked stepped away
            </span>
          </div>

          {/* Card 4: Action Button */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-center items-center text-center">
            <button
              onClick={() => setShowWalkInModal(true)}
              className="w-full h-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xs transition flex items-center justify-center space-x-2 text-sm active:scale-[0.99]"
            >
              <Plus className="w-5 h-5" />
              <span>Issue Walk-In Token</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* LIVE QUEUE TABLE CARD                                        */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Tabs & Controls Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Active ({summary?.active_tokens.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("READY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "READY"
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Ready in OPD ({summary?.total_ready || 0})
              </button>
              <button
                onClick={() => setActiveTab("AWAY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "AWAY"
                    ? "bg-amber-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Stepped Away ({summary?.total_away || 0})
              </button>
              <button
                onClick={() => setActiveTab("MISSED")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "MISSED"
                    ? "bg-rose-700 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Missed (Rejoin)
              </button>
            </div>

            <div className="text-xs text-slate-500 font-semibold flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span>Real-Time Stream Connected</span>
            </div>
          </div>

          {/* Queue Scannable Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 font-bold">Pos</th>
                  <th className="py-3 px-5 font-bold">Token #</th>
                  <th className="py-3 px-5 font-bold">Priority</th>
                  <th className="py-3 px-5 font-bold">Status</th>
                  <th className="py-3 px-5 font-bold">Est. Wait</th>
                  <th className="py-3 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400 font-semibold text-xs">
                      No active patients currently in this category
                    </td>
                  </tr>
                ) : (
                  filteredTokens.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-5 font-mono font-black text-slate-400">
                        #{t.operational_position ?? "—"}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="font-mono font-black text-slate-950 text-base tracking-tight tabular-nums">
                          {t.token_display_number}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {t.priority === "EMERGENCY" && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase">
                            EMERGENCY
                          </span>
                        )}
                        {t.priority === "HIGH" && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase">
                            HIGH PRIORITY
                          </span>
                        )}
                        {t.priority === "NORMAL" && (
                          <span className="text-slate-500 text-xs font-medium">Normal</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        {t.status === "READY" && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-md">
                            Ready in OPD
                          </span>
                        )}
                        {t.status === "AWAY" && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-md">
                            Stepped Away
                          </span>
                        )}
                        {t.status === "RETURNING" && (
                          <span className="bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-md">
                            Returning
                          </span>
                        )}
                        {t.status === "CALLED" && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black px-2.5 py-0.5 rounded-md animate-pulse">
                            CALLED NOW
                          </span>
                        )}
                        {t.status === "SERVING" && (
                          <span className="bg-slate-100 text-slate-800 border border-slate-300 text-xs font-black px-2.5 py-0.5 rounded-md">
                            Inside Room
                          </span>
                        )}
                        {t.status === "MISSED" && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                            Missed Turn
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-700 text-xs font-bold">
                        {t.estimated_wait_min !== null && t.estimated_wait_max !== null
                          ? `${t.estimated_wait_min}–${t.estimated_wait_max}m`
                          : "Immediate"}
                      </td>
                      <td className="py-3.5 px-5 text-right space-x-2">
                        {t.status === "MISSED" && (
                          <button
                            onClick={() => handleRejoin(t.id)}
                            className="text-xs bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 font-bold px-3 py-1 rounded-lg transition"
                          >
                            Rejoin
                          </button>
                        )}
                        <Link
                          href={`/q/${t.public_id}`}
                          target="_blank"
                          className="text-xs text-slate-500 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 inline-flex items-center transition border border-slate-200"
                          title="Open Patient Live Tracker"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      )}

      {/* ============================================================ */}
      {/* MODAL: WALK-IN TOKEN REGISTRATION FORM                       */}
      {/* ============================================================ */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Issue Walk-In Token</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Register patient and assign instant operational queue slot
            </p>

            <form onSubmit={handleIssueWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone (SMS Alerts)
                  </label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as Gender)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UNSPECIFIED">Unspecified</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Clinical Priority Triage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["NORMAL", "HIGH", "EMERGENCY"] as PriorityLevel[]).map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`py-2.5 text-xs font-bold rounded-xl border transition ${
                        priority === p
                          ? p === "EMERGENCY"
                            ? "bg-rose-700 border-rose-800 text-white shadow-xs"
                            : p === "HIGH"
                            ? "bg-amber-600 border-amber-700 text-white shadow-xs"
                            : "bg-slate-900 border-slate-950 text-white shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {p === "HIGH" ? "HIGH (Elderly)" : p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chief Complaint / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional consultation notes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={issuingToken}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  {issuingToken ? "Generating..." : "Generate & Print Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PRINTABLE THERMAL TOKEN SLIP                          */}
      {/* ============================================================ */}
      {showPrintModal && lastIssuedToken && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            {/* Printable Thermal Receipt Layout */}
            <div className="border-b-2 border-dashed border-slate-300 pb-4 mb-4">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold block">
                APEX MULTI-SPECIALTY HOSPITAL
              </span>
              <span className="text-xs text-slate-600 font-bold block mt-0.5">
                Outpatient Consultation Token
              </span>
              <h2 className="text-5xl font-mono font-black text-slate-950 my-3 tracking-tight tabular-nums">
                {lastIssuedToken.token_display_number}
              </h2>
              <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1 rounded-full">
                Position in queue: #{lastIssuedToken.operational_position}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1.5 mb-5 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p>
                <strong className="text-slate-800">Queue:</strong> {summary?.queue.name}
              </p>
              <p>
                <strong className="text-slate-800">Issued:</strong>{" "}
                {new Date(lastIssuedToken.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p>
                <strong className="text-slate-800">Est. Wait:</strong>{" "}
                {lastIssuedToken.estimated_wait_min !== null
                  ? `${lastIssuedToken.estimated_wait_min}–${lastIssuedToken.estimated_wait_max} mins`
                  : "Immediate"}
              </p>
            </div>

            {/* QR Code Block */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-5 flex flex-col items-center justify-center">
              <QrCode className="w-20 h-20 text-slate-900 mb-1.5" />
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                Scan with phone camera to track live turn
              </span>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
              >
                Close
              </button>
              <button
                onClick={handlePrintSlip}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
