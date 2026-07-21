import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Phone,
  MessageCircle,
  RefreshCw,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  Sparkles,
  Building,
  UserCheck,
  Trophy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../lib/axios';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NewLeadModal from '../components/NewLeadModal';
import clsx from 'clsx';

interface DashboardStats {
  kpis: {
    total: number;
    pending: number;
    approved: number;
    disbursed: number;
    rejected: number;
    conversionRate: number;
    eligibleRetentions: number;
    totalCommPaid: number;
  };
  topExecutives: Array<{ name: string; total: number; disbursed: number }>;
  topFinancers: Array<{ name: string; total: number; disbursed: number }>;
  topAgents?: Array<{ name: string; total: number; disbursed: number; disbursed_volume: number }>;
  dsaTiering?: {
    tier: string;
    currentVolume: number;
    nextTierVolume: number;
    multiplier: number;
  };
  recentLeads: Array<{
    id: number;
    lead_id: string;
    customer_name: string;
    customer_mobile: string;
    vehicle_make_model: string;
    loan_amount: number;
    status: string;
    executive_name: string | null;
  }>;
  dueFollowups: Array<{
    lead_real_id: number;
    lead_id: string;
    customer_name: string;
    customer_mobile: string;
    next_followup_date: string;
    remarks: string;
    status: string;
  }>;
  chartData?: {
    monthlyDisbursements: Array<{ month: string; amount: number; count: number }>;
    statusBreakdown: Array<{ status: string; count: number; color: string }>;
    pipelineByFinancer: Array<{ financer: string; leads: number; disbursed: number }>;
  };
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500', pending: 'bg-amber-500', approved: 'bg-emerald-500',
  disbursed: 'bg-teal-500', on_hold: 'bg-purple-500', rejected: 'bg-rose-500',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'New', pending: 'Pending', approved: 'Approved',
  disbursed: 'Disbursed', on_hold: 'On Hold', rejected: 'Rejected',
};

