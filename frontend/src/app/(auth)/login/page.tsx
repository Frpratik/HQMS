"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, Lock, Mail, ArrowRight, AlertCircle, Building2, Stethoscope, Users, ShieldCheck } from "lucide-react";
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
      } else if (res.user.role === "HOSPITAL_ADMIN") {
        router.push("/admin/departments");
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-950">HQMS Clinical</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Sign in to your station</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter credentials to access clinical consoles and administrative dashboards
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition duration-150 flex items-center justify-center space-x-2 text-xs mt-2"
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
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Demo Sign-In
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo("reception@hospital.com", "Recep123!")}
                className="text-xs p-2.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-blue-800">
                  <Users className="w-3.5 h-3.5" />
                  <span>Receptionist</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">reception@hospital.com</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("doctor@hospital.com", "Doctor123!")}
                className="text-xs p-2.5 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Doctor Desk</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">doctor@hospital.com</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("admin@apex.com", "Admin123!")}
                className="text-xs p-2.5 bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hospital Admin</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">admin@apex.com</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemo("super.admin@platform.com", "supersecurepass")}
                className="text-xs p-2.5 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition"
              >
                <div className="flex items-center space-x-1.5 font-bold text-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Super Admin</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">super.admin@platform.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
