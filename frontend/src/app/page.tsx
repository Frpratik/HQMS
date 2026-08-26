"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  Users,
  Stethoscope,
  Tv,
  Smartphone,
  ShieldCheck,
  Building2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { api, StaffUser } from "@/lib/api";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);

  useEffect(() => {
    setCurrentUser(api.auth.getUser());
  }, []);

  const getStationLink = (role?: string) => {
    if (role === "SUPER_ADMIN") return "/admin/hospitals";
    if (role === "HOSPITAL_ADMIN") return "/admin/departments";
    if (role === "DOCTOR" || role === "DOCTOR_ASSISTANT") return "/doctor";
    return "/reception";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP CLINICAL NAVIGATION                                      */}
      {/* ============================================================ */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-950 block">
                HQMS
              </span>
              <span className="text-[11px] text-slate-500 font-bold block -mt-1 uppercase tracking-wider">
                Healthcare Queue Management System
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <>
                <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">
                  {currentUser.full_name} ({currentUser.role})
                </span>
                <Link
                  href={getStationLink(currentUser.role)}
                  className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xs transition"
                >
                  My Workstation &rarr;
                </Link>
                <button
                  onClick={() => {
                    api.auth.logout();
                    setCurrentUser(null);
                    window.location.reload();
                  }}
                  className="text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xs transition"
              >
                Staff Sign In &rarr;
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================ */}
      {/* HERO SECTION                                                 */}
      {/* ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20 space-y-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs font-bold text-emerald-900 mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Deterministic Outpatient Queue Infrastructure</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight">
            Seamless Hospital Queue & Consultation Pacing.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Engineered for real-world healthcare environments: zero patient app downloads, instant thermal token slips with live mobile QR trackers, and 1-click consultation pacing for physicians.
          </p>
        </div>

        {/* ============================================================ */}
        {/* OPERATIONAL STATIONS DIRECTORY                               */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Clinical Workstations Directory
            </h2>
            <span className="text-xs font-mono text-slate-400 font-bold">
              3 Connected Modules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Doctor Console */}
            <Link
              href="/doctor"
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-5 text-emerald-700 group-hover:scale-105 transition">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Doctor Console</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                    1-Click Pacing
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Single-click "Complete & Next" consultation advance, live elapsed timer, emergency pause, and triage sidebar.
                </p>
              </div>
              <div className="text-xs text-emerald-700 font-bold flex items-center group-hover:text-emerald-800">
                <span>Launch Physician Station</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Card 2: Reception Desk */}
            <Link
              href="/reception"
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-5 text-blue-700 group-hover:scale-105 transition">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Reception Desk</h3>
                  <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                    Front Desk
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Rapid walk-in registration, priority categorization, printable thermal slip with mobile tracking QR code, and real-time live queue table.
                </p>
              </div>
              <div className="text-xs text-blue-700 font-bold flex items-center group-hover:text-blue-800">
                <span>Launch Reception Desk</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Card 3: TV Display Board */}
            <Link
              href="/display/demo"
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-5 text-slate-800 group-hover:scale-105 transition">
                  <Tv className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Waiting Room TV</h3>
                  <span className="text-[10px] bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                    TV Display
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Transit-grade scoreboard legible from 10–25 ft, massive tabular monospace numerals, Web Audio chime alerts, and privacy protection.
                </p>
              </div>
              <div className="text-xs text-slate-800 font-bold flex items-center group-hover:text-slate-950">
                <span>Launch Waiting Room TV</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* HOW PATIENT ZERO-INSTALL VIRTUAL QUEUE WORKS                 */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 shadow-xs space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
              Zero Patient App Downloads
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              How the Patient Experience Works in Real Hospitals
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Walk-In Registration</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Receptionist creates a token slip printed instantly with a dynamic QR code and automated SMS dispatch.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Live Mobile Tracker</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Patient scans the slip with their phone camera to view real-time countdown, ahead count, and step-away controls.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h4 className="font-extrabold text-sm text-slate-900">Push Alert & Hall Chime</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                When called, the patient's phone vibrates with lockscreen alerts while the waiting hall TV announces the token with a chime.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs text-slate-500">
          HQMS Hospital Systems · Designed for High-Throughput Clinical Operations
        </p>
      </footer>
    </div>
  );
}
