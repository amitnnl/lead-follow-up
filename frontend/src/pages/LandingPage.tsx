import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  ShieldCheck, ChevronRight, Calculator, Sparkles,
  CheckCircle2, PhoneCall, AlertTriangle, X,
  Instagram, Facebook, Linkedin, ArrowRight,
  Clock, Sun, Moon, Award,
  Search, Check, Phone, Mail, MapPin, Sparkle, Car, Gauge, TrendingUp, Building2,
  Lock, Zap, User, Smartphone, SlidersHorizontal, Home, Briefcase, Landmark
} from 'lucide-react';
import api from '../lib/axios';
import { useThemeStore } from '../store/themeStore';

type Lang = 'en' | 'hi';
type LoanType = 'new_loan' | 'refinance' | 'repurchase' | 'bt';

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { settings } = useSettingsStore();

  // Set default language to English ('en')
  const [lang, setLang] = useState<Lang>('en');
  const t = (en: string, hi: string) => (lang === 'en' ? en : hi);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [tenureYears, setTenureYears] = useState<number>(5);
  const [interestRate, setInterestRate] = useState<number>(9.5);

  const emi = useMemo(() => {
    const P = loanAmount;
    const r = interestRate / 12 / 100;
    const n = tenureYears * 12;
    if (r === 0) return Math.round(P / n);
    return Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  }, [loanAmount, tenureYears, interestRate]);

  const totalPayment = emi * tenureYears * 12;
  const totalInterest = Math.max(0, totalPayment - loanAmount);

  // Application Form State
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    loan_amount: '500000',
    vehicle_make_model: '',
    loan_type: 'new_loan' as LoanType
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successLead, setSuccessLead] = useState<{ lead_id: string; id: number } | null>(null);

  // Status Search Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusQuery, setStatusQuery] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [searchedLead, setSearchedLead] = useState<any>(null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loanAmountFloat = parseFloat(formData.loan_amount || '0');
  const isFormValid =
    formData.customer_name.trim().length >= 2 &&
    /^[0-9]{10}$/.test(formData.customer_mobile) &&
    loanAmountFloat >= 10000;

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitting(true);
    setError('');
    setSuccessLead(null);
    try {
      const response = await api.post('/leads/public-create', {
        customer_name: formData.customer_name,
        customer_mobile: formData.customer_mobile,
        loan_amount: loanAmountFloat,
        vehicle_make_model: formData.vehicle_make_model || 'Vehicle/Personal Finance',
        loan_type: formData.loan_type
      });
      if (response.data?.lead_id) {
        setSuccessLead({ lead_id: response.data.lead_id, id: response.data.id });
        setFormData({
          customer_name: '',
          customer_mobile: '',
          loan_amount: '500000',
          vehicle_make_model: '',
          loan_type: 'new_loan'
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to submit application. Please check your inputs.', 'आवेदन भेजने में विफलता। कृपया पुनः प्रयास करें।'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusQuery.trim()) return;
    setStatusLoading(true);
    setStatusError('');
    setSearchedLead(null);
    try {
      const res = await api.get(`/leads/public-status?query=${encodeURIComponent(statusQuery.trim())}`);
      if (res.data?.lead) {
        setSearchedLead(res.data.lead);
      }
    } catch (err: any) {
      setStatusError(
        err.response?.data?.error || t('No application found for the provided Lead ID or Mobile number.', 'आपके दर्ज किए गए विवरण से कोई आवेदन नहीं मिला।')
      );
    } finally {
      setStatusLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'disbursed':
      case 'approved':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300';
      case 'pending':
      case 'on_hold':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300';
      default:
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 font-sans selection:bg-indigo-600 selection:text-white overflow-x-hidden">
      
      {/* ── Top Header Bar (App Contact Info & Lang Switcher) ───────── */}
      <div className="bg-[#0f172a] text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-6 flex-wrap justify-center sm:justify-start">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <a href={`mailto:${settings.support_email}`} className="hover:text-white transition-colors">
                {settings.support_email}
              </a>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              <a href={`tel:${settings.contact_number}`} className="hover:text-white transition-colors">
                {settings.contact_number}
              </a>
            </span>

          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {settings.facebook_url && (
                <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-slate-800 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all">
                  <Facebook className="w-3 h-3" />
                </a>
              )}
              {settings.instagram_url && (
                <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-slate-800 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all">
                  <Instagram className="w-3 h-3" />
                </a>
              )}
              {settings.linkedin_url && (
                <a href={settings.linkedin_url} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-slate-800 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all">
                  <Linkedin className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Language Toggle (English Default, Hindi Second) */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-full border border-slate-700">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all ${
                  lang === 'en'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full transition-all ${
                  lang === 'hi'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#0B101E]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-none bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-md shadow-indigo-600/20 overflow-hidden relative border border-slate-100 dark:border-slate-800">
              <img 
                src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/AppLogo.png?v=${settings.logo_updated_at || '1'}`} 
                alt="Logo" 
                className="w-full h-full object-contain absolute inset-0 z-10 bg-white dark:bg-slate-900"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <Car className="w-4 h-4 text-white relative z-0" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight leading-tight">
                {settings.app_name}
              </span>
              <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                {t('Vehicle & Business Finance Solutions', 'वाहन एवं व्यावसायिक वित्त समाधान')}
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { label: t('Solutions', 'समाधान'), href: '#solutions' },
              { label: t('EMI Calculator', 'ईएमआई कैलकुलेटर'), href: '#calculator' },
              { label: t('Why Us', 'हमारे लाभ'), href: '#why-us' },
              { label: t('Eligibility', 'पात्रता'), href: '#eligibility' },
              { label: t('Contact Us', 'संपर्क करें'), href: '#apply' }
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-indigo-500 text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Loan Status Button */}
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-indigo-600/30 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold shadow-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{t('Check Status', 'स्टेटस चेक करें')}</span>
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 hover:border-indigo-600 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold transition-all"
            >
              {t('Partner Login', 'पार्टनर लॉगिन')}
            </Link>

            <a
              href="#apply"
              className="inline-flex px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-full text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all items-center gap-1"
            >
              <span>{t('Apply Now', 'आवेदन करें')}</span>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-200" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Banner Section ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-900 pt-12 pb-16 lg:pt-20 lg:pb-24">
        {/* Animated Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[100px] animate-pulse pointer-events-none mix-blend-screen" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse pointer-events-none mix-blend-screen" style={{ animationDuration: '10s' }}></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-cyan-400/20 blur-[90px] animate-pulse pointer-events-none mix-blend-screen" style={{ animationDuration: '12s' }}></div>
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-cyan-300 text-xs font-bold shadow-lg shadow-cyan-500/10">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>★ 4.9/5 Rating • {t('Empowering Your Mobility & Business Growth', 'आपकी प्रगति एवं सपनों का सशक्त माध्यम')}</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-sans">
                {t('Fast & Flexible ', 'आसान और त्वरित ')}
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 font-sans">
                  {t('Vehicle & Asset Finance', 'वाहन एवं बिजनेस लोन सुविधा')}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {t(
                  'Get low-interest loan options for commercial vehicles, passenger cars, business expansion, and refinancing with transparent 24-hour digital approvals.',
                  'कम ब्याज दरों पर वाणिज्यिक वाहन, कार, व्यापार विस्तार और रीफाइनेंस लोन की पारदर्शी 24-घंटे में डिजिटल मंजूरी।'
                )}
              </p>

              {/* Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#apply"
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full text-sm font-black shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 border border-white/10"
                >
                  <span>{t('Apply for Loan Now', 'लोन के लिए तुरंत आवेदन करें')}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </a>

                <button
                  onClick={() => setIsStatusModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md rounded-full text-sm font-bold shadow-lg border border-white/20 hover:border-white/40 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>{t('Check Application Status', 'आवेदन की स्थिति देखें')}</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/10">
                {[
                  { title: t('Up to 90% LTV', '90% तक LTV'), icon: ShieldCheck },
                  { title: t('24h Disbursal', '24h डिसबर्सल'), icon: Clock },
                  { title: t('Lowest EMIs', 'कम EMI दर'), icon: Calculator },
                  { title: t('Dedicated RM', 'समर्पित सपोर्ट'), icon: PhoneCall }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 justify-center lg:justify-start group">
                    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all duration-300">
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Box */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
              <div className="relative mx-auto max-w-md bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 sm:p-8 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden group hover:border-white/30 transition-all duration-500">
                
                {/* Internal Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Floating Badge */}
                <div className="absolute -top-3 -right-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-5 py-2.5 rounded-full shadow-lg shadow-cyan-500/30 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 animate-bounce z-20">
                  <Sparkle className="w-4 h-4 text-yellow-300" />
                  <span>{t('Instant Pre-Approval', 'त्वरित प्री-अप्रूवल')}</span>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="text-2xl font-black text-white">{t('Finance Offerings', 'वित्तीय समाधान')}</h3>
                      <p className="text-xs text-cyan-300 font-semibold mt-1 tracking-wide">{t('Minimal paper documentation & quick approval', 'न्यूनतम दस्तावेज और त्वरित स्वीकृति')}</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                      <Award className="w-6 h-6 text-cyan-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: t('New & Used Vehicle Finance', 'नई व पुरानी गाड़ी लोन'), desc: t('Cars, SUVs, Multi-utility vehicles', 'कार, एसयूवी व उपयोगिता वाहन') },
                      { label: t('Commercial Vehicles & Pickups', 'वाणिज्यिक वाहन व लोडर'), desc: t('Trucks, tippers, cargo delivery vans', 'ट्रक, पिकअप व मालवाहक वाहन') },
                      { label: t('Refinance & Balance Transfer', 'रीफाइनेंस व बैलेंस ट्रांसफर'), desc: t('Reduce existing vehicle loan EMIs', 'अपनी वर्तमान लोन EMI कम करें') },
                      { label: t('Business & Equipment Funding', 'बिजनेस व उपकरण लोन'), desc: t('Working capital for fleet & shops', 'व्यापार विस्तार हेतु पूँजी') }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{item.label}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    ))}
                  </div>

                  <div className="pt-4">
                    <a
                      href="#apply"
                      className="w-full py-4 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                    >
                      <span>{t('Apply Online Now', 'ऑनलाइन आवेदन करें')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Benefit Cards Grid Section ─────────────────────────────── */}
      <section id="solutions" className="py-12 sm:py-16 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-slate-800 relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[300px] bg-blue-500/5 dark:bg-blue-600/5 blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800/60 shadow-sm">
              <Building2 className="w-3.5 h-3.5" />
              {t('Our Financial Products', 'वित्तीय उत्पाद')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('Tailored Solutions for Your Every Need', 'हर ज़रूरत के लिए अनुकूलित लोन योजनाएँ')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              {t(
                'Explore competitive interest rates, flexible loan tenures, and transparent processing across all finance categories.',
                'प्रतिस्पर्धी ब्याज दरों, लचीली लोन अवधि और पारदर्शी प्रक्रिया का लाभ उठाएँ।'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              {
                icon: Car,
                title: t('New Vehicle Finance', 'न्यू व्हीकल लोन'),
                desc: t('Finance up to 90% on-road price of cars & passenger vehicles with quick approval.', 'कार व यात्री वाहनों पर 90% तक ऑन-रोड फाइनेंस।'),
                badge: t('Most Popular', 'सर्वाधिक लोकप्रिय')
              },
              {
                icon: Gauge,
                title: t('Commercial Vehicles', 'कमर्शियल व्हीकल लोन'),
                desc: t('Funding for loaders, tippers, cargo trucks, and passenger buses.', 'पिकअप लोडर, ट्रक व वाणिज्यिक वाहनों के लिए पूँजी।'),
                badge: t('High LTV', 'उच्च LTV')
              },
              {
                icon: TrendingUp,
                title: t('Refinance & Top-Up', 'रीफाइनेंस व टॉप-अप'),
                desc: t('Unlock extra cash on existing vehicles or transfer balance to cut EMIs.', 'मौजूदा वाहन पर अतिरिक्त कैश पाएँ या EMI कम करें।'),
                badge: t('Low Interest', 'कम ब्याज दर')
              },
              {
                icon: Briefcase,
                title: t('Personal Loans', 'पर्सनल लोन'),
                desc: t('Instant collateral-free personal credit up to ₹15 Lakhs with flexible repayment options.', 'बिना किसी गारंटी के त्वरित पर्सनल लोन रु 15 लाख तक।'),
                badge: t('Instant Approval', 'त्वरित स्वीकृति')
              },
              {
                icon: Home,
                title: t('Housing & Home Loans', 'होम एवं हाउसिंग लोन'),
                desc: t('Low-interest home purchasing, construction, and plot expansion loans with long tenures.', 'घर खरीदने, निर्माण व प्लॉट विस्तार हेतु आकर्षक ब्याज दर पर होम लोन।'),
                badge: t('Lowest Rate', 'न्यूनतम दर')
              },
              {
                icon: Landmark,
                title: t('Loan Against Property (LAP)', 'लोन अगेंस्ट प्रॉपर्टी (LAP)'),
                desc: t('Unlock high-value liquidity up to 70% property valuation against residential or commercial real estate.', 'अपनी आवासीय या वाणिज्यिक संपत्ति पर 70% तक उच्च फंड पाएँ।'),
                badge: t('High Funding', 'उच्च फंड')
              },
              {
                icon: Building2,
                title: t('Business & DSA Loans', 'बिजनेस व DSA सहायता'),
                desc: t('Working capital for DSA partners, dealers, and growing micro-enterprises.', 'व्यापार विस्तार व DSA पार्टनर्स के लिए फंड।'),
                badge: t('Fast Disbursal', 'त्वरित वितरण')
              }
            ].map((card, idx) => (
              <div
                key={idx}
                className="group relative bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(37,99,235,0.08)] dark:hover:shadow-[0_8px_30px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* Decorative background glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-slate-100 dark:border-slate-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all duration-300 shadow-sm">
                      <card.icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 uppercase tracking-widest border border-blue-100 dark:border-blue-800/60">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                    {card.desc}
                  </p>

                  <a
                    href="#apply"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 group/link"
                  >
                    <span>{t('Apply Now', 'आवेदन करें')}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Feature Highlights & Trust Stats Section ────────────── */}
      <section id="why-us" className="py-12 sm:py-16 bg-slate-900 relative overflow-hidden">
        {/* Abstract Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-blue-900/40"></div>
        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-cyan-900/20 to-transparent"></div>
        <div className="absolute -left-[10%] top-[20%] w-[30%] h-[50%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 text-cyan-300 border border-white/20 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                {t('Why Choose LeadFlow Pro', 'हमें क्यों चुनें')}
              </span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
                {t('Transparent, Digital-First ', 'पारदर्शी और ')}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{t('Finance Experience', 'डिजिटल लोन अनुभव')}</span>
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {t(
                  'We partner with leading banks, financers, and DSA agents to provide seamless loan originations, real-time lead tracking, and doorstep customer assistance.',
                  'प्रमुख बैंकों, फाइनेंसर्स और DSA एजेंट्स के साथ त्वरित स्वीकृति, पारदर्शी कमीशन ट्रैकिंग और त्वरित ग्राहक सहायता।'
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {[
                  { title: t('Paperless Uploads', 'डिजिटल दस्तावेज'), sub: t('Upload Aadhaar & PAN securely', 'सुरक्षित ऑनलाइन दस्तावेज सबमिशन') },
                  { title: t('Bank Partner Network', 'विस्तृत बैंक नेटवर्क'), sub: t('Compare top interest rates', 'सर्वोत्तम ब्याज दरों की तुलना') },
                  { title: t('Transparent Operations', 'पारदर्शी संचालन प्रणाली'), sub: t('90/10 Agent split model with complete tracking', '90/10 एजेंट मॉडल एवं लाइव ट्रैकिंग') },
                  { title: t('24/7 Application Tracker', 'लाइव लोन स्टेटस'), sub: t('Track status via Lead ID', 'लीड आईडी द्वारा रियल-टाइम स्थिति') }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3 backdrop-blur-md hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
              {[
                { val: '₹500Cr+', label: t('Loans Facilitated', 'वितरित लोन राशि') },
                { val: '15,000+', label: t('Happy Customers', 'संतुष्ट ग्राहक') },
                { val: '50+', label: t('Financer Partners', 'फाइनेंसर पार्टनर्स') },
                { val: '4.9 / 5', label: t('User Rating', 'यूजर रेटिंग') }
              ].map((stat, idx) => (
                <div key={idx} className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center space-y-1 backdrop-blur-xl hover:-translate-y-1 hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-xl">
                  <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300">{stat.val}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── Interactive EMI Calculator Section ──────────────────── */}
      <section id="calculator" className="py-12 sm:py-16 bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-4 py-2 rounded-full border border-blue-200 dark:border-blue-800/60 shadow-sm">
              <Calculator className="w-3.5 h-3.5" />
              {t('Smart Financial Calculator', 'स्मार्ट ईएमआई कैलकुलेटर')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('Calculate Your Estimated Monthly EMI', 'अपनी मासिक लोन किस्त (EMI) गणना करें')}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              {t('Adjust the loan amount, tenure, and interest rate sliders to plan your repayments with complete clarity.', 'लोन राशि, अवधि और ब्याज दर चुनकर अपनी मासिक किस्त का अनुमान लगाएं।')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white dark:bg-slate-900/40 rounded-[2rem] p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-2xl transition-shadow duration-500">
            
            {/* Controls */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Input 1: Loan Amount */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold gap-2">
                  <span className="text-slate-700 dark:text-slate-300">{t('Loan Amount (₹)', 'लोन राशि (₹)')}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      min={10000}
                      max={10000000}
                      step={10000}
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
                      className="w-32 px-2.5 py-1 text-xs font-black text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={5000000}
                  step={50000}
                  value={loanAmount > 5000000 ? 5000000 : loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>₹50,000</span>
                  <span>₹50,00,000+</span>
                </div>
              </div>

              {/* Input 2: Tenure */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold gap-2">
                  <span className="text-slate-700 dark:text-slate-300">{t('Tenure (Years)', 'लोन अवधि (वर्ष)')}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={30}
                      step={1}
                      value={tenureYears}
                      onChange={(e) => setTenureYears(Math.max(1, Math.min(30, Number(e.target.value))))}
                      className="w-20 px-2.5 py-1 text-xs font-black text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-semibold">{t('Yrs', 'वर्ष')}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={tenureYears > 10 ? 10 : tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>1 {t('Year', 'वर्ष')}</span>
                  <span>10 {t('Years', 'वर्ष')}</span>
                </div>
              </div>

              {/* Input 3: Interest Rate */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold gap-2">
                  <span className="text-slate-700 dark:text-slate-300">{t('Interest Rate (%)', 'ब्याज दर (%)')}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      step={0.1}
                      value={interestRate}
                      onChange={(e) => setInterestRate(Math.max(0.1, Math.min(50, Number(e.target.value))))}
                      className="w-20 px-2.5 py-1 text-xs font-black text-right text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={36}
                  step={0.25}
                  value={interestRate > 36 ? 36 : interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                  <span>5%</span>
                  <span>36%</span>
                </div>
              </div>

            </div>

            {/* Results Summary Box */}
            <div className="lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white rounded-[2rem] p-8 shadow-2xl border border-blue-500/30">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 blur-[50px] rounded-full pointer-events-none"></div>

              <div className="text-center pb-5 border-b border-white/10 relative z-10">
                <div className="text-xs text-cyan-300 uppercase font-bold tracking-widest mb-1.5">
                  {t('Estimated Monthly EMI', 'अनुमानित मासिक किस्त (EMI)')}
                </div>
                <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300">
                  {formatCurrency(emi)} <span className="text-sm text-slate-400 font-bold">/ {t('month', 'माह')}</span>
                </div>
              </div>

              <div className="space-y-4 text-sm mt-5 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">{t('Principal Loan Amount', 'मूल लोन राशि')}</span>
                  <span className="font-bold text-white">{formatCurrency(loanAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">{t('Total Interest Payable', 'कुल ब्याज राशि')}</span>
                  <span className="font-bold text-cyan-400">{formatCurrency(totalInterest)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/10 text-sm">
                  <span className="font-bold text-white">{t('Total Amount Payable', 'कुल देय राशि')}</span>
                  <span className="font-black text-white text-lg">{formatCurrency(totalPayment)}</span>
                </div>
              </div>

              <a
                href="#apply"
                className="w-full mt-6 py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all hover:-translate-y-1 relative z-10"
              >
                <span>{t('Apply With This EMI', 'इस किस्त के साथ आवेदन करें')}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>


          </div>

        </div>
      </section>

      {/* ── Eligibility Checklist Section ────────────────────────── */}
      <section id="eligibility" className="py-8 sm:py-10 bg-white dark:bg-[#0B0F19] border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-6 space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('Eligibility Criteria', 'पात्रता मानक')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {t('Simple Requirements for Approval', 'स्वीकृति के लिए सरल शर्तें')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
              {t('Get pre-approved in minutes with minimal paperwork.', 'न्यूनतम कागजी कार्रवाई के साथ मिनटों में प्री-अप्रूवल प्राप्त करें।')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                step: '01',
                title: t('Age & Nationality', 'आयु एवं नागरिकता'),
                desc: t('Indian citizens between 18 and 65 years of age with valid ID proof.', '18 से 65 वर्ष की आयु के भारतीय नागरिक जिनके पास मान्य पहचान पत्र हो।')
              },
              {
                step: '02',
                title: t('Income Proof or Asset', 'आय अथवा वाहन विवरण'),
                desc: t('Valid income source, bank statement, or vehicle registration papers.', 'आय प्रमाण, बैंक स्टेटमेंट या वाहन पंजीकरण दस्तावेज।')
              },
              {
                step: '03',
                title: t('Active Bank Account', 'सक्रिय बैंक खाता'),
                desc: t('Active savings/current bank account for direct electronic loan disbursal.', 'डायरेक्ट ऑनलाइन लोन हस्तांतरण के लिए चालू/बचत बैंक खाता।')
              }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{item.step}</div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Public Lead Application Form Section (Full-Width Simple Form) ────────── */}
      <section id="apply" className="py-16 sm:py-20 bg-slate-900 relative overflow-hidden">
        {/* Abstract Dark Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox=%220%200%20200%20200%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter%20id=%22noiseFilter%22%3E%3CfeTurbulence%20type=%22fractalNoise%22%20baseFrequency=%220.65%22%20numOctaves=%223%22%20stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-[0.15] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Section Header */}
          <div className="text-center mb-12 space-y-3 form-slide-up">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-cyan-300 bg-white/10 px-4 py-2 rounded-full border border-white/20 shadow-sm backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
              {t('Express Online Application', 'एक्सप्रेस ऑनलाइन आवेदन')}
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {t('Apply for Finance Instantly', 'ऑनलाइन लोन आवेदन प्रस्तुत करें')}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium max-w-lg mx-auto">
              {t('Fill in your details below to get instant pre-approval within 2 hours.', 'नीचे अपना विवरण भरें और 2 घंटे के भीतर प्री-अप्रूवल प्राप्त करें।')}
            </p>
          </div>

          {/* Main Full-Width Form Card */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-6 sm:p-10 lg:p-12 form-slide-up relative overflow-hidden" style={{ animationDelay: '0.1s' }}>
            {/* Subtle card internal glow */}
            <div className="absolute top-0 right-0 w-[30%] h-[50%] bg-blue-400/10 blur-[80px] rounded-full pointer-events-none"></div>

            {successLead ? (
              /* ── Success State ── */
              <div className="text-center space-y-6 py-6 form-slide-up">
                <div className="relative inline-flex">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30 form-pulse-ring">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
                    {t('Application Submitted!', 'आवेदन सफलतापूर्वक प्राप्त!')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('Our relationship team will contact you within 2 hours.', 'हमारी टीम 2 घंटे के भीतर आपसे संपर्क करेगी।')}
                  </p>
                </div>

                <div className="inline-block px-6 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-0.5">
                    {t('Your Reference ID', 'आपकी संदर्भ आईडी')}
                  </div>
                  <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest">
                    {successLead.lead_id}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setSuccessLead(null)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    {t('Submit Another Application', 'दूसरा आवेदन भरें')}
                  </button>
                  <button
                    onClick={() => setIsStatusModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-2.5 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all cursor-pointer"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <Search className="w-3.5 h-3.5" />
                      {t('Track Status', 'स्थिति देखें')}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* ── Full-Width 4-Field Form ── */
              <form onSubmit={handleApplySubmit} className="space-y-6">
                
                {error && (
                  <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* 4 Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

                  {/* 1. Full Name */}
                  <div className="space-y-2 relative z-10">
                    <label className="block text-xs font-black text-white uppercase tracking-widest">
                      {t('Full Name *', 'पूरा नाम *')}
                    </label>
                    <div className="relative group">
                      <User className="w-5 h-5 text-slate-300 group-focus-within:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type="text"
                        name="customer_name"
                        required
                        placeholder={t('e.g. Rahul Sharma', 'उदा. राहुल शर्मा')}
                        value={formData.customer_name}
                        onChange={handleFormChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/20 bg-white/5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none text-white placeholder:text-slate-400 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* 2. Contact Number */}
                  <div className="space-y-2 relative z-10">
                    <label className="block text-xs font-black text-white uppercase tracking-widest">
                      {t('Contact Number *', 'संपर्क नंबर (मोबाइल) *')}
                    </label>
                    <div className="relative group">
                      <Smartphone className="w-5 h-5 text-slate-300 group-focus-within:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type="tel"
                        name="customer_mobile"
                        required
                        maxLength={10}
                        placeholder={t('10-digit mobile number', '10 अंकों का मोबाइल नंबर')}
                        value={formData.customer_mobile}
                        onChange={handleFormChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/20 bg-white/5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none text-white placeholder:text-slate-400 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* 3. City / Location */}
                  <div className="space-y-2 relative z-10">
                    <label className="block text-xs font-black text-white uppercase tracking-widest">
                      {t('City / Location', 'शहर / स्थान')}
                    </label>
                    <div className="relative group">
                      <MapPin className="w-5 h-5 text-slate-300 group-focus-within:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type="text"
                        name="vehicle_make_model"
                        placeholder={t('e.g. Jaipur or Vehicle Name', 'उदा. जयपुर या वाहन नाम')}
                        value={formData.vehicle_make_model}
                        onChange={handleFormChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/20 bg-white/5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none text-white placeholder:text-slate-400 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* 4. Required Finance Amount */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-white uppercase tracking-widest">
                        {t('Required Amount *', 'अपेक्षित लोन राशि *')}
                      </label>
                      <span className="text-xs font-black text-cyan-300 font-mono">
                        {formatCurrency(Number(formData.loan_amount || 0))}
                      </span>
                    </div>
                    <div className="relative group">
                      <SlidersHorizontal className="w-5 h-5 text-slate-300 group-focus-within:text-cyan-400 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
                      <input
                        type="number"
                        name="loan_amount"
                        required
                        min={10000}
                        step={10000}
                        placeholder={t('Enter amount in ₹', 'अपेक्षित राशि ₹ में दर्ज करें')}
                        value={formData.loan_amount}
                        onChange={handleFormChange}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/20 bg-white/5 text-sm font-bold font-mono focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 outline-none text-white placeholder:text-slate-400 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                </div>

                {/* Quick Amount Selector Pills Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-white/10 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-300 mr-1">
                      {t('Quick Amount:', 'त्वरित राशि:')}
                    </span>
                    {[300000, 500000, 1000000, 1500000, 2500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, loan_amount: preset.toString() }))}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                          Number(formData.loan_amount) === preset
                            ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-white/5 border-white/20 text-slate-300 hover:border-white/40 hover:bg-white/10'
                        }`}
                      >
                        ₹{(preset / 100000).toFixed(preset % 100000 === 0 ? 0 : 1)} Lakh
                      </button>
                    ))}
                  </div>

                  {/* Trust Highlights */}
                  <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold shrink-0">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> {t('100% Secure', '100% सुरक्षित')}</span>
                    <span className="text-slate-500">•</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-400" /> {t('2hr Response', '2 घंटे में कॉल')}</span>
                  </div>
                </div>

                {/* Submit Action Row */}
                <div className="pt-6 relative z-10">
                  <button
                    type="submit"
                    disabled={submitting || !isFormValid}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>{t('Submitting Application...', 'आवेदन जमा हो रहा है...')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>{t('Submit Finance Request', 'लोन आवेदन जमा करें')}</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      </section>

      {/* ── Loan Status Search Modal ───────────────────────────── */}
      <Modal isOpen={isStatusModalOpen} onClose={() => { setIsStatusModalOpen(false); setSearchedLead(null); setStatusError(''); }} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              onClick={() => {
                setIsStatusModalOpen(false);
                setSearchedLead(null);
                setStatusError('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t('Track Application Status', 'आवेदन की स्थिति जाँचें')}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('Enter your Lead ID or registered 10-digit mobile number', 'अपनी लीड आईडी या 10-अंकों का मोबाइल नंबर दर्ज करें')}
              </p>
            </div>

            <form onSubmit={handleStatusSearch} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={t('e.g. LD-2026-0001 or Mobile', 'उदा. LD-2026-0001 या मोबाइल')}
                  value={statusQuery}
                  onChange={(e) => setStatusQuery(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                />
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                >
                  {statusLoading ? '...' : t('Search', 'खोजें')}
                </button>
              </div>
            </form>

            {statusError && (
              <div className="p-3 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-xl text-xs font-medium">
                {statusError}
              </div>
            )}

            {searchedLead && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500">{searchedLead.lead_id}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(searchedLead.status)}`}>
                    {searchedLead.status?.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">{searchedLead.customer_name}</div>
                  <div className="text-slate-500">{t('Loan Amount:', 'लोन राशि:')} {formatCurrency(Number(searchedLead.loan_amount || 0))}</div>
                  <div className="text-slate-500">{t('Date:', 'तारीख:')} {searchedLead.lead_date}</div>
                </div>
              </div>
            )}

      </Modal>

      {/* ── Modern App Dynamic Footer ────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-300 pt-14 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Col 1: Brand & Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 flex items-center justify-center rounded-none overflow-hidden relative border border-slate-800 bg-white/5">
                  <img 
                    src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/AppLogo.png?v=${settings.logo_updated_at || '1'}`} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => { 
                      e.currentTarget.style.display = 'none'; 
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                  <div className="hidden w-full h-full bg-indigo-600 items-center justify-center">
                    <Car className="w-5 h-5 text-white" />
                  </div>
                </div>
                <span className="font-black text-lg text-white">
                  {settings.app_name}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t(
                  'Empowering auto dealerships, DSA channel partners, and customers with transparent loan processing and lead management.',
                  'वाहन डीलरों, DSA पार्टनर्स और ग्राहकों के लिए पारदर्शी लोन प्रोसेसिंग एवं कमीशन प्रबंधन प्रणाली।'
                )}
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('Quick Links', 'त्वरित लिंक')}</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#solutions" className="hover:text-indigo-400 transition-colors">{t('Finance Products', 'फाइनेंस समाधान')}</a></li>
                <li><a href="#calculator" className="hover:text-indigo-400 transition-colors">{t('EMI Calculator', 'ईएमआई कैलकुलेटर')}</a></li>
                <li><a href="#why-us" className="hover:text-indigo-400 transition-colors">{t('Why Us', 'हमारे लाभ')}</a></li>
                <li><button onClick={() => setIsStatusModalOpen(true)} className="hover:text-indigo-400 transition-colors">{t('Track Status', 'स्टेटस चेक करें')}</button></li>
              </ul>
            </div>

            {/* Col 3: Loan Offerings */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('Loan Offerings', 'लोन श्रेणियां')}</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#apply" className="hover:text-indigo-400 transition-colors">{t('New Vehicle Loans', 'नई कार व वाहन लोन')}</a></li>
                <li><a href="#apply" className="hover:text-indigo-400 transition-colors">{t('Commercial Vehicle Loan', 'वाणिज्यिक वाहन लोन')}</a></li>
                <li><a href="#apply" className="hover:text-indigo-400 transition-colors">{t('Used Car & Refinance', 'पुराना वाहन व रीफाइनेंस')}</a></li>
                <li><a href="#apply" className="hover:text-indigo-400 transition-colors">{t('Balance Transfer', 'बैलेंस ट्रांसफर')}</a></li>
              </ul>
            </div>

            {/* Col 4: Contact Info (Dynamic Settings) */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('Contact Information', 'संपर्क सूत्र')}</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{settings.office_address}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <a href={`mailto:${settings.support_email}`} className="hover:text-white">{settings.support_email}</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <a href={`tel:${settings.contact_number}`} className="hover:text-white">{settings.contact_number}</a>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              © {new Date().getFullYear()} {settings.company_name || settings.app_name}. {t('All Rights Reserved.', 'सर्वाधिकार सुरक्षित।')}
            </div>
            <div className="flex gap-4">
              <Link to="/login" className="hover:text-indigo-400 font-bold">{t('Partner & Staff Login', 'पार्टनर एवं स्टाफ लॉगिन')}</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
