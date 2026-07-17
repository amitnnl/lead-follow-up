import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  Car, Landmark, ShieldCheck, ChevronRight, Calculator, Sparkles,
  CheckCircle2, PhoneCall, AlertTriangle, X, MessageCircle,
  Instagram, Facebook, Linkedin, Twitter, MessageSquare, ArrowRight,
  Percent, FileCheck, Headphones, Gauge, Clock, Wallet, TrendingUp,
  Shield, Star, Zap, UserCheck, Sun, Moon, Building2, Award, BarChart3
} from 'lucide-react';
import api from '../lib/axios';
import { useThemeStore } from '../store/themeStore';

type LoanType = 'new_loan' | 'refinance' | 'repurchase' | 'bt';

interface LoanProduct { title: string; description: string; badge?: string; icon: React.ElementType; features: string[]; cta: string; color: string; }
interface Feature { icon: React.ElementType; title: string; description: string; }
interface TrustStat { value: string; label: string; icon: React.ElementType; color: string; }

const LOAN_PRODUCTS: LoanProduct[] = [
  { title: 'New Car Loan', description: 'Finance up to 90% on-road price of passenger cars with minimal documentation and quick approval.', badge: 'Most Popular', icon: Car, features: ['Up to 90% LTV', 'Flexible tenure 1–7 yrs', 'Lowest interest rates'], cta: 'Apply Now', color: 'indigo' },
  { title: 'Commercial Vehicle', description: 'Secure capital for trucks, tippers, buses, and pick-up loaders at high loan-to-value ratios.', icon: Gauge, features: ['High LTV on CV assets', 'Lease & hire-purchase', 'DSA partner benefits'], cta: 'Explore CV Loan', color: 'emerald' },
  { title: 'Refinance & BT', description: 'Unlock cash from your existing vehicle or transfer balance to cut EMIs and access better rates.', icon: TrendingUp, features: ['Top-up on existing vehicle', 'Balance transfer deals', 'Reduced EMIs'], cta: 'Check Eligibility', color: 'violet' },
  { title: 'Used Car Loan', description: 'Purchase certified pre-owned vehicles with flexible valuation rates and simple documentation.', icon: ShieldCheck, features: ['Cars up to 10 years old', 'Competitive used-car rates', 'Fast disbursal'], cta: 'Get Quote', color: 'amber' }
];

const WHY_US: Feature[] = [
  { icon: Clock, title: 'Approval in 24 Hours', description: 'Our digital-first process ensures you get fast approvals without traditional bank queues.' },
  { icon: FileCheck, title: 'Minimal Documentation', description: 'Upload Aadhaar, PAN, and vehicle documents securely. We handle the rest with your financer.' },
  { icon: Percent, title: 'Best Interest Rates', description: 'We compare offers across partner banks & NBFCs to get you the most competitive rate.' },
  { icon: Headphones, title: 'Dedicated RM', description: 'A single point of contact guides you from application to disbursement, always available.' },
  { icon: Wallet, title: 'Transparent Payouts', description: 'For DSA partners, track every commission, retention, and bonus payout in real-time.' },
  { icon: Shield, title: 'Bank-Grade Security', description: 'Your data and documents are encrypted and stored with enterprise-level security.' }
];

