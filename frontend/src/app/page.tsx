"use client";

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
} from "lucide-react";

export default function HomePage() {
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

          <div className="flex items-center space-x-2.5">
            <Link
              href="/admin/departments"
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition hidden md:inline-flex items-center space-x-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Hospital Admin</span>
            </Link>

            <Link
              href="/admin/hospitals"
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition hidden md:inline-flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Super Admin</span>
            </Link>

            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-900 transition px-3.5 py-2 rounded-xl hover:bg-slate-100"
            >
              Staff Sign In
            </Link>

            <Link
              href="/reception"
              className="text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-xs transition"
            >
              Open Reception
            </Link>
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
            <span>Multi-Tenant Clinical Hospital Operating System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 leading-tight">
            Deterministic Outpatient Queue Infrastructure.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
            Engineered for real-world hospital conditions: low-end mobile devices, harsh OPD lighting, and high walk-in volumes. Zero patient app downloads required.
          </p>
        </div>

        {/* ============================================================ */}
        {/* OPERATIONAL STATIONS DIRECTORY                               */}
        {/* ============================================================ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Workstations Directory
            </h2>
            <span className="text-xs font-mono text-slate-400 font-bold">
              5 Connected Modules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

            {/* Card 4: Hospital Admin */}
            <Link
              href="/admin/departments"
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5 text-amber-800 group-hover:scale-105 transition">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Hospital Admin</h3>
                  <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200 uppercase">
                    Facility Ops
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Manage clinical departments, consultation rooms, doctor/receptionist accounts, and deploy live OPD queues.
                </p>
              </div>
              <div className="text-xs text-amber-800 font-bold flex items-center group-hover:text-amber-900">
                <span>Launch Facility Console</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Card 5: Platform Super Admin */}
            <Link
              href="/admin/hospitals"
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-purple-500 hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center mb-5 text-purple-800 group-hover:scale-105 transition">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Platform Super Admin</h3>
                  <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-2 py-0.5 rounded-md border border-purple-200 uppercase">
                    Fleet Ops
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Provision new hospital tenants in 1-click with automated partition initialization, credentials, and tenant fleet monitoring.
                </p>
              </div>
              <div className="text-xs text-purple-800 font-bold flex items-center group-hover:text-purple-900">
                <span>Launch Super Admin</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* Card 6: Zero-Install Patient Tracker */}
            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-5 text-slate-700">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-black text-slate-950">Patient Live Tracker</h3>
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-md uppercase">
                    Mobile Web
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-6">
                  Zero app download. Accessible via SMS link or QR code with live ahead count, estimated arrival range, and away/returning presence controls.
                </p>
              </div>
              <div className="text-xs text-slate-600 font-bold">
                Access via registration slip QR code
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CLINICAL ENGINEERING HIGHLIGHTS                              */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">Statistical Wait Estimation</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Dynamically estimates consultation arrival windows based on physician pace and priority weighting rather than misleading fixed timestamps.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">Deterministic Queue Engine</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Row-level transactional safety prevents race conditions under high concurrency across doctors and reception desks.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-sm text-slate-950">Strict Multi-Tenant Isolation</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Complete partition separation across independent hospital organizations with customizable branding and theme tokens.
            </p>
          </div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>HQMS Healthcare Queue Management System · Production Ready</span>
          <div className="flex items-center space-x-4 font-semibold text-slate-600">
            <Link href="/login" className="hover:text-slate-900">Sign In</Link>
            <span>•</span>
            <Link href="/reception" className="hover:text-slate-900">Reception</Link>
            <span>•</span>
            <Link href="/doctor" className="hover:text-slate-900">Doctor Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
