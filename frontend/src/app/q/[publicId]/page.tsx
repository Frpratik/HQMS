"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  ArrowRight,
  BellRing,
  RefreshCw,
  ShieldCheck,
  Building2,
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
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const prevStatusRef = useRef<string | null>(null);

  const fetchToken = useCallback(async () => {
    if (!publicId) return;
    try {
      const data = await api.patient.getToken(publicId);
      setTokenView(data);
      setError(null);
      setLastRefreshed(new Date());

      // Trigger tactile vibration on transition to CALLED
      if (prevStatusRef.current && prevStatusRef.current !== "CALLED" && data.status === "CALLED") {
        if (typeof window !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }
      }
      prevStatusRef.current = data.status;
    } catch (err: any) {
      setError(err.message || "Unable to load live token status.");
    } finally {
      setLoading(false);
    }
  }, [publicId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  // Real-time WebSocket connection
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
      setLastRefreshed(new Date());
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
      setLastRefreshed(new Date());
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
      setLastRefreshed(new Date());
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 p-6">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4">
          <Activity className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-700">Connecting to hospital live queue...</p>
        <span className="text-xs text-slate-400 mt-1">Checking active sequence & wait estimates</span>
      </div>
    );
  }

  if (error || !tokenView) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Token Link Expired or Invalid</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {error || "We could not find an active hospital visit linked to this URL. If you just registered at reception, please re-scan your slip."}
          </p>
          <Link
            href="/"
            className="block w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Return to Hospital Portal
          </Link>
        </div>
      </div>
    );
  }

  const isCalled = tokenView.status === "CALLED";
  const isServing = tokenView.status === "SERVING";
  const isCompleted = tokenView.status === "COMPLETED";
  const isAway = tokenView.status === "AWAY";
  const isReturning = tokenView.status === "RETURNING";
  const isMissed = tokenView.status === "MISSED";
  const isNext = !isCalled && !isServing && !isCompleted && tokenView.patients_ahead === 1;
  const isWaiting = !isCalled && !isServing && !isCompleted && !isAway && !isReturning && !isMissed;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* CLINICAL TOP BAR */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-slate-950 block truncate leading-tight">
                {tokenView.hospital_name || "Apex Multi-Specialty Hospital"}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 block truncate">
                {tokenView.department_name}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200/80 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE</span>
            </div>
            <button
              onClick={fetchToken}
              title="Refresh queue status"
              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-lg w-full mx-auto p-4 sm:p-6 space-y-4 flex-1">
        {/* ============================================================ */}
        {/* ESCALATING SIGNATURE BANNER: WHEN IT IS YOUR TURN / CALLED  */}
        {/* ============================================================ */}
        {isCalled && (
          <div className="bg-rose-700 text-white rounded-2xl p-5 shadow-lg border border-rose-800 animate-fade-in">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-200 block">
                  Turn Called by Physician
                </span>
                <h1 className="text-xl font-black text-white tracking-tight mt-0.5 leading-tight">
                  PLEASE PROCEED TO {tokenView.room_number ? tokenView.room_number.toUpperCase() : "CONSULTATION CABIN"} NOW
                </h1>
                <p className="text-xs text-rose-100 font-medium mt-1.5 leading-snug">
                  Dr. {tokenView.doctor_name || "Doctor"} is waiting for you at the examination desk.
                </p>
              </div>
            </div>
          </div>
        )}

        {isServing && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 block uppercase tracking-wide">
                Consultation in Progress
              </span>
              <span className="text-xs text-slate-300 font-medium">
                You are currently inside with {tokenView.doctor_name || "the doctor"}.
              </span>
            </div>
          </div>
        )}

        {isNext && (
          <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl p-4 shadow-xs flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-200/70 text-amber-800 flex items-center justify-center shrink-0 font-bold text-xs">
              01
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-amber-900 block">You are NEXT in line</span>
              <span className="text-[11px] font-medium text-amber-800 block">
                Please wait right outside {tokenView.room_number || "the consultation door"}.
              </span>
            </div>
          </div>
        )}

        {isAway && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-amber-950 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-bold uppercase tracking-wide">You Are Marked Away</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Your position is protected. When you walk back into the waiting corridor, tap the button below so the doctor knows you have returned.
            </p>
            <button
              onClick={handleMarkReturning}
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-xs"
            >
              <Navigation className="w-4 h-4" />
              <span>I Am Heading Back Now</span>
            </button>
          </div>
        )}

        {isReturning && (
          <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 text-purple-950 space-y-2.5">
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold uppercase tracking-wide">Heading Back</span>
            </div>
            <p className="text-xs text-purple-900 leading-relaxed font-medium">
              We notified reception that you are on your way back. Tap below once you reach the chairs.
            </p>
            <button
              onClick={handleMarkReady}
              disabled={actionLoading}
              className="w-full py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Am in the Waiting Area</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* CORE CLINICAL TOKEN PASS (HIGH SUNLIGHT CONTRAST RATIO)       */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm text-center relative">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Your Queue Token
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${
                isCalled
                  ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                  : isServing
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : isAway
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : isReturning
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : isCompleted
                  ? "bg-slate-100 text-slate-600"
                  : "bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              {tokenView.status}
            </span>
          </div>

          {/* TOKEN DISPLAY NUMBER (Scoreboard Monospace) */}
          <div className="py-2">
            <span className="text-6xl sm:text-7xl font-mono tracking-tight font-black text-slate-950 block tabular-nums">
              {tokenView.token_display_number}
            </span>
            {tokenView.priority !== "NORMAL" && (
              <span className="inline-block mt-2.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                {tokenView.priority} PRIORITY
              </span>
            )}
          </div>

          {/* Action Prompt Plain Copy */}
          <div className="mt-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <p className="text-xs font-semibold text-slate-700 leading-relaxed">
              {tokenView.action_prompt}
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SCOREBOARD TELEMETRY: SERVING NOW vs PATIENTS AHEAD          */}
        {/* ============================================================ */}
        {!isCompleted && !isServing && (
          <div className="grid grid-cols-2 gap-3">
            {/* Current Serving */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Now Serving
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 block tabular-nums">
                {tokenView.currently_serving_token_number || tokenView.currently_called_token_number || "—"}
              </span>
              <span className="text-[10px] text-slate-600 font-medium block mt-0.5 truncate">
                {tokenView.room_number || "Doctor Cabin"}
              </span>
            </div>

            {/* Patients Ahead */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Patients Ahead
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-slate-900 block tabular-nums">
                {tokenView.patients_ahead < 10 ? `0${tokenView.patients_ahead}` : tokenView.patients_ahead}
              </span>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5 truncate">
                {tokenView.estimated_wait_display}
              </span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* CLINICAL LOCATION & DOCTOR ASSIGNMENT CARD                    */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Attending Physician
              </span>
              <span className="font-extrabold text-sm text-slate-900 block truncate">
                {tokenView.doctor_name || "Assigned Duty Physician"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2.5 border-t border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Location & Cabin
              </span>
              <span className="font-extrabold text-sm text-slate-900 block truncate">
                {tokenView.department_name} · {tokenView.room_number || "Cabin TBA"}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STEPPING AWAY CONTROLS (HIGH ACCESSIBILITY TAP TARGET)        */}
        {/* ============================================================ */}
        {isWaiting && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Need to Step Away?
              </span>
              <span className="text-[10px] font-medium text-slate-600">
                Hold your spot in queue
              </span>
            </div>

            <button
              onClick={handleMarkAway}
              disabled={actionLoading}
              className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition active:scale-[0.99]"
            >
              <Coffee className="w-4 h-4 text-amber-700" />
              <span>Step Away (Cafeteria / Pharmacy / Washroom)</span>
            </button>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-4 px-4 text-center border-t border-slate-200/80 bg-white">
        <p className="text-[11px] text-slate-500 font-medium">
          Auto-updates in real time · Last verified at {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
      </footer>
    </div>
  );
}
