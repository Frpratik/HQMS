"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  RotateCcw,
  Clock,
  AlertCircle,
  LogOut,
  Stethoscope,
  ChevronRight,
  ShieldAlert,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { Queue, QueueSummary, QueueToken } from "@/types/queue";

export default function DoctorConsolePage() {
  const router = useRouter();
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

  // Fetch initial Queues
  useEffect(() => {
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
  }, []);

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
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center font-black text-slate-950 shadow-md shadow-emerald-500/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white">HQMS</span>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md ml-2">
                Doctor Console
              </span>
            </div>
          </Link>
        </div>

        {/* Queue Selector & Controls */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedQueueId || ""}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-sm font-semibold rounded-xl px-4 py-2 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume Queue</span>
            </button>
          ) : (
            <button
              onClick={() => setShowPauseModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-amber-900/40 border border-slate-700 text-amber-300 font-semibold rounded-xl text-xs flex items-center space-x-1.5 transition"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Queue</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 bg-slate-800 hover:bg-rose-900/40 rounded-xl border border-slate-700 text-slate-400 hover:text-rose-300 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Active Consultation Command Center */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pause Notice Banner */}
          {isPaused && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-sm font-semibold">
                  Queue is currently PAUSED. Patients have received wait-time adjustments.
                </span>
              </div>
              <button
                onClick={handleResumeQueue}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
              >
                Resume Now
              </button>
            </div>
          )}

          {/* Primary Consultation Stage Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Background Status Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Consultation Room</span>
              </span>

              {currentServing && (
                <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-full px-3.5 py-1 text-xs font-mono font-bold text-emerald-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatTimer(elapsedSeconds)}</span>
                </div>
              )}
            </div>

            {/* Currently Serving or Called Display */}
            {currentServing ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider block mb-1">
                    Currently Inside Room
                  </span>
                  <div className="flex items-baseline space-x-4">
                    <span className="text-6xl font-black text-white tracking-tight">
                      {currentServing.token_display_number}
                    </span>
                    {currentServing.priority === "EMERGENCY" && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold px-3 py-1 rounded-lg animate-pulse">
                        EMERGENCY CASE
                      </span>
                    )}
                    {currentServing.priority === "HIGH" && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-lg">
                        HIGH PRIORITY
                      </span>
                    )}
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-4">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="w-full py-5 px-6 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition duration-200 flex items-center justify-center space-x-3 active:scale-[0.99]"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>COMPLETE & CALL NEXT</span>
                  </button>
                </div>

                {/* Secondary Clinical Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <button
                    onClick={() => handleCompleteCurrent(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    Complete Only
                  </button>
                  <button
                    onClick={() => handleSkip(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    Skip Patient
                  </button>
                  <button
                    onClick={() => handleMarkMissed(currentServing.id)}
                    disabled={actionLoading}
                    className="py-3 px-4 bg-slate-800/80 hover:bg-rose-900/40 border border-slate-700 rounded-xl text-xs font-bold text-rose-300 transition"
                  >
                    Mark Missed
                  </button>
                </div>
              </div>
            ) : currentCalled ? (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block mb-1">
                    Called to Room (Entering)
                  </span>
                  <div className="flex items-baseline space-x-4">
                    <span className="text-6xl font-black text-teal-300 tracking-tight animate-pulse">
                      {currentCalled.token_display_number}
                    </span>
                    <span className="bg-teal-500/20 text-teal-300 text-xs font-bold px-3 py-1 rounded-lg">
                      ENTERING ROOM
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => handleStartServing(currentCalled.id)}
                    disabled={actionLoading}
                    className="py-4 px-6 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-teal-500/25 transition text-base flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Patient Entered (Start)</span>
                  </button>
                  <button
                    onClick={() => handleMarkMissed(currentCalled.id)}
                    disabled={actionLoading}
                    className="py-4 px-6 bg-slate-800 hover:bg-rose-900/40 border border-slate-700 text-rose-300 font-bold rounded-2xl transition text-sm flex items-center justify-center space-x-2"
                  >
                    <UserX className="w-5 h-5" />
                    <span>Did Not Appear (Missed)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <Stethoscope className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Consultation Room Ready</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {summary?.total_ready ?? 0} eligible patients waiting in OPD
                  </p>
                </div>
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || (summary?.total_ready ?? 0) === 0}
                  className="py-5 px-10 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 transition duration-200 inline-flex items-center space-x-3"
                >
                  <PhoneCall className="w-6 h-6" />
                  <span>CALL FIRST PATIENT</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Waiting in OPD
              </span>
              <span className="text-2xl font-black text-emerald-400 block mt-1">
                {summary?.total_ready ?? 0}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Stepped Away
              </span>
              <span className="text-2xl font-black text-amber-400 block mt-1">
                {summary?.total_away ?? 0}
              </span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Completed Today
              </span>
              <span className="text-2xl font-black text-blue-400 block mt-1">
                {summary?.total_completed_today ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Next Eligible Patients Preview */}
        <div className="space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>Next Eligible Patients</span>
              </h3>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                Top 3
              </span>
            </div>

            {nextCandidates.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No upcoming patients in queue
              </div>
            ) : (
              <div className="space-y-3">
                {nextCandidates.map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-slate-400 font-mono">
                        {idx + 1}
                      </div>
                      <div>
                        <span className="font-extrabold text-white text-base block tracking-tight">
                          {candidate.token_display_number}
                        </span>
                        <span className="text-xs text-slate-400">
                          {candidate.priority === "EMERGENCY" ? (
                            <strong className="text-rose-400">EMERGENCY</strong>
                          ) : candidate.priority === "HIGH" ? (
                            <strong className="text-amber-400">High Priority</strong>
                          ) : (
                            "Standard Walk-in"
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-400 block">
                        ~
                        {candidate.estimated_wait_min !== null
                          ? `${candidate.estimated_wait_min}m`
                          : "Immediate"}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-md">
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

      {/* MODAL: Pause Queue Dialog */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-1">Pause Queue Operations</h3>
            <p className="text-xs text-slate-400 mb-5">
              Temporarily halt patient calling and automatically notify waiting patients with adjusted wait times.
            </p>

            <form onSubmit={handlePauseQueue} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Reason for Pause *
                </label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Expected Resumption (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={pauseDurationMin}
                  onChange={(e) => setPauseDurationMin(parseInt(e.target.value) || 20)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPauseModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20"
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
