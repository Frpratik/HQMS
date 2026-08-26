"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  Stethoscope,
  Users,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.auth.login(email.trim(), password);
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
      setError(err.message || "Invalid credentials. Please verify your email and password.");
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
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-950">HQMS</span>
        </Link>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Hospital Workstation Sign In
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Sign in with your hospital-issued credentials (Doctor, Receptionist, or Hospital Administrator)
        </p>
      </div>

      {/* Main Form Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start space-x-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hospital Work Email
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
                  placeholder="doctor@hospital.com or reception@hospital.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-medium">Remember my station</span>
              </label>
              <span className="text-slate-400 text-[11px]">Protected by 256-bit TLS</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Station</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Discreet Developer / Reviewer Quick-Logins */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoLogins(!showDemoLogins)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-900 font-semibold py-1 transition"
            >
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Test Credentials Reference</span>
              </div>
              {showDemoLogins ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemoLogins && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-left animate-fade-in">
                <button
                  type="button"
                  onClick={() => fillDemo("doctor@hospital.com", "Doctor123!")}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-[11px] font-bold text-slate-900">Dr. Sharma</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">doctor@hospital.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo("reception@hospital.com", "Recep123!")}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Users className="w-3.5 h-3.5 text-blue-700" />
                    <span className="text-[11px] font-bold text-slate-900">Reception</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">reception@hospital.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemo("admin@apex.com", "Admin123!")}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-700" />
                    <span className="text-[11px] font-bold text-slate-900">Hospital Admin</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">admin@apex.com</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
