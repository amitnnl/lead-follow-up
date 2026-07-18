import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, CheckCircle2,
  ShieldCheck, Sparkles, Car, RefreshCw, Award, Sun, Moon
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';

/* ─── Interactive Deal Preview Card (Institutional Light/Dark Mode) ───────────── */
function DealPreviewCard({ title, model, amount, status, badgeColor, delay }: {
  title: string;
  model: string;
  amount: string;
  status: string;
  badgeColor: string;
  delay: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative bg-white/95 dark:bg-[#111622]/95 hover:bg-white dark:hover:bg-[#162230] border border-slate-200/90 dark:border-slate-800/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 rounded-2xl p-4 shadow-sm hover:shadow-md backdrop-blur-xl transition-all duration-300 cursor-pointer animate-float ${
        hovered ? 'scale-[1.02] -translate-y-1 shadow-indigo-500/10 dark:shadow-indigo-500/20' : ''
      }`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs group-hover:bg-gradient-to-br group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white transition-all duration-300">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
              {title}
            </h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{model}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono tabular-nums text-sm font-black text-emerald-600 dark:text-emerald-400">{amount}</div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold mt-1 ${badgeColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {status}
          </span>
        </div>
      </div>

      {/* Simulated Live Breakdown on hover */}
      <div className={`mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono tabular-nums transition-all duration-300 overflow-hidden ${
        hovered ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0 pt-0 border-transparent'
      }`}>
        <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-500" /> Commission (90/10 Split):
        </span>
        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Agent ₹ 28,500 · Org ₹ 3,166</span>
      </div>
    </div>
  );
}


export default function Login() {
  const { login } = useAuthStore();
  const { settings } = useSettingsStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const logoLetters = settings.app_name ? settings.app_name.substring(0, 2).toUpperCase() : 'LF';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);

  useEffect(() => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setEmailValid(valid);
  }, [email]);

  useEffect(() => {
    const valid = password.length >= 6;
    setPasswordValid(valid);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;

    setError('');
    setIsLoading(true);

    try {
      const { default: api } = await import('../lib/axios');
      const response = await api.post('/auth/login', { email, password });

      if (response.data.user) {
        login(response.data.user);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or account locked');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = emailValid && passwordValid && !isLoading;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 font-sans select-none overflow-hidden relative">

      {/* Top Right Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-2xl bg-white/80 dark:bg-[#111622]/80 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 backdrop-blur-xl shadow-md transition-all cursor-pointer"
          title="Toggle Institutional Theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* ── AMBIENT PASTEL GLOW & MESH ORBS ───────────────────────── */}
      <div className="absolute top-[-10%] left-[-5%] w-[650px] h-[650px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-[35%] left-[40%] w-[450px] h-[450px] bg-sky-400/10 dark:bg-sky-400/15 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle Grid Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* ── LEFT PANEL: AI Vehicle Finance Cockpit ──────────────── */}
      <div className="hidden lg:flex lg:w-[56%] xl:w-[58%] order-2 relative flex-col justify-between p-10 xl:p-14 z-10">
        
        {/* Header brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-500 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-500/20 ring-1 ring-white/60 dark:ring-slate-700">
            {logoLetters}
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {settings.app_name || 'LeadFollow'}
              <span className="text-[10px] uppercase font-extrabold tracking-widest bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded-full">
                Enterprise v2.6
              </span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold mt-0.5">Automated Vehicle Finance & DSA Management Cockpit</p>
          </div>
        </div>

        {/* Hero showcase content */}
        <div className="my-auto space-y-7 max-w-xl py-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 rounded-full text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-4 animate-pulse shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Real-Time Lead Tracing & Sanction Automation
            </div>
            <h2 className="text-3xl xl:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-3">
              Automate Your Loan Pipeline.<br />
              <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-teal-600 dark:from-indigo-400 dark:via-violet-400 dark:to-teal-400 bg-clip-text text-transparent">
                Accelerate Disbursals.
              </span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Experience total accountability from New Application to final Disbursal. Built-in 90/10 Agent Commission split calculations, KYC document audit trails, and automated WhatsApp/call tracking.
            </p>
          </div>

          {/* Live Deal Simulator Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>🔥 Live Deal Pipeline Simulator (Hover for IRR & Payouts)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5 text-[11px] bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live Sync
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5">
              <DealPreviewCard
                title="Toyota Fortuner Legender"
                model="Rajesh Sharma · HDFC Bank · Sanctioned"
                amount="₹ 38.50 L"
                status="Approved"
                badgeColor="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                delay="0s"
              />
              <DealPreviewCard
                title="Hyundai Creta SX (O)"
                model="Ananya Verma · ICICI Bank · Verification"
                amount="₹ 14.80 L"
                status="Pending"
                badgeColor="bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                delay="0.3s"
              />
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-6 font-medium">
          <p>© {new Date().getFullYear()} {settings.company_name || 'LeadFollow CRM'}. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> RBI & NBFC Ready</span>
            <span>·</span>
            <span className="font-mono">v2.6.0-PRO</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Pristine Light/Dark Glass Login Form ─────────── */}
      <div className="w-full lg:w-[44%] xl:w-[42%] order-1 flex flex-col justify-center min-h-screen relative p-6 sm:p-10 lg:p-12 z-10">
        
        <div className="max-w-md w-full mx-auto">
          
          {/* Mobile Header */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shadow-indigo-500/20">
              {logoLetters}
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight">{settings.app_name || 'LeadFollow'}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest">Vehicle Finance CRM</p>
            </div>
          </div>

          {/* Institutional Glass Card Container */}
          <div className="bg-white/95 dark:bg-[#111622]/95 md:bg-white/90 dark:md:bg-[#111622]/85 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(79,70,229,0.12)] dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] relative overflow-hidden">
            
            {/* Top Glowing Gradient Line */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 dark:from-indigo-400 dark:via-violet-400 dark:to-cyan-400" />

            {/* Back Link */}
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 mb-6 transition-colors group">
              <ArrowRight className="w-3.5 h-3.5 rotate-180 transition-transform group-hover:-translate-x-0.5" />
              Back to Home
            </Link>

            {/* Title */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Sign In <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">
                Access your customized workspace, manage applications, or verify KYC documents.
              </p>
            </div>



            {/* Error Message */}
            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 rounded-2xl p-3.5 mb-5 text-xs font-bold flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
                  Work Email / User ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); }}
                    className={`w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-[#0e131d] border rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all font-semibold ${
                      emailValid && email
                        ? 'border-emerald-500 focus:border-emerald-600 dark:focus:border-emerald-400 focus:bg-white dark:focus:bg-[#111622] focus:ring-4 focus:ring-emerald-500/10'
                        : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-[#111622] focus:ring-4 focus:ring-indigo-600/10'
                    }`}
                    placeholder="name@vehiclecrm.com"
                    disabled={isLoading}
                  />
                  {emailValid && email && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="password">
                    Password
                  </label>
                  <a href="#forgot" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold transition-colors">
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); }}
                    className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-[#0e131d] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-all font-mono tracking-wider focus:bg-white dark:focus:bg-[#111622] focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-4 focus:ring-indigo-600/10"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded bg-white dark:bg-[#0e131d] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  Remember login session
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-3 relative overflow-hidden group ${
                  canSubmit
                    ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 hover:brightness-110 text-white shadow-lg shadow-indigo-500/25 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Cockpit</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Security Trust Badges */}
            <div className="mt-7 pt-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> AES-256 Encrypted
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Multi-Tier Access
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating animation css */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}