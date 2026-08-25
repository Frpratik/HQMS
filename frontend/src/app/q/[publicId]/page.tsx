"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Clock,
  MapPin,
  Stethoscope,
  Users,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Coffee,
  ArrowLeft,
  BellRing,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useQueueWebSocket } from "@/hooks/useQueueWebSocket";
import { PatientLiveTokenView } from "@/types/queue";

export default function PatientLiveQueuePage() {
  const params = useParams();
  const publicId = params?.publicId as string;

  const [tokenView, setTokenView] = useState<PatientLiveTokenView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchToken = useCallback(async () => {
    if (!publicId) return;
    try {
      const data = await api.patient.getToken(publicId);
      setTokenView(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Unable to load token details.");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Real-time WebSocket connection using public channel
  useQueueWebSocket(tokenView?.queue_id || null, {
    channel: "public",
    onEvent: () => {
      fetchToken();
    },
  });

  const handleMarkAway = async () => {
    if (!publicId) return;
    setActionLoading(true);
    try {
      const updated = await api.patient.markAway(publicId);
      setTokenView(updated);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReturning = async () => {
    if (!publicId) return;
    setActionLoading(true);
    try {
      const updated = await api.patient.markReturning(publicId);
      setTokenView(updated);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReady = async () => {
    if (!publicId) return;
    setActionLoading(true);
    try {
      const updated = await api.patient.markReady(publicId);
      setTokenView(updated);
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <Activity className="w-10 h-10 text-teal-400 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">Connecting to Live Queue...</p>
      </div>
    );
  }

  if (error || !tokenView) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Token Not Found</h2>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          {error || "The requested token link is invalid or has expired."}
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const isCalled = tokenView.status === "CALLED";
  const isServing = tokenView.status === "SERVING";
  const isCompleted = tokenView.status === "COMPLETED";
  const isAway = tokenView.status === "AWAY";
  const isReturning = tokenView.status === "RETURNING";
  const isMissed = tokenView.status === "MISSED";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white flex flex-col font-sans pb-12">
      {/* Mobile Top App Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-5 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-slate-950 shadow-md shadow-teal-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-tight text-white">
            HQMS Live Turn
          </span>
        </div>

        <button
          onClick={fetchToken}
          title="Refresh Live Status"
          className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-slate-300 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </header>

      {/* Main Responsive Container */}
      <main className="max-w-md w-full mx-auto p-4 space-y-4">
        {/* CRITICAL STATE BANNER: When CALLED */}
        {isCalled && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-500 to-emerald-400 text-slate-950 shadow-2xl shadow-teal-500/30 animate-bounce">
            <div className="flex items-center space-x-3 mb-2">
              <BellRing className="w-6 h-6 animate-spin" />
              <span className="font-black text-lg uppercase tracking-tight">
                IT IS YOUR TURN NOW!
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900">
              Please proceed immediately into{" "}
              <span className="underline decoration-2">
                {tokenView.room_number || "Doctor Consultation Room"}
              </span>
              .
            </p>
          </div>
        )}

        {/* PRIMARY TOKEN CARD */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-xl">
          {/* Subtle Background Glow */}
          <div
            className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
              isCalled
                ? "bg-teal-500/20"
                : isServing
                ? "bg-blue-500/20"
                : isAway
                ? "bg-amber-500/20"
                : "bg-teal-500/10"
            }`}
          />

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Your Token Number
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                isCalled
                  ? "bg-teal-500 text-slate-950 animate-pulse"
                  : isServing
                  ? "bg-blue-500/20 text-blue-300"
                  : isAway
                  ? "bg-amber-500/20 text-amber-300"
                  : isReturning
                  ? "bg-purple-500/20 text-purple-300"
                  : isMissed
                  ? "bg-rose-500/20 text-rose-300"
                  : isCompleted
                  ? "bg-slate-800 text-slate-400"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {tokenView.status}
            </span>
          </div>

          {/* Large Visual Token */}
          <div className="text-center py-4">
            <span className="text-6xl font-black text-white tracking-tight block">
              {tokenView.token_display_number}
            </span>
            {tokenView.priority !== "NORMAL" && (
              <span className="inline-block mt-2 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-0.5 rounded-full">
                {tokenView.priority} PRIORITY
              </span>
            )}
          </div>

          {/* Contextual Status Prompt */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <p className="text-sm font-semibold text-slate-200">{tokenView.action_prompt}</p>
          </div>
        </div>

        {/* LIVE QUEUE TELEMETRY CARD */}
        {!isCompleted && !isServing && !isCalled && (
          <div className="grid grid-cols-2 gap-3">
            {/* Patients Ahead */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 font-semibold mb-1">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Patients Ahead</span>
              </div>
              <span className="text-3xl font-black text-white">
                {tokenView.patients_ahead}
              </span>
            </div>

            {/* Estimated Wait Range */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 font-semibold mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Est. Wait</span>
              </div>
              <span className="text-lg font-black text-emerald-300 block truncate">
                {tokenView.estimated_wait_display}
              </span>
            </div>
          </div>
        )}

        {/* OPD & CLINICAL LOCATION CARD */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-sm">
          <div className="flex items-center space-x-3 text-slate-300">
            <Stethoscope className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Consulting Doctor</span>
              <span className="font-bold text-white">
                {tokenView.doctor_name || "Assigned Physician"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-slate-300 pt-1 border-t border-slate-800/80">
            <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="text-xs text-slate-400 block">Department & Room</span>
              <span className="font-bold text-white">
                {tokenView.department_name} • {tokenView.room_number || "Room TBA"}
              </span>
            </div>
          </div>
        </div>

        {/* SELF-SERVICE PRESENCE CONTROLS */}
        {!isCompleted && !isServing && !isCalled && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Waiting Zone Controls
            </span>

            {tokenView.can_mark_away && (
              <button
                onClick={handleMarkAway}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition"
              >
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Stepping Away (Cafeteria / Pharmacy)</span>
              </button>
            )}

            {tokenView.can_mark_returning && (
              <button
                onClick={handleMarkReturning}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-purple-600/20"
              >
                <Navigation className="w-4 h-4" />
                <span>I Am Heading Back to Waiting Area</span>
              </button>
            )}

            {tokenView.can_mark_ready && (
              <button
                onClick={handleMarkReady}
                disabled={actionLoading}
                className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-teal-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Have Arrived in Waiting Area</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