const TRUST_STATS: TrustStat[] = [
  { value: '₹500Cr+', label: 'Loans Facilitated', icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
  { value: '15,000+', label: 'Happy Customers', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  { value: '50+', label: 'Partner Financers', icon: Building2, color: 'text-violet-600 bg-violet-50' },
  { value: '4.9/5', label: 'Customer Rating', icon: Award, color: 'text-amber-600 bg-amber-50' }
];

const TESTIMONIALS = [
  { name: 'Ramesh Patel', role: 'Transport Business Owner', quote: 'Got my commercial vehicle loan approved in 2 days. The DSA partner portal made tracking everything transparent.', rating: 5 },
  { name: 'Priya Sharma', role: 'Car Buyer, Mumbai', quote: 'The EMI calculator helped me plan my budget. The entire process was smooth and paperless.', rating: 5 },
  { name: 'Amit Verma', role: 'DSA Channel Partner', quote: 'Commission tracking and tier bonuses are crystal clear. Best vehicle finance CRM I have used for my agency.', rating: 5 }
];

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return value;
}

function AnimatedStat({ value, label, icon: Icon, color }: TrustStat) {
  const numeric = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  const suffix = value.replace(/[0-9.]/g, '');
  const count = useCountUp(numeric);
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color} dark:bg-opacity-15`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
        {value.includes('₹') ? '₹' : ''}{count.toLocaleString('en-IN')}{suffix}
      </div>
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
      ))}
    </div>
  );
}

const PRODUCT_COLORS: Record<string, { bg: string; icon: string; badge: string; hover: string }> = {
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600 dark:text-indigo-400', badge: 'bg-indigo-600 text-white', hover: 'hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-indigo-100 dark:hover:shadow-indigo-500/10' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-600 text-white', hover: 'hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-emerald-100 dark:hover:shadow-emerald-500/10' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600 dark:text-violet-400', badge: 'bg-violet-600 text-white', hover: 'hover:border-violet-300 dark:hover:border-violet-500 hover:shadow-violet-100 dark:hover:shadow-violet-500/10' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-600 text-white', hover: 'hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-amber-100 dark:hover:shadow-amber-500/10' }
};

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();

  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((p) => (p + 1) % 4), 5000);
    return () => clearInterval(timer);
  }, []);

  const dynamicSlides = useMemo(() => [
    { title: settings.slide1_title, description: settings.slide1_description, badge: settings.slide1_badge, icon: Car, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { title: settings.slide2_title, description: settings.slide2_description, badge: settings.slide2_badge, icon: Landmark, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { title: settings.slide3_title, description: settings.slide3_description, badge: settings.slide3_badge, icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-100' },
    { title: settings.slide4_title, description: settings.slide4_description, badge: settings.slide4_badge, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-100' }
  ], [settings]);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [interestRate, setInterestRate] = useState<number>(10.5);
  const emi = useMemo(() => {
    const P = loanAmount; const r = (interestRate / 12) / 100; const n = tenureYears * 12;
    if (r === 0) return Math.round(P / n);
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [loanAmount, tenureYears, interestRate]);
  const totalPayment = emi * tenureYears * 12;
  const totalInterest = totalPayment - loanAmount;

  const [formData, setFormData] = useState({ customer_name: '', customer_mobile: '', loan_amount: '500000', vehicle_make_model: '', loan_type: 'new_loan' as LoanType });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successLead, setSuccessLead] = useState<{ lead_id: string; id: number } | null>(null);
  const [isSocialOpen, setIsSocialOpen] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loanAmountFloat = parseFloat(formData.loan_amount || '0');
  const isFormValid = formData.customer_name.trim().length >= 2 && /^[0-9]{10}$/.test(formData.customer_mobile) && loanAmountFloat >= 50000 && formData.vehicle_make_model.trim().length >= 2;

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true); setError(''); setSuccessLead(null);
    try {
      const response = await api.post('/leads/public-create', { customer_name: formData.customer_name, customer_mobile: formData.customer_mobile, loan_amount: loanAmountFloat, vehicle_make_model: formData.vehicle_make_model, loan_type: formData.loan_type });
      if (response.data?.lead_id) {
        setSuccessLead({ lead_id: response.data.lead_id, id: response.data.id });
        setFormData({ customer_name: '', customer_mobile: '', loan_amount: '500000', vehicle_make_model: '', loan_type: 'new_loan' });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit application. Please check your inputs.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden">

      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-[#111622]/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/80 shadow-sm shadow-slate-900/[0.04] dark:shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight leading-none">{settings.app_name}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide">Vehicle Finance CRM</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {[{ label: 'Solutions', href: '#solutions' }, { label: 'EMI Calculator', href: '#calculator' }, { label: 'Why Us', href: '#why-us' }, { label: 'Apply', href: '#apply' }].map((item) => (
              <a key={item.label} href={item.href} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all">{item.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={toggleTheme} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 text-slate-400 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all cursor-pointer" aria-label="Toggle Theme">
              {isDark ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <Link to="/login" className="hidden sm:inline-flex px-4 py-2 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all items-center gap-1.5">
              Partner Login
            </Link>
            <a href="#apply" className="inline-flex px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all items-center gap-1.5">
              Apply Now <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-[#0B0F19] dark:via-[#0e131d] dark:to-[#111622]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-100/40 dark:bg-indigo-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-violet-100/30 dark:bg-violet-600/10 rounded-full blur-[80px]" />
          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.035] dark:opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Text */}
            <div className="space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-100 dark:bg-indigo-500/15 border border-indigo-200/80 dark:border-indigo-500/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Next-Gen Vehicle Finance DSA</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Finance Your Vehicle<br className="hidden sm:block" />{' '}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 dark:from-indigo-400 dark:via-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">Instantly & Smartly</span>
              </h1>

              <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
                Apply online in under 2 minutes. We compare rates across India's top financers, minimize your paperwork, and get you on the road faster.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <a href="#apply" className="group px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center gap-2">
                  Apply for Loan <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <a href="#calculator" className="px-7 py-3.5 bg-white dark:bg-[#111622] hover:bg-slate-50 dark:hover:bg-[#162230] text-slate-700 dark:text-slate-200 rounded-2xl text-sm font-bold border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Calculate EMI
                </a>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-5 text-xs font-semibold text-slate-400 dark:text-slate-400">
                {['No hidden charges', 'Free eligibility check', '24/7 support'].map((t) => (
                  <div key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> {t}</div>
                ))}
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-violet-500/8 dark:from-indigo-500/20 dark:to-violet-500/15 rounded-[2.5rem] blur-2xl -z-10" />
              <div className="relative bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-slate-200/80 dark:shadow-black/50">
                {/* Card header */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">Offerings Showcase</span>
                  </div>
                  <span className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider">
                    {dynamicSlides[currentSlide].badge}
                  </span>
                </div>

                {/* Slide content */}
                <div className="pt-6 pb-4 min-h-[180px] flex flex-col justify-center">
                  <div className="flex items-start gap-4">
                    <div className={`p-3.5 rounded-2xl ${dynamicSlides[currentSlide].bg.replace('bg-', 'bg-').replace('100', '100 dark:bg-opacity-15')}`}>
                      {React.createElement(dynamicSlides[currentSlide].icon, { className: `w-7 h-7 ${dynamicSlides[currentSlide].color}` })}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{dynamicSlides[currentSlide].title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{dynamicSlides[currentSlide].description}</p>
                    </div>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="flex justify-center gap-2 pt-2">
                  {dynamicSlides.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx ? 'w-8 bg-indigo-600 dark:bg-indigo-500' : 'w-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
                      aria-label={`Slide ${idx + 1}`} />
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Stats ───────────────────────────────────────────── */}
      <section className="border-y border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0e131d]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
            {TRUST_STATS.map((stat, idx) => (
              <AnimatedStat key={idx} {...stat} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Loan Solutions ────────────────────────────────────────── */}
      <section id="solutions" className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" /> Loan Solutions <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" />
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Finance for Every Vehicle Need</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">From personal cars to heavy commercial fleets — flexible schemes tailored for every use case.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOAN_PRODUCTS.map((product, idx) => {
              const c = PRODUCT_COLORS[product.color];
              return (
                <div key={idx} className={`group bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col ${c.hover}`}>
                  <div className="flex justify-between items-start mb-5">
                    <div className={`p-3 rounded-2xl ${c.bg.replace('bg-', 'bg-').replace('50', '50 dark:bg-opacity-15')} group-hover:scale-110 transition-transform`}>
                      <product.icon className={`w-6 h-6 ${c.icon}`} />
                    </div>
                    {product.badge && (
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg tracking-wider ${c.badge}`}>{product.badge}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{product.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 flex-1">{product.description}</p>
                  <ul className="space-y-2 mb-5">
                    {product.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" /> {feature}
                      </li>
                    ))}
                  </ul>
                  <a href="#apply" className={`w-full py-2.5 border border-slate-200 dark:border-slate-700 hover:border-transparent ${c.bg.replace('50', '600')} hover:bg-gradient-to-r text-slate-700 dark:text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 group/link`}>
                    {product.cta} <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ─────────────────────────────────────────── */}
      <section id="why-us" className="py-20 lg:py-28 bg-slate-50/60 dark:bg-[#0e131d]/60 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" /> Why LeadFlow Pro
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Built for Speed,<br />Transparency & Scale
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Whether you're a vehicle buyer, dealer, DSA partner, or bank executive — our CRM connects every stakeholder on a single, easy-to-use platform.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {WHY_US.map((feature, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-50 dark:hover:shadow-indigo-500/10 transition-all group cursor-default">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
                      <feature.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-violet-500/8 dark:from-indigo-500/20 dark:to-violet-500/15 rounded-[2.5rem] blur-3xl" />
              <div className="relative bg-slate-900 dark:bg-[#111622] border border-slate-800/80 rounded-[2rem] p-6 sm:p-8 shadow-2xl overflow-hidden text-white">
                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center"><Gauge className="w-5 h-5 text-white" /></div>
                      <div>
                        <div className="text-sm font-bold">Dashboard Preview</div>
                        <div className="text-[10px] text-slate-400">Real-time CRM insights</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[{ label: 'Total Leads', value: '1,248', color: 'text-indigo-400' }, { label: 'Disbursed', value: '₹42.6Cr', color: 'text-emerald-400' }, { label: 'Pending', value: '86', color: 'text-amber-400' }, { label: 'Conversion', value: '68%', color: 'text-violet-400' }].map((kpi, i) => (
                      <div key={i} className="bg-white/5 dark:bg-white/10 border border-white/8 rounded-xl p-3">
                        <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">{kpi.label}</div>
                        <div className={`text-lg font-black font-mono tabular-nums ${kpi.color}`}>{kpi.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5">
                    {[{ name: 'Rajesh Transport', status: 'Disbursed', amount: '₹18,50,000', color: 'bg-emerald-500/20 text-emerald-400' }, { name: 'Mehta Motors', status: 'Approved', amount: '₹9,20,000', color: 'bg-blue-500/20 text-blue-400' }, { name: 'Sinha Logistics', status: 'Pending', amount: '₹14,00,000', color: 'bg-amber-500/20 text-amber-400' }].map((lead, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/5 dark:bg-white/10 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/30 flex items-center justify-center text-[10px] font-bold">{lead.name.charAt(0)}</div>
                          <div className="text-xs font-semibold">{lead.name}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lead.color}`}>{lead.status}</span>
                          <span className="text-[11px] font-mono tabular-nums font-semibold hidden sm:block text-slate-300">{lead.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── EMI Calculator ────────────────────────────────────────── */}
      <section id="calculator" className="py-20 lg:py-28 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" /> Plan Your EMI
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
              <Calculator className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> EMI Calculator
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm">Estimate your monthly outgo with our reducing-rate simulator.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm space-y-8">
              {[
                { label: 'Loan Amount', value: loanAmount, min: 100000, max: 2000000, step: 50000, display: formatCurrency(loanAmount), prefix: '₹1 Lakh', suffix: '₹20 Lakhs' },
                { label: 'Tenure', value: tenureYears, min: 1, max: 7, step: 1, display: `${tenureYears} Years`, prefix: '1 Year', suffix: '7 Years' },
                { label: 'Interest Rate', value: interestRate, min: 8.5, max: 18, step: 0.25, display: `${interestRate}% p.a.`, prefix: '8.5% p.a.', suffix: '18% p.a.' }
              ].map((field) => (
                <div key={field.label} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{field.label}</span>
                    <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400 text-base bg-indigo-50 dark:bg-indigo-500/15 px-3 py-1 rounded-lg">{field.display}</span>
                  </div>
                  <input type="range" min={field.min} max={field.max} step={field.step} value={field.value}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (field.label === 'Loan Amount') setLoanAmount(val);
                      else if (field.label === 'Tenure') setTenureYears(val);
                      else setInterestRate(val);
                    }}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                  <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums font-bold">
                    <span>{field.prefix}</span><span>{field.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Results */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-600/25 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="text-center mb-8">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-100">Estimated EMI</span>
                  <p className="text-4xl sm:text-5xl font-black font-mono tabular-nums mt-2">{formatCurrency(emi)}<span className="text-base font-normal text-indigo-200">/mo</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] text-indigo-100 uppercase font-bold block">Principal</span>
                    <span className="text-sm font-mono tabular-nums font-bold block mt-1">{formatCurrency(loanAmount)}</span>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-4">
                    <span className="text-[10px] text-indigo-100 uppercase font-bold block">Total Interest</span>
                    <span className="text-sm font-mono tabular-nums font-bold block mt-1">{formatCurrency(Math.max(0, Math.round(totalInterest)))}</span>
                  </div>
                </div>
                <div className="bg-white/10 border border-white/10 rounded-2xl p-4 mb-4 text-xs leading-relaxed">
                  <span className="font-bold text-indigo-100 block mb-0.5">Eligibility Tip:</span>
                  Required monthly salary ≈ <strong className="text-white font-mono tabular-nums">{formatCurrency(emi * 2)}</strong> for smooth approval.
                </div>
                <a href="#apply" onClick={() => setFormData((p) => ({ ...p, loan_amount: loanAmount.toString() }))}
                  className="block w-full py-3.5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-bold transition-all shadow-lg text-center">
                  Apply for This Amount
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-3">
              <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" /> Testimonials
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Trusted by Buyers & Partners</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, idx) => (
              <div key={idx} className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                <StarRating rating={t.rating} />
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic flex-1">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/50 dark:to-violet-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Application Form ──────────────────────────────────────── */}
      <section id="apply" className="py-20 lg:py-28 bg-slate-50/60 dark:bg-[#0e131d]/60 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-black/50">
            <div className="text-center space-y-3 mb-8">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                <span className="w-4 h-px bg-indigo-300 dark:bg-indigo-600" /> Get Started
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                <PhoneCall className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> Apply for Vehicle Finance
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Fill out the details below. Our executive will call you back shortly.</p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[{ label: 'Full Name *', name: 'customer_name', type: 'text', placeholder: 'e.g. John Doe' }, { label: 'Mobile Number *', name: 'customer_mobile', type: 'tel', placeholder: '10-digit number' }].map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{f.label}</label>
                    <input type={f.type} name={f.name} required value={(formData as any)[f.name]} onChange={handleFormChange} placeholder={f.placeholder}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0e131d] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-[#162230] transition-all font-medium" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {[{ label: 'Loan Amount (₹) *', name: 'loan_amount', type: 'number', placeholder: 'e.g. 500000' }, { label: 'Vehicle Make & Model *', name: 'vehicle_make_model', type: 'text', placeholder: 'e.g. Tata Ace Gold' }].map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">{f.label}</label>
                    <input type={f.type} name={f.name} required min={f.type === 'number' ? 50000 : undefined} value={(formData as any)[f.name]} onChange={handleFormChange} placeholder={f.placeholder}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0e131d] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-[#162230] transition-all font-medium" />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Loan Type *</label>
                  <select name="loan_type" value={formData.loan_type} onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#0e131d] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-500/10 focus:bg-white dark:focus:bg-[#162230] transition-all font-medium">
                    <option value="new_loan">New Vehicle Loan</option>
                    <option value="refinance">Refinance Loan</option>
                    <option value="repurchase">Repurchase Loan</option>
                    <option value="bt">Balance Transfer (BT)</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={!isFormValid || submitting}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1">
                {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Submit Application</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-indigo-600 to-violet-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">Ready to Drive Your Business Forward?</h2>
          <p className="text-sm text-indigo-100 mb-8 max-w-2xl mx-auto">Join hundreds of DSA partners and dealers using LeadFlow Pro to manage vehicle finance leads effortlessly.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#apply" className="px-7 py-3.5 bg-white text-indigo-700 rounded-2xl text-sm font-bold shadow-lg hover:bg-indigo-50 transition-all">Apply for Loan</a>
            <Link to="/login" className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-sm font-bold transition-all">Partner Login</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-white dark:bg-[#0e131d] border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">{settings.app_name}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">India's modern vehicle finance CRM. Built for DSAs, dealers, bank executives, and borrowers.</p>
              <div className="flex gap-2">
                {[settings.instagram_url || 'https://instagram.com', settings.facebook_url || 'https://facebook.com', settings.linkedin_url || 'https://linkedin.com', settings.twitter_url || 'https://twitter.com'].map((url, i) => {
                  const icons = [Instagram, Facebook, Linkedin, Twitter];
                  const Icon = icons[i];
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white rounded-xl transition-all">
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Quick Links</h4>
              <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                {[{ label: 'Loan Solutions', href: '#solutions' }, { label: 'EMI Calculator', href: '#calculator' }, { label: 'Why LeadFlow Pro', href: '#why-us' }].map((l) => (
                  <li key={l.label}><a href={l.href} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{l.label}</a></li>
                ))}
                <li><Link to="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Partner Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Contact</h4>
              <ul className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400">
                <li>Email: <span className="font-semibold text-slate-700 dark:text-slate-200">{settings.support_email}</span></li>
                <li>Call: <span className="font-semibold text-slate-700 dark:text-slate-200 font-mono tabular-nums">{settings.contact_number}</span></li>
                <li>WhatsApp: <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">{settings.whatsapp_number}</span></li>
                <li>Hours: Mon - Sat (9:00 AM - 6:00 PM)</li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Office Address</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{settings.office_address || 'Please configure office address in settings.'}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-slate-500">
            <p>© {new Date().getFullYear()} {settings.company_name}. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#calculator" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">EMI Calculator</a>
              <a href="#apply" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Apply Now</a>
              <Link to="/login" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-semibold">Partner Login</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ── Success Modal ─────────────────────────────────────────── */}
      {successLead && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-100 dark:bg-emerald-950/40 rounded-full blur-3xl pointer-events-none" />
            <button onClick={() => setSuccessLead(null)} className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Application Received!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your vehicle loan application has been registered successfully.</p>
            </div>
            <div className="bg-slate-50 dark:bg-[#0e131d] border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase block tracking-wider">Your Unique Lead ID</span>
              <span className="font-mono tabular-nums text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-wider block mt-1">{successLead.lead_id}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Save this Lead ID for tracking. Our validation executive will contact you shortly.</p>
            <button onClick={() => setSuccessLead(null)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-all">
              Close Window
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Support Widget ───────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isSocialOpen && (
          <div className="bg-white/95 dark:bg-[#111622]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-5 w-80 space-y-4 text-slate-800 dark:text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Connect & Support</span>
              </div>
              <button onClick={() => setIsSocialOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Have questions about vehicle finance or DSA onboarding? Chat with our team instantly!</p>
            <div className="space-y-2">
              <a href={`https://wa.me/${(settings.whatsapp_number || '').replace(/\D/g, '')}?text=Hi%2C%20I%20am%20interested%20in%20applying%20for%20a%20vehicle%20loan.`} target="_blank" rel="noopener noreferrer"
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/25 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5"><MessageCircle className="w-4 h-4" /><span>Chat on WhatsApp</span></div>
                <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded-full uppercase">Instant</span>
              </a>
              <a href={`tel:${settings.contact_number}`}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5"><PhoneCall className="w-4 h-4" /><span>Call 24/7 Helpline</span></div>
                <span className="text-[10px] bg-indigo-700/80 px-2 py-0.5 rounded-full uppercase">Free</span>
              </a>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-extrabold block text-center">Follow Official Channels</span>
              <div className="grid grid-cols-4 gap-2">
                {[settings.instagram_url || 'https://instagram.com', settings.facebook_url || 'https://facebook.com', settings.linkedin_url || 'https://linkedin.com', settings.twitter_url || 'https://twitter.com'].map((url, i) => {
                  const icons = [Instagram, Facebook, Linkedin, Twitter];
                  const Icon = icons[i];
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center transition-all">
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <button onClick={() => setIsSocialOpen(!isSocialOpen)}
          className="group px-5 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white rounded-full shadow-2xl shadow-indigo-600/40 hover:shadow-indigo-600/60 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 relative cursor-pointer">
          <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </span>
          <div className="flex items-center gap-2">
            {isSocialOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            <span className="font-extrabold text-xs tracking-wide">{isSocialOpen ? 'Close Hub' : 'Live Support'}</span>
          </div>
        </button>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
