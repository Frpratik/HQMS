"use client";

import { useState, useMemo } from "react";
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
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";

type AuthMode = "signin" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");

  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Hospital State
  const [hospitalName, setHospitalName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoLogins, setShowDemoLogins] = useState(false);

  // Password Complexity Evaluator
  const passwordChecks = useMemo(() => {
    const p = regPassword;
    return {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /\d/.test(p),
      special: /[@$!%*?&#^_\-+=~]/.test(p),
    };
  }, [regPassword]);

  const passwordScore = useMemo(() => {
    let score = 0;
    if (passwordChecks.length) score++;
    if (passwordChecks.upper && passwordChecks.lower) score++;
    if (passwordChecks.number) score++;
    if (passwordChecks.special) score++;
    return score;
  }, [passwordChecks]);

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

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

  const handleRegisterHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("Please ensure your password meets all complexity requirements below.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify your confirm password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.registerHospital({
        hospital_name: hospitalName.trim(),
        admin_name: adminName.trim(),
        admin_email: regEmail.trim(),
        admin_password: regPassword,
        phone_number: regPhone.trim() || undefined,
        address: regAddress.trim() || undefined,
      });
      router.push("/admin/departments");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please verify your information.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setMode("signin");
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-900 font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link href="/" className="inline-flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-tight text-slate-950">HQMS</span>
        </Link>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
          Hospital Queue Management System
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          {mode === "signin"
            ? "Sign in with verified clinical or administrative credentials"
            : "Onboard your hospital or clinic in under 60 seconds"}
        </p>
      </div>

      {/* Main Container */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                mode === "signin"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition ${
                mode === "register"
                  ? "bg-white text-emerald-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Register Facility
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start space-x-2.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 1: SIGN IN FORM                                          */}
          {/* ============================================================ */}
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
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
                    placeholder="doctor@hospital.com or admin@apex.com"
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
                    <span>Verifying Clinical Station...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate Station</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ============================================================ */
            /* TAB 2: REGISTER HOSPITAL FORM                                */
            /* ============================================================ */
            <form onSubmit={handleRegisterHospital} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Hospital / Clinic Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. City Health Memorial Center"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Administrator Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Dr. Sunita Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Admin Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@hospital.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Facility Phone Number
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    City & State
                  </label>
                  <input
                    type="text"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="Mumbai, Maharashtra"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Set Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegPassword ? "text" : "password"}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Min. 8 chars, 1 uppercase, 1 number, 1 symbol"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Live Password Strength Meter */}
                {regPassword && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center space-x-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            step <= passwordScore
                              ? passwordScore === 4
                                ? "bg-emerald-600"
                                : passwordScore === 3
                                ? "bg-blue-600"
                                : passwordScore === 2
                                ? "bg-amber-500"
                                : "bg-rose-500"
                              : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
                      <div className="flex items-center space-x-1">
                        {passwordChecks.length ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className={passwordChecks.length ? "text-emerald-700 font-bold" : ""}>
                          8+ Characters
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {passwordChecks.upper && passwordChecks.lower ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className={passwordChecks.upper && passwordChecks.lower ? "text-emerald-700 font-bold" : ""}>
                          Upper & Lowercase
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {passwordChecks.number ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className={passwordChecks.number ? "text-emerald-700 font-bold" : ""}>
                          1+ Number
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {passwordChecks.special ? (
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className={passwordChecks.special ? "text-emerald-700 font-bold" : ""}>
                          1+ Symbol (@$!%*?)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Re-enter master password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full mt-3 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Provisioning Hospital Tenant...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Deploy Hospital & Launch Console</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================ */}
          {/* DISCREET DEMO TEST LOGINS ACCORDION                          */}
          {/* ============================================================ */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowDemoLogins(!showDemoLogins)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-900 font-semibold py-1 transition"
            >
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Developer / Reviewer Test Logins</span>
              </div>
              {showDemoLogins ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemoLogins && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-left animate-fade-in">
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
                    <span className="text-[11px] font-bold text-slate-900">Reception Desk</span>
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

                <button
                  type="button"
                  onClick={() => fillDemo("super.admin@platform.com", "supersecurepass")}
                  className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition text-left"
                >
                  <div className="flex items-center space-x-1.5 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-[11px] font-bold text-slate-900">Platform Super</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate font-mono">super.admin@platform.com</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
