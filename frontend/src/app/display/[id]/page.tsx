"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Maximize2,
  Minimize2,
  Clock,
  AlertCircle,
  Volume2,
  Stethoscope,
  MapPin,
  Users,
  Building2,
  BellRing,
  RefreshCw,
  DoorOpen,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { Queue, QueueSummary, QueueToken } from "@/types/queue";

// Web Audio API Ding-Dong Chime for waiting room announcements
function playWaitingRoomChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // High note (Ding)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.6);

    // Low note (Dong)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(587.33, ctx.currentTime + 0.25); // D5
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 1.1);
  } catch (e) {
    // Audio autoplay restrictions gracefully handled
  }
}

export default function PublicTvDisplayPage() {
  const params = useParams();
  const queueParam = params?.id as string;

  const [queues, setQueues] = useState<Queue[]>([]);
  const [resolvedQueueId, setResolvedQueueId] = useState<string | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const prevCalledRef = useRef<string | null>(null);

  // Live Clock Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Queues and resolve target queue
  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const list = await api.queues.list();
        setQueues(list);
        if (list.length > 0) {
          if (queueParam === "demo" || !queueParam) {
            setResolvedQueueId(list[0].id);
          } else {
            const found = list.find((q) => q.id === queueParam || q.prefix === queueParam);
            setResolvedQueueId(found ? found.id : list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load display queues:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchQueues();
  }, [queueParam]);

  // Fetch Queue Summary
  const fetchSummary = useCallback(async () => {
    if (!resolvedQueueId) return;
    try {
      const data = await api.reception.getSummary(resolvedQueueId);
      setSummary(data);

      // Trigger Ding-Dong chime if a new token is called
      const newlyCalled = data.currently_called_token?.token_display_number || null;
      if (newlyCalled && newlyCalled !== prevCalledRef.current) {
        playWaitingRoomChime();
        prevCalledRef.current = newlyCalled;
      }
    } catch (err) {
      console.error("Failed to fetch display summary:", err);
    }
  }, [resolvedQueueId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Real-time WebSocket connection
  useQueueWebSocket(resolvedQueueId, {
    channel: "public",
    onEvent: () => {
      fetchSummary();
    },
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const currentlyServing = summary?.currently_serving_token;
  const currentlyCalled = summary?.currently_called_token;
  const isPaused = summary?.queue.status === "PAUSED";

  const upcomingTokens = (summary?.active_tokens || [])
    .filter(
      (t) =>
        t.status === "READY" ||
        t.status === "RETURNING" ||
        (t.status === "CALLED" && t.id !== currentlyCalled?.id)
    )
    .slice(0, 8);

  if (loading && !summary) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
            Connecting to Live Waiting Room TV Board...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans antialiased selection:bg-emerald-500 selection:text-white p-4 sm:p-6 lg:p-8">
      {/* ============================================================ */}
      {/* TOP CLINICAL HEADER BAR                                      */}
      {/* ============================================================ */}
      <header className="bg-white border border-slate-200/90 rounded-3xl px-5 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                {summary?.queue.name || "Outpatient Clinical Department"}
              </h1>
              <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {summary?.queue.prefix || "OPD"}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 font-semibold mt-1">
              <span>Public Waiting Room Display</span>
              <span>•</span>
              <span className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LIVE SYNCHRONIZED</span>
              </span>
            </div>
          </div>
        </div>

        {/* Queue Selector & Clock / Fullscreen */}
        <div className="flex items-center space-x-3 sm:space-x-6 self-end sm:self-auto">
          {queues.length > 1 && (
            <select
              value={resolvedQueueId || ""}
              onChange={(e) => setResolvedQueueId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-xs sm:text-sm font-bold rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            >
              {queues.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.name} ({q.prefix})
                </option>
              ))}
            </select>
          )}

          <div className="text-right font-mono hidden md:block">
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tabular-nums tracking-tight">
              {currentTime}
            </div>
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSummary}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition"
              title="Refresh Display"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-700 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN WAITING BOARD VIEW                                      */}
      {/* ============================================================ */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
        {/* LEFT COLUMN: HERO "NOW SERVING / CALLED" CARD (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col space-y-5">
          {/* Active Calling / Serving Card */}
          <div
            className={`flex-1 rounded-3xl p-6 sm:p-10 flex flex-col justify-between relative border transition-all duration-300 shadow-sm ${
              currentlyCalled
                ? "bg-rose-50 border-rose-300 ring-4 ring-rose-500/10 animate-fade-in"
                : currentlyServing
                ? "bg-white border-slate-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                <span
                  className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider flex items-center space-x-2.5 ${
                    currentlyCalled ? "text-rose-800" : "text-emerald-800"
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      currentlyCalled ? "bg-rose-600 animate-ping" : "bg-emerald-600"
                    }`}
                  />
                  <span>
                    {currentlyCalled ? "NOW CALLING — PLEASE PROCEED TO ROOM" : "CURRENTLY IN CONSULTATION"}
                  </span>
                </span>

                <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 rounded-full px-3.5 py-1 text-xs font-mono font-bold text-slate-800">
                  <DoorOpen className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Consultation Cabin</span>
                </div>
              </div>

              {/* Massive Scoreboard Token Typography */}
              <div className="text-center py-6 sm:py-12">
                <span
                  className={`text-7xl sm:text-9xl font-mono font-black tracking-tight tabular-nums block ${
                    currentlyCalled ? "text-rose-900" : "text-slate-950"
                  }`}
                >
                  {currentlyCalled
                    ? currentlyCalled.token_display_number
                    : currentlyServing
                    ? currentlyServing.token_display_number
                    : "— —"}
                </span>

                {currentlyCalled ? (
                  <span className="inline-block mt-3 bg-rose-600 text-white text-sm sm:text-base font-black px-4 py-1.5 rounded-xl uppercase tracking-wider shadow-xs animate-bounce">
                    PLEASE PROCEED TO CONSULTATION CABIN NOW
                  </span>
                ) : currentlyServing ? (
                  <span className="inline-block mt-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs sm:text-sm font-bold px-3 py-1 rounded-lg uppercase tracking-wider">
                    Patient inside with physician
                  </span>
                ) : (
                  <span className="inline-block mt-3 bg-slate-100 text-slate-500 text-xs sm:text-sm font-semibold px-3 py-1 rounded-lg">
                    Consultation desk ready for next patient
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Room & Doctor Info Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <Stethoscope className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider">
                    Clinical Department
                  </span>
                  <span className="font-extrabold text-slate-950 text-sm sm:text-base">
                    {summary?.queue.name || "Specialist Outpatient Clinic"}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-bold uppercase tracking-wider">
                  Location
                </span>
                <span className="font-extrabold text-emerald-800 text-sm sm:text-base font-mono">
                  OPD Floor · Examination Wing
                </span>
              </div>
            </div>
          </div>

          {/* Pause Notification Banner */}
          {isPaused && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center space-x-3.5 shadow-xs animate-fade-in">
              <AlertCircle className="w-6 h-6 text-amber-700 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider block text-amber-900">
                  Queue Temporarily Paused
                </span>
                <span className="text-xs font-medium text-amber-800">
                  Physician is attending to an urgent clinical case. Pacing will resume automatically.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: UPCOMING TOKENS LIST (5 COLS) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <Users className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-extrabold text-slate-950 uppercase tracking-wider">
                  Upcoming Queue
                </h3>
              </div>
              <span className="text-xs bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {summary?.total_ready ?? 0} Waiting
              </span>
            </div>

            {upcomingTokens.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-sm font-semibold">
                No waiting patients currently in queue
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {upcomingTokens.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center transition hover:border-slate-300"
                  >
                    <span className="text-[10px] text-slate-500 font-mono font-bold block mb-0.5 uppercase tracking-wider">
                      Position #{idx + 1}
                    </span>
                    <span className="text-3xl sm:text-4xl font-mono font-black text-slate-950 tracking-tight tabular-nums">
                      {t.token_display_number}
                    </span>
                    <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {t.estimated_wait_min !== null
                        ? `~${t.estimated_wait_min} MINS`
                        : "NEXT"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Notice Disclaimer */}
          <div className="pt-5 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-500 font-medium">
              Privacy Protected: Patient names are not displayed. Please keep your printed slip ready.
            </span>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* BOTTOM FOOTER BAR                                            */}
      {/* ============================================================ */}
      <footer className="bg-white border border-slate-200/90 rounded-2xl px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 shadow-2xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span className="font-semibold text-slate-800">HQMS Smart Clinical TV Board</span>
          <span>•</span>
          <span>{summary?.queue.name || "Outpatient Department"}</span>
        </div>
        <div className="flex items-center space-x-4 font-semibold">
          <Link href="/reception" className="hover:text-emerald-700 transition">
            Reception Desk
          </Link>
          <span>•</span>
          <Link href="/doctor" className="hover:text-emerald-700 transition">
            Doctor Console
          </Link>
        </div>
      </footer>
    </div>
  );
}
