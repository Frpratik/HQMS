"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  PhoneCall,
  SkipForward,
  UserX,
  Pause,
  Play,
  Clock,
  AlertCircle,
  LogOut,
  Stethoscope,
  Users,
  Building2,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { Queue, QueueSummary, QueueToken } from "@/types/queue";

export default function DoctorConsolePage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthorized } = useRequireAuth(["DOCTOR", "DOCTOR_ASSISTANT"]);

  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Consultation Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Pause Queue Modal State
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("Doctor attending urgent emergency ward case");
  const [pauseDurationMin, setPauseDurationMin] = useState(20);

  // Fetch initial Queues once authorized
  useEffect(() => {
    if (!isAuthorized) return;
    const fetchQueues = async () => {
      try {
        const list = await api.queues.list();
        setQueues(list);
        if (list.length > 0) {
          setSelectedQueueId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load doctor queues:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueues();
  }, [isAuthorized]);

  // Fetch Queue Summary
  const fetchSummary = useCallback(async () => {
    if (!selectedQueueId) return;
    try {
      const data = await api.reception.getSummary(selectedQueueId);
      setSummary(data);
    } catch (err) {
      console.error("Failed to fetch doctor queue summary:", err);
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

  // Elapsed Consultation Timer Effect
  useEffect(() => {
    const servingToken = summary?.currently_serving_token;
    if (!servingToken || !servingToken.serving_at) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(servingToken.serving_at).getTime();
    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [summary?.currently_serving_token]);

  // 1-Click Complete & Call Next Action
  const handleCallNext = async () => {
    if (!selectedQueueId) return;
    setActionLoading(true);
    try {
      await api.doctor.callNext(selectedQueueId, true);
      await fetchSummary();
    } catch (err: any) {
      alert(`Call Next failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Start Serving (Called -> Serving)
  const handleStartServing = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await api.doctor.startServing(tokenId);
      await fetchSummary();
    } catch (err: any) {
      alert(`Start Serving failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Current Consultation
  const handleCompleteCurrent = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await api.doctor.complete(tokenId);
      await fetchSummary();
    } catch (err: any) {
      alert(`Complete failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Skip Patient
  const handleSkip = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await api.doctor.skip(tokenId);
      await fetchSummary();
    } catch (err: any) {
      alert(`Skip failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Mark Patient Missed
  const handleMarkMissed = async (tokenId: string) => {
    setActionLoading(true);
    try {
      await api.doctor.missed(tokenId);
      await fetchSummary();
    } catch (err: any) {
      alert(`Mark Missed failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Pause Queue
  const handlePauseQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueId) return;
    try {
      await api.doctor.pause(selectedQueueId, pauseReason, pauseDurationMin);
      setShowPauseModal(false);
      await fetchSummary();
    } catch (err: any) {
      alert(`Pause failed: ${err.message}`);
    }
  };

  // Resume Queue
  const handleResumeQueue = async () => {
    if (!selectedQueueId) return;
    try {
      await api.doctor.resume(selectedQueueId);
      await fetchSummary();
    } catch (err: any) {
      alert(`Resume failed: ${err.message}`);
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    router.push("/login");
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainderSecs.toString().padStart(2, "0")}`;
  };

  const currentServing = summary?.currently_serving_token;
  const currentCalled = summary?.currently_called_token;
  const isPaused = summary?.queue.status === "PAUSED";

  const nextCandidates = (summary?.active_tokens || [])
    .filter((t) => t.status === "READY" || t.status === "RETURNING")
    .slice(0, 4);

  if (authLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Activity className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-sm font-bold text-slate-300">Verifying Physician Credentials...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP CLINICAL NAVIGATION BAR                                  */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-950">HQMS Clinical</span>
              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md ml-2 border border-slate-200">
                Doctor Console
              </span>
            </div>
          </Link>
        </div>

        {/* Queue Selector & Clinical Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedQueueId || ""}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.prefix})
              </option>
            ))}
          </select>

          {isPaused ? (
            <button
              onClick={handleResumeQueue}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Queue</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPauseModal(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-xs transition"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Queue</span>
            </button>
          )}

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
      {/* MAIN CLINICAL WORKSPACE                                      */}
      {/* ============================================================ */}
      {!loading && queues.length === 0 ? (
        <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col items-center justify-center text-center my-auto">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <Stethoscope className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">No Consultation Queue Assigned</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your physician account does not have an active OPD consultation queue assigned yet. Please contact your Hospital Administrator to deploy or assign a queue to your doctor profile in the Operations Console.
            </p>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: ACTIVE CONSULTATION COMMAND CENTER */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pause Banner */}
            {isPaused && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between text-amber-950 shadow-xs">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold">
                    Queue is currently PAUSED. Patient mobile trackers show procedure pause notice.
                  </span>
                </div>
                <button
                  onClick={handleResumeQueue}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-lg text-xs transition"
                >
                  Resume Now
                </button>
              </div>
            )}

          {/* Core Consultation Stage Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center space-x-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Examination Desk · Cabin 101
                </span>
              </div>

              {currentServing && (
                <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs font-mono font-bold text-slate-800 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              )}
            </div>

            {/* State A: Currently Serving Patient */}
            {currentServing ? (
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Currently Inside Cabin
                  </span>
                  <div className="flex items-baseline space-x-4">
                    <span className="text-6xl sm:text-7xl font-mono font-black text-slate-950 tracking-tight tabular-nums">
                      {currentServing.token_display_number}
                    </span>
                    {currentServing.priority === "EMERGENCY" && (
                      <span className="bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black px-3 py-1 rounded-lg uppercase">
                        EMERGENCY CASE
                      </span>
                    )}
                    {currentServing.priority === "HIGH" && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1 rounded-lg uppercase">
                        High Priority
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary 1-Click Action */}
                <div className="pt-2">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="w-full py-5 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-sm transition duration-150 flex items-center justify-center space-x-3 active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>COMPLETE & CALL NEXT</span>
                  </button>
                </div>

                {/* Secondary Clinical Controls */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleCompleteCurrent(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition"
                  >
                    Complete Only
                  </button>
                  <button
                    onClick={() => handleSkip(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 transition"
                  >
                    Skip Patient
                  </button>
                  <button
                    onClick={() => handleMarkMissed(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 transition"
                  >
                    Mark Missed
                  </button>
                </div>
              </div>
            ) : currentCalled ? (
              /* State B: Patient Called to Room (Walking in) */
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    Called to Cabin (Patient Entering)
                  </span>
                  <div className="flex items-baseline space-x-4">
                    <span className="text-6xl sm:text-7xl font-mono font-black text-amber-900 tracking-tight tabular-nums">
                      {currentCalled.token_display_number}
                    </span>
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black px-3 py-1 rounded-lg">
                      WAITING TO ENTER
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <button
                    onClick={() => handleStartServing(currentCalled.id)}
                    disabled={actionLoading}
                    className="py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-sm transition text-base flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Patient Entered (Start Consult)</span>
                  </button>
                  <button
                    onClick={() => handleMarkMissed(currentCalled.id)}
                    disabled={actionLoading}
                    className="py-4 px-6 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-800 font-bold rounded-2xl transition text-sm flex items-center justify-center space-x-2"
                  >
                    <UserX className="w-5 h-5" />
                    <span>Did Not Appear (Missed)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* State C: Room Idle / Ready for First Patient */
              <div className="py-10 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                  <Stethoscope className="w-8 h-8 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">Examination Cabin Ready</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {summary?.total_ready ?? 0} eligible patients waiting in OPD corridor
                  </p>
                </div>
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || (summary?.total_ready ?? 0) === 0}
                  className="py-4 px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-base rounded-2xl shadow-sm transition inline-flex items-center space-x-2.5"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>CALL PATIENT</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Waiting in OPD
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 block mt-1 tabular-nums">
                {summary?.total_ready ?? 0}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Stepped Away
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-amber-700 block mt-1 tabular-nums">
                {summary?.total_away ?? 0}
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Completed Today
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-700 block mt-1 tabular-nums">
                {summary?.total_completed_today ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Next Eligible Patients Preview */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center space-x-2.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Next In Line
                </h3>
              </div>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md font-mono">
                UPCOMING
              </span>
            </div>

            {nextCandidates.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs font-semibold">
                No waiting patients in queue
              </div>
            ) : (
              <div className="space-y-2.5">
                {nextCandidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs font-black text-slate-600 font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-mono font-black text-slate-900 text-base block tracking-tight">
                          {candidate.token_display_number}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {candidate.priority === "EMERGENCY" ? (
                            <strong className="text-rose-700 font-black uppercase">Emergency Case</strong>
                          ) : candidate.priority === "HIGH" ? (
                            <strong className="text-amber-800 font-bold">High Priority</strong>
                          ) : (
                            "Walk-in"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-slate-700 block">
                        ~{candidate.estimated_wait_min !== null ? `${candidate.estimated_wait_min}m` : "Next"}
                      </span>
                      <span className="text-[10px] bg-slate-200/80 text-slate-800 font-bold px-2 py-0.5 rounded-md uppercase">
                        {candidate.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      )}

      {/* ============================================================ */}
      {/* MODAL: PAUSE QUEUE DIALOG                                    */}
      {/* ============================================================ */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-xl animate-fade-in">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Pause className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Pause Queue Operations</h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Temporarily halt patient calling and automatically notify waiting patients with adjusted wait times.
            </p>

            <form onSubmit={handlePauseQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Pause *
                </label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Doctor attending urgent emergency ward case">
                    Doctor attending urgent emergency ward case
                  </option>
                  <option value="Doctor on hospital rounds">Doctor on hospital rounds</option>
                  <option value="Short consultation break">Short consultation break</option>
                  <option value="Procedure in progress">Procedure in progress</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expected Resumption (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={pauseDurationMin}
                  onChange={(e) => setPauseDurationMin(parseInt(e.target.value) || 20)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Confirm Pause
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
