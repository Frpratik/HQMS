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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-none overflow-hidden p-6 sm:p-10 antialiased">
      {/* ============================================================ */}
      {/* TOP DEPARTURE-BOARD HEADER BAR                               */}
      {/* ============================================================ */}
      <header className="flex items-center justify-between border-b border-slate-800/90 pb-5">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">
              {summary?.queue.name || "Apex Multi-Specialty Hospital"}
            </h1>
            <div className="flex items-center space-x-3 text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              <span>OPD Consultation Display</span>
              <span>•</span>
              <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE SYNCHRONIZED</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right font-mono hidden sm:block">
            <div className="text-2xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
              {currentTime}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 transition"
            title="Toggle TV Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN TRANSIT-GRADE DISPLAY BOARD                             */}
      {/* ============================================================ */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 my-6 items-stretch">
        {/* LEFT COLUMN: HERO "NOW SERVING / CALLED" SCOREBOARD (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Active Calling Box */}
          <div
            className={`flex-1 rounded-3xl p-8 sm:p-12 flex flex-col justify-between relative border transition-all duration-300 ${
              currentlyCalled
                ? "bg-rose-950/90 border-rose-600 shadow-2xl"
                : currentlyServing
                ? "bg-slate-900 border-slate-800 shadow-xl"
                : "bg-slate-900/60 border-slate-800/80"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
                <span
                  className={`text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center space-x-2.5 ${
                    currentlyCalled ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${
                      currentlyCalled ? "bg-rose-400 animate-ping" : "bg-emerald-400"
                    }`}
                  />
                  <span>
                    {currentlyCalled ? "NOW CALLING — PROCEED TO CABIN" : "CURRENTLY SERVING"}
                  </span>
                </span>

                <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-full px-4 py-1 text-xs font-bold text-slate-300">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Cabin 101</span>
                </div>
              </div>

              {/* Massive Scoreboard Token Typography */}
              <div className="text-center py-8 sm:py-14">
                <span className="text-8xl sm:text-9xl font-mono font-black text-white tracking-tight tabular-nums block">
                  {currentlyCalled
                    ? currentlyCalled.token_display_number
                    : currentlyServing
                    ? currentlyServing.token_display_number
                    : "— — —"}
                </span>

                {currentlyCalled ? (
                  <span className="inline-block mt-4 text-xl sm:text-2xl font-black text-rose-300 tracking-wide uppercase">
                    PROCEED TO EXAMINATION ROOM NOW
                  </span>
                ) : (
                  <span className="inline-block mt-4 text-sm sm:text-base font-bold text-slate-400 uppercase tracking-widest">
                    Patient inside with physician
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Room & Doctor Info Bar */}
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-sm sm:text-base">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                    Attending Physician
                  </span>
                  <span className="font-extrabold text-white text-base">
                    Dr. Alok Sharma, MD
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">
                  Location
                </span>
                <span className="font-extrabold text-emerald-400 text-base">
                  Cabin 101 • OPD Wing
                </span>
              </div>
            </div>
          </div>

          {/* Pause Notification Banner */}
          {isPaused && (
            <div className="p-5 rounded-2xl bg-amber-950/80 border border-amber-500 text-amber-200 flex items-center space-x-4 shadow-lg">
              <AlertCircle className="w-7 h-7 text-amber-400 shrink-0" />
              <div>
                <span className="text-sm font-black uppercase tracking-wider block text-amber-300">
                  Queue Temporarily Paused
                </span>
                <span className="text-xs font-medium text-amber-200">
                  Physician is attending to an urgent clinical procedure. Pacing will resume shortly.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: UPCOMING TOKENS LIST (5 COLS) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider">
                  Upcoming Queue
                </h3>
              </div>
              <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Next in Line
              </span>
            </div>

            {upcomingTokens.length === 0 ? (
              <div className="py-24 text-center text-slate-500 text-base font-semibold">
                No waiting patients currently in queue
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                {upcomingTokens.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center transition"
                  >
                    <span className="text-xs text-slate-500 font-mono font-bold block mb-1">
                      POSITION #{idx + 1}
                    </span>
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tight tabular-nums">
                      {t.token_display_number}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider mt-1.5">
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
          <div className="pt-6 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-400 font-medium">
              Privacy Protected: Diagnostic & patient names are not displayed. Please keep your slip ready.
            </span>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* BOTTOM FOOTER BAR                                            */}
      {/* ============================================================ */}
      <footer className="border-t border-slate-800/90 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 space-y-2 sm:space-y-0">
        <div>
          <span>HQMS Healthcare Display</span> • <span>Apex Multi-Specialty Hospital</span>
        </div>
        <div className="flex items-center space-x-4 font-semibold">
          <Link href="/reception" className="hover:text-emerald-400 transition">
            Reception Desk
          </Link>
          <span>•</span>
          <Link href="/doctor" className="hover:text-emerald-400 transition">
            Doctor Console
          </Link>
        </div>
      </footer>
    </div>
  );
}