function StatusPill({ status }: { status: string }) {
  const dot = STATUS_DOT[status] || 'bg-slate-400';
  const label = STATUS_LABEL[status] || status.replace('_', ' ');
  const sbClass = `sb-${status}`;
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border', sbClass || 'sb-default')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

function SparklineChart({ data, color = '#4f46e5', height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data?.length || data.length <= 1) return <div className="w-full h-[40px]" />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((v - min) / (max - min || 1)) * 80
  })).map(p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(', ');
  
  return (
    <svg className="w-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill="url(#sparklineGradient)"
        stroke="none"
        points={`${points}, 100 100, 0 100`}
      />
    </svg>
  );
}

function KPICard({ 
  label, value, icon: Icon, color, trend, trendLabel, link,
  sparklineData
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string; 
  trend?: number; 
  trendLabel?: string; 
  link?: string; 
  sparklineData?: number[];
}) {
  const content = (
    <div className="glass-panel border-l-4 p-4.5 rounded-2xl hover-lift flex flex-col justify-between h-[134px] relative overflow-hidden group"
      style={{ borderLeftColor: color }}>
      <div className="relative flex items-start justify-between gap-1">
        <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate pr-2">
          {label}
        </span>
        <div className="p-1.5 rounded-lg bg-slate-100/50 dark:bg-slate-800/50 group-hover:scale-110 transition-transform">
          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
        </div>
      </div>
      <div className="relative flex flex-col justify-between flex-1 mt-1">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight tabular-nums">
          {value}
        </div>
        {sparklineData && (
          <div className="mt-1.5 h-8 w-full opacity-80 group-hover:opacity-100 transition-opacity">
            <SparklineChart data={sparklineData} color={color} height={30} />
          </div>
        )}
        {(trend !== undefined || trendLabel) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {trend !== undefined && (
              <span className={clsx('flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md', trend >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20')}>
                {trend >= 0 ? <ChevronUp className="w-2.5 h-2.5 stroke-[3]" /> : <ChevronDown className="w-2.5 h-2.5 stroke-[3]" />}
                {Math.abs(trend)}%
              </span>
            )}
            {trendLabel && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );

  return link ? (
    <Link to={link} className="block transition-transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-xl">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);

  const isExecutive = user?.role === 'executive';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) return null;

  // Derived data (computed inline, no useMemo needed for these simple calculations)
  const disbursementTrend = stats.chartData?.monthlyDisbursements?.map(d => d.amount) || [];
  const leadTrend = stats.chartData?.monthlyDisbursements?.map(d => d.count) || [];

  const kpiCards = [
    { 
      label: 'Total Leads', 
      value: stats.kpis.total, 
      icon: Layers, 
      color: '#4f46e5', 
      trend: 12, 
      trendLabel: 'vs last month',
      link: '/leads?assigned=all',
      sparklineData: leadTrend.slice(-6)
    },
    { 
      label: 'Pending', 
      value: stats.kpis.pending, 
      icon: Clock, 
      color: '#f59e0b', 
      trend: -5, 
      trendLabel: 'vs last month',
      link: '/leads?status=pending',
      sparklineData: [3, 5, 2, 6, 4, stats.kpis.pending]
    },
    { 
      label: 'Approved', 
      value: stats.kpis.approved, 
      icon: CheckCircle, 
      color: '#3b82f6', 
      trend: 8, 
      trendLabel: 'vs last month',
      link: '/leads?status=approved',
      sparklineData: [2, 4, 3, 5, 4, stats.kpis.approved]
    },
    { 
      label: 'Disbursed', 
      value: stats.kpis.disbursed, 
      icon: TrendingUp, 
      color: '#10b981', 
      trend: 15, 
      trendLabel: 'vs last month',
      link: '/leads?status=disbursed',
      sparklineData: disbursementTrend.slice(-6)
    },
    { 
      label: 'Rejected', 
      value: stats.kpis.rejected, 
      icon: XCircle, 
      color: '#f43f5e', 
      trend: -3, 
      trendLabel: 'vs last month',
      link: '/leads?status=rejected',
      sparklineData: [1, 2, 1, 0, 1, stats.kpis.rejected]
    },
    { 
      label: 'Conversion', 
      value: `${stats.kpis.conversionRate}%`, 
      icon: Sparkles, 
      color: '#8b5cf6', 
      trend: 2.5, 
      trendLabel: 'improvement',
      link: '#',
      sparklineData: [12, 15, 18, 22, 20, stats.kpis.conversionRate]
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {isAdminOrManager ? 'Overall business health and performance metrics.' : 'Your active pipeline & due tasks.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={fetchStats}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-all hover:border-indigo-300 dark:hover:border-indigo-700"
            title="Refresh statistics"
          >
            <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin text-indigo-500')} />
          </button>

          {!isExecutive && (
            <button 
              onClick={() => setIsNewLeadModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer hover:shadow-md hover:shadow-indigo-500/30"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Lead
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <KPICard key={i} {...card} />
        ))}
      </div>

      {/* ── Action Banners ── */}
      <div className="space-y-4">
        {stats.kpis.eligibleRetentions > 0 && isAdminOrManager && (
          <div className="card p-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up">
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                {stats.kpis.eligibleRetentions} payout{stats.kpis.eligibleRetentions !== 1 ? 's' : ''} eligible for release
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Verified RC / Insurance files are ready for commission payout processing.
              </p>
            </div>
            <Link to="/commissions" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-sm">
              Process <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {stats.dsaTiering && (
          <div className="card p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-slide-up">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
                    {stats.dsaTiering.tier} Partner
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
                    Disbursed Volume: {formatCompact(stats.dsaTiering.currentVolume)}
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {stats.dsaTiering.nextTierVolume > 0 ? (
                    <>
                      Only <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCompact(stats.dsaTiering.nextTierVolume - stats.dsaTiering.currentVolume)}</strong> more to unlock the next Tier & 
                      <strong className="text-amber-600 dark:text-amber-400 font-bold">{((stats.dsaTiering.multiplier * 100 - 100).toFixed(0))}% Bonus Payouts</strong>!
                    </>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">🎉 Congratulations! You have achieved the highest Platinum Partner Tier!</span>
                  )}
                </p>
              </div>
            </div>
            {stats.dsaTiering.nextTierVolume > 0 && (
              <div className="w-full md:w-56 flex flex-col gap-1.5 shrink-0">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Tier Progress</span>
                  <span className="font-mono">{Math.min(100, Math.round((stats.dsaTiering.currentVolume / stats.dsaTiering.nextTierVolume) * 100))}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.min(100, Math.round((stats.dsaTiering.currentVolume / stats.dsaTiering.nextTierVolume) * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* ── Main Dashboard Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in" style={{ animationDelay: '150ms' }}>
        
        {/* Recent Leads Table */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Recent Leads</h2>
            </div>
            <Link to="/leads" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3">Lead ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Vehicle</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {stats.recentLeads.map((lead, i) => (
                  <tr key={lead.id} className={clsx(
                    'group transition-colors',
                    i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : '',
                    'hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5'
                  )}>
                    <td className="px-4 py-3">
                      <Link to={`/leads/${lead.id}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono text-xs font-bold">
                        {lead.lead_id}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-[13px]">{lead.customer_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono">{lead.customer_mobile}</span>
                        {lead.customer_mobile && (
                          <a 
                            href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${lead.customer_name}, regarding your loan file...`)}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-500 hover:text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 hidden sm:table-cell truncate max-w-[140px] text-xs">
                      <div className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                        {lead.vehicle_make_model || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {lead.loan_amount ? formatCurrency(Number(lead.loan_amount)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {lead.executive_name ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md font-medium">
                          {lead.executive_name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-amber-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={lead.status} />
                    </td>
                  </tr>
                ))}
                {stats.recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs italic">No leads available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-5">
          
          {/* Due Follow-ups */}
          <div className="card overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10">
              <div className="flex items-center gap-2">
                {stats.dueFollowups.length > 0 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
                <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Due Follow-ups</h3>
                {stats.dueFollowups.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded">{stats.dueFollowups.length}</span>
                )}
              </div>
              <Link to="/followups" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">All →</Link>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 max-h-[380px] overflow-y-auto">
              {stats.dueFollowups.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">No overdue follow-ups 🎉</div>
              ) : (
                stats.dueFollowups.map((f, i) => (
                  <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Link to={`/leads/${f.lead_real_id}`} className="text-xs font-bold text-slate-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 truncate block">
                          {f.customer_name}
                        </Link>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{f.lead_id}</div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1 italic">"{f.remarks}"</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-200 dark:border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md block">
                          {f.next_followup_date}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 mt-2">
                          <a 
                            href={`https://wa.me/91${f.customer_mobile.replace(/\D/g,'')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                          <a 
                            href={`tel:${f.customer_mobile}`}
                            className="p-1.5 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {isAdminOrManager && (
            <>

              {/* Top Executives */}
              <div className="card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Top Executives</h3>
                </div>
                <div className="space-y-4">
                  {stats.topExecutives.map((ex, i) => {
                    const pct = ex.total > 0 ? Math.round((ex.disbursed / ex.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{ex.name}</span>
                          <span className="font-mono text-slate-400 shrink-0">{ex.disbursed}/{ex.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Financers */}
              <div className="card p-5 flex flex-col gap-4">
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Top Financers</h3>
                </div>
                <div className="space-y-4">
                  {stats.topFinancers.map((fn, i) => {
                    const pct = fn.total > 0 ? Math.round((fn.disbursed / fn.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{fn.name}</span>
                          <span className="font-mono text-slate-400 shrink-0">{fn.disbursed}/{fn.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top DSA Partners Leaderboard */}
              {stats.topAgents && stats.topAgents.length > 0 && (
                <div className="card p-5 flex flex-col gap-4 border-t-2 border-t-amber-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">DSA Leaderboard</h3>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">
                      🏆 Monthly Top
                    </span>
                  </div>
                  <div className="space-y-4">
                    {stats.topAgents.map((ag, i) => {
                      const maxVol = stats.topAgents![0]?.disbursed_volume || 1;
                      const pct = Math.round((ag.disbursed_volume / maxVol) * 100);
                      const isTop = i === 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2 flex items-center gap-1">
                              {isTop && <span title="#1 Performer" className="text-amber-500">👑</span>}
                              <span>{ag.name}</span>
                            </span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              {formatCompact(ag.disbursed_volume)} <span className="text-[10px] text-slate-400 font-normal">({ag.disbursed}/{ag.total})</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                              style={{ width: `${Math.max(8, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

        </div>

      </div>

      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)} 
        onSuccess={() => {
          setIsNewLeadModalOpen(false);
          fetchStats();
        }} 
      />

    </div>
  );
}