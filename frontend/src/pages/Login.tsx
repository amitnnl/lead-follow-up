import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, CheckCircle2,
  ShieldCheck, RefreshCw, Sun, Moon, Car, ChevronLeft
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeStore } from '../store/themeStore';
import api from '../lib/axios';

export default function Login() {
  const { login } = useAuthStore();
  const { settings } = useSettingsStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const appTitle = settings.app_name || 'LeadFlow Pro';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    setEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  }, [email]);

  useEffect(() => {
    setPasswordValid(password.length >= 4);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.user) {
        login(response.data.user);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid email or password. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = emailValid && passwordValid && !isLoading;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans relative transition-colors select-none ${isDark ? 'bg-[#0B0F19] text-white' : 'bg-slate-100 text-slate-900'}`}>

      {/* ── Background Pattern ────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute inset-0 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`}
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} 
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl bg-indigo-500/10 pointer-events-none" />
      </div>

      {/* ── Theme Toggle Button ───────────────────────────────────── */}
      <button
        onClick={toggleTheme}
        type="button"
        className="fixed top-5 right-5 z-50 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-600 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm transition-all cursor-pointer"
        title="Toggle Light / Dark Mode"
      >
        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
      </button>

      {/* ── Centered Login Card ──────────────────────────────────── */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 space-y-5">

        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Public Website</span>
        </Link>

        {/* App Brand Header */}
        <div className="flex items-center gap-3 pt-1 pb-1">
          <div className="w-14 h-14 rounded-none bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0 overflow-hidden relative border border-slate-100 dark:border-slate-800">
            <img 
              src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/AppLogo.png?v=${settings.logo_updated_at || '1'}`} 
              alt="Logo" 
              className="w-full h-full object-contain absolute inset-0 z-10 bg-white dark:bg-slate-900"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <Car className="w-5 h-5 text-white relative z-0" />
          </div>
          <div className="text-left">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{appTitle}</h1>
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Vehicle & Asset Finance CRM
            </span>
          </div>
        </div>

        {/* Form Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Partner & Staff Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Sign in with your authorized work email and password to enter your workspace.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl p-3 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">
              Registered Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-10 h-10 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all font-medium ${
                  emailValid && email
                    ? 'border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
                }`}
                placeholder="admin@leadflowpro.com"
                disabled={isLoading}
              />
              {emailValid && email && (
                <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
              )}
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300" htmlFor="password">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 h-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all font-medium focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-all cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Security */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Remember session</span>
            </label>

            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Encrypted Portal
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full h-11 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-3 ${
              canSubmit
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In To Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Footer Badges */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>Role-Based Permissions</span>
          <span>© {new Date().getFullYear()} {settings.company_name || appTitle}</span>
        </div>

      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.3s ease; }
      `}</style>
    </div>
  );
}
