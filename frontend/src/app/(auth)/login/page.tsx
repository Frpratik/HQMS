"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login(email, password);
      if (res.user.role === "SUPER_ADMIN") {
        router.push("/admin/hospitals");
      } else if (res.user.role === "DOCTOR" || res.user.role === "DOCTOR_ASSISTANT") {
        router.push("/doctor");
      } else {
        router.push("/reception");
      }
    } catch (err: any) {

      setError(err.message || "Invalid credentials. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Activity className="w-7 h-7 text-slate-950 font-bold" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">HQMS Staff Portal</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Sign in to your station</h2>
        <p className="mt-2 text-sm text-slate-400">
          Access Reception Desk, Doctor Consultation Console, or Admin Settings
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hospital.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/25 transition duration-200 flex items-center justify-center space-x-2 text-sm mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Quick-Fill Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-700/80">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Quick Demo Fill
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("reception@hospital.com", "Recep123!")}
                className="text-xs p-2.5 bg-slate-900/60 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 text-left transition"
              >
                <span className="font-bold text-teal-400 block">Reception Desk</span>
                <span className="text-[10px] text-slate-500 truncate block">reception@hospital.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("doctor@hospital.com", "Doctor123!")}
                className="text-xs p-2.5 bg-slate-900/60 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 text-left transition"
              >
                <span className="font-bold text-emerald-400 block">Doctor Console</span>
                <span className="text-[10px] text-slate-500 truncate block">doctor@hospital.com</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("super.admin@platform.com", "supersecurepass")}
                className="text-xs p-2.5 bg-slate-900/60 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 text-left transition"
              >
                <span className="font-bold text-purple-400 block">Platform Admin</span>
                <span className="text-[10px] text-slate-500 truncate block">super.admin@platform.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

