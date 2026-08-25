"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { Queue, QueueSummary, QueueToken } from "@/types/queue";

export default function PublicTvDisplayPage() {
  const params = useParams();
  const queueParam = params?.id as string;

  const [queues, setQueues] = useState<Queue[]>([]);
  const [resolvedQueueId, setResolvedQueueId] = useState<string | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans selection:bg-none overflow-hidden p-6 sm:p-10">
      {/* Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-teal-500/20">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {summary?.queue.name || "APEX HOSPITAL OPD"}
            </h1>
            <span className="text-xs sm:text-sm text-slate-400 font-semibold flex items-center space-x-2 mt-0.5">
              <span>Outpatient Consultation Queue</span>
              <span>•</span>
              <span className="text-teal-400">Live Waiting Board</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right font-mono hidden sm:block">
            <div className="text-2xl font-black text-white">{currentTime}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
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

      {/* Main Display Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 items-stretch">
        {/* LEFT COLUMN: NOW CALLING / SERVING HERO CARD (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Active Call Card */}
          <div
            className={`flex-1 rounded-3xl p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden border transition-all duration-500 ${
              currentlyCalled
                ? "bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 border-teal-500/60 shadow-2xl shadow-teal-500/20 animate-pulse-slow"
                : currentlyServing
                ? "bg-slate-900/90 border-slate-800 shadow-2xl"
                : "bg-slate-900/50 border-slate-800/80"
            }`}
          >
            {/* Ambient Lighting */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center space-x-2.5 text-teal-400">
                  <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                  <span>
                    {currentlyCalled ? "NOW CALLING — PLEASE PROCEED" : "CURRENTLY SERVING"}
                  </span>
                </span>

                <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 rounded-full px-4 py-1 text-xs font-bold text-slate-300">
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span>Room 101</span>
                </div>
              </div>

              {/* Massive Hero Display Code */}
              <div className="text-center py-6 sm:py-12">
                <span className="text-7xl sm:text-9xl font-black text-white tracking-tight drop-shadow-2xl">
                  {currentlyCalled
                    ? currentlyCalled.token_display_number
                    : currentlyServing
                    ? currentlyServing.token_display_number
                    : "— — —"}
                </span>
                {currentlyCalled && (
                  <span className="block mt-4 text-lg sm:text-2xl font-extrabold text-teal-300 tracking-wide uppercase">
                    PROCEED TO CONSULTATION ROOM
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Room Location Footer */}
            <div className="p-4 sm:p-6 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-sm sm:text-base">
              <div className="flex items-center space-x-3">
                <Stethoscope className="w-6 h-6 text-teal-400" />
                <div>
                  <span className="text-xs text-slate-400 block font-semibold">Attending Doctor</span>
                  <span className="font-bold text-white">Dr. Alok Sharma, MD</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold">Location</span>
                <span className="font-bold text-teal-300">Room 101 • Main OPD</span>
              </div>
            </div>
          </div>

          {/* Pause Notification Ticker */}
          {isPaused && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-3 text-amber-300 animate-pulse">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              <span className="text-sm font-bold">
                Doctor attending an urgent medical procedure. The queue is temporarily paused.
              </span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: UPCOMING TOKENS LIST (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center space-x-2.5">
                <Users className="w-5 h-5 text-teal-400" />
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Upcoming Tokens
                </h3>
              </div>
              <span className="text-xs bg-slate-800 text-slate-400 font-bold px-3 py-1 rounded-full">
                Next in Line
              </span>
            </div>

            {upcomingTokens.length === 0 ? (
              <div className="py-20 text-center text-slate-500 text-base">
                No waiting tokens in queue
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {upcomingTokens.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex flex-col items-center justify-center text-center hover:border-slate-700 transition"
                  >
                    <span className="text-xs text-slate-400 font-mono font-bold block mb-1">
                      #{idx + 1}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {t.token_display_number}
                    </span>
                    <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider mt-1">
                      {t.estimated_wait_min !== null
                        ? `~${t.estimated_wait_min} mins`
                        : "Immediate"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy Notice Disclaimer */}
          <div className="pt-6 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-400 font-medium">
              For privacy protection, names are not displayed. Keep your token number ready.
            </span>
          </div>
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 space-y-2 sm:space-y-0">
        <div>
          <span>Smart Virtual Queue Platform</span> • <span>Apex Multi-Specialty Hospital</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/reception" className="hover:text-teal-400 transition">
            Reception Desk
          </Link>
          <span>•</span>
          <Link href="/doctor" className="hover:text-teal-400 transition">
            Doctor Console
          </Link>
        </div>
      </footer>
    </div>
  );
}
