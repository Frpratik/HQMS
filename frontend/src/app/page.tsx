"use client";

import Link from "next/link";
import {
  Activity,
  Users,
  Stethoscope,
  Tv,
  Smartphone,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white selection:bg-teal-500 selection:text-white">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Activity className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-white to-emerald-300 bg-clip-text text-transparent">
                HQMS
              </span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">Smart Hospital Queue</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 hover:text-white transition px-4 py-2 rounded-lg hover:bg-slate-800/60"
            >
              Staff Sign In
            </Link>
            <Link
              href="/reception"
              className="text-sm font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 px-4 py-2 rounded-lg shadow-lg shadow-teal-500/25 transition duration-200"
            >
              Open Reception
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1 text-xs font-semibold text-teal-300 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Virtual Queue & Token Management Platform</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Wait for your doctor,{" "}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              without sitting in the waiting room.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-300 leading-relaxed">
            Eliminate overcrowded OPD waiting areas with real-time mobile queue tracking, statistical wait-time estimation, and 1-click clinical workflows.
          </p>
        </div>

        {/* Portal Entry Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Module 1: Patient Live View */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-teal-500/50 transition-all duration-300 group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-5 text-teal-400 group-hover:scale-110 transition">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Patient Live View</h3>
            <p className="text-sm text-slate-400 mb-6">
              Zero-install mobile web tracking with live ETA, queue position, and "Step Away" / "Returning" controls.
            </p>
            <div className="text-xs text-teal-400 font-semibold flex items-center group-hover:text-teal-300">
              <span>Demo via secure link</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Module 2: Reception Desk */}
          <Link
            href="/reception"
            className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 group hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-400 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Reception Desk</h3>
            <p className="text-sm text-slate-400 mb-6">
              Instant walk-in registration, token printing, priority assignment, and real-time waiting room monitoring.
            </p>
            <div className="text-xs text-blue-400 font-semibold flex items-center group-hover:text-blue-300">
              <span>Launch Reception</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Module 3: Doctor Console */}
          <Link
            href="/doctor"
            className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 group hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400 group-hover:scale-110 transition">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Doctor Console</h3>
            <p className="text-sm text-slate-400 mb-6">
              1-click "Complete & Next" consultation pacing, recall, emergency overrides, and queue pause controls.
            </p>
            <div className="text-xs text-emerald-400 font-semibold flex items-center group-hover:text-emerald-300">
              <span>Launch Doctor Console</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* Module 4: Public Display Board */}
          <Link
            href="/display/demo"
            className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 group hover:-translate-y-1"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400 group-hover:scale-110 transition">
              <Tv className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Public TV Display</h3>
            <p className="text-sm text-slate-400 mb-6">
              High-contrast, privacy-safe waiting room screen displaying now-serving numbers and upcoming tokens.
            </p>
            <div className="text-xs text-purple-400 font-semibold flex items-center group-hover:text-purple-300">
              <span>Launch TV Display</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-800 pt-12">
          <div className="flex space-x-4">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-teal-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Statistical Wait Prediction</h4>
              <p className="text-sm text-slate-400 mt-1">
                Dynamic ETA windows based on real doctor consultation pacing, avoiding misleading timestamps.
              </p>
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Deterministic Queue Engine</h4>
              <p className="text-sm text-slate-400 mt-1">
                Pessimistic database locking ensures zero race conditions even under concurrent staff actions.
              </p>
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Zero App Install</h4>
              <p className="text-sm text-slate-400 mt-1">
                Works instantly over SMS/WhatsApp links on any smartphone browser without patient logins.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
