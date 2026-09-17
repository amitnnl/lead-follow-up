import { useEffect, useState } from 'react';
import {
  AlertCircle, Phone, MessageCircle, RefreshCw, Plus,
  TrendingUp, Clock, CheckCircle, XCircle, Layers, ArrowRight,
  Sparkles, Building, UserCheck, Trophy, ArrowUpRight
} from 'lucide-react';
import api from '../lib/axios';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import NewLeadModal from '../components/NewLeadModal';
import clsx from 'clsx';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';

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

const STATUS_LABEL: Record<string, string> = {
  new: 'New', pending: 'Pending', approved: 'Approved',
  disbursed: 'Disbursed', on_hold: 'On Hold', rejected: 'Rejected',
};

const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatCompact = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const KPI_COLOR_SCHEMES = {
  indigo: {
    topBar: 'bg-indigo-500',
    iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50',
    badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40',
    hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/50',
  },
  amber: {
    topBar: 'bg-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/50',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
    hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500/50',
  },
  blue: {
    topBar: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50',
    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40',
    hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500/50',
  },
  emerald: {
    topBar: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
    hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/50',
  },
  rose: {
    topBar: 'bg-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/50',
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40',
    hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500/50',
  },
  purple: {
    topBar: 'bg-purple-500',
    iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50',
    badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
    hoverBorder: 'hover:border-purple-300 dark:hover:border-purple-500/50',
  },
};

function KPICard({ 
  label, 
  value, 
  subtitle, 
  badge, 
  icon: Icon, 
  colorScheme, 
  link 
}: { 
  label: string; 
  value: string | number; 
  subtitle: string; 
  badge?: string; 
  icon: React.ElementType; 
  colorScheme: keyof typeof KPI_COLOR_SCHEMES; 
  link: string; 
}) {
  const scheme = KPI_COLOR_SCHEMES[colorScheme] || KPI_COLOR_SCHEMES.indigo;

  return (
    <Link
      to={link}
      className="group block relative focus:outline-none focus:ring-2 focus:ring-primary-500/40 rounded-xl"
    >
      <div
        className={clsx(
          'relative flex flex-col justify-between p-3 sm:p-3.5 rounded-xl transition-all duration-200 min-h-[108px]',
          'bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 shadow-xs',
          'hover:shadow-md hover:-translate-y-0.5',
          scheme.hoverBorder
        )}
      >
        {/* Accent top stripe */}
        <div className={clsx('absolute top-0 left-0 right-0 h-[3px] rounded-t-xl', scheme.topBar)} />

        {/* Header: Label & Icon */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {label}
          </span>
          <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110', scheme.iconBg)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Metric */}
        <div className="my-1">
          <span className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums block leading-tight">
            {value}
          </span>
        </div>

        {/* Footer: Subtitle & Context Badge */}
        <div className="flex items-center justify-between gap-1 text-[11px] pt-1.5 border-t border-slate-100/80 dark:border-slate-800/80">
          <span className="text-slate-400 dark:text-slate-500 font-medium truncate text-[11px]">
            {subtitle}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {badge && (
              <span className={clsx('px-1.5 py-0.2 rounded text-[10px] font-semibold border', scheme.badge)}>
                {badge}
              </span>
            )}
            <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
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
          <div className="absolute inset-0 rounded-full border-[3px] border-primary-100 dark:border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-primary-600 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) return null;

  const kpiCards = [
    { 
      label: 'Total Leads', 
      value: stats.kpis.total, 
      subtitle: 'Pipeline Total', 
      badge: 'All', 
      icon: Layers, 
      colorScheme: 'indigo' as const, 
      link: '/leads?assigned=all' 
    },
    { 
      label: 'Pending', 
      value: stats.kpis.pending, 
      subtitle: 'In Review', 
      badge: 'Active', 
      icon: Clock, 
      colorScheme: 'amber' as const, 
      link: '/leads?status=pending' 
    },
    { 
      label: 'Approved', 
      value: stats.kpis.approved, 
      subtitle: 'Sanctioned', 
      badge: 'Ready', 
      icon: CheckCircle, 
      colorScheme: 'blue' as const, 
      link: '/leads?status=approved' 
    },
    { 
      label: 'Disbursed', 
      value: stats.kpis.disbursed, 
      subtitle: 'Completed', 
      badge: 'Done', 
      icon: TrendingUp, 
      colorScheme: 'emerald' as const, 
      link: '/leads?status=disbursed' 
    },
    { 
      label: 'Rejected', 
      value: stats.kpis.rejected, 
      subtitle: 'Declined', 
      badge: 'Closed', 
      icon: XCircle, 
      colorScheme: 'rose' as const, 
      link: '/leads?status=rejected' 
    },
    { 
      label: 'Conversion', 
      value: `${stats.kpis.conversionRate}%`, 
      subtitle: `${stats.kpis.disbursed} of ${stats.kpis.total} disbursed`, 
      badge: stats.kpis.total > 0 ? `${stats.kpis.conversionRate}%` : '0%', 
      icon: Sparkles, 
      colorScheme: 'purple' as const, 
      link: '/reports' 
    },
  ];

  return (
    <div className="space-y-3.5 pb-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white tracking-tight">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {isAdminOrManager ? 'Overall business health and performance metrics.' : 'Your active pipeline & due tasks.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="secondary"
            onClick={fetchStats}
            disabled={refreshing}
            title="Refresh statistics"
            className="p-2 h-9 w-9"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', refreshing && 'animate-spin text-primary-500')} />
          </Button>

          {!isExecutive && (
            <Button onClick={() => setIsNewLeadModalOpen(true)} className="h-9 text-xs">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> New Lead
            </Button>
          )}
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {kpiCards.map((card, i) => (
          <KPICard key={i} {...card} />
        ))}
      </div>

      {/* ── Action Banners ── */}
      <div className="space-y-2">
        {stats.kpis.eligibleRetentions > 0 && isAdminOrManager && (
          <Card className="p-2.5 sm:p-3 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 to-transparent flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
                {stats.kpis.eligibleRetentions} payout{stats.kpis.eligibleRetentions !== 1 ? 's' : ''} eligible for release
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Verified RC / Insurance files are ready for commission payout processing.
              </p>
            </div>
            <Link to="/commissions" className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer shadow-xs">
              Process <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        )}

        {stats.dsaTiering && (
          <Card className="p-2.5 sm:p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
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
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Congratulations! You have achieved the highest Platinum Partner Tier!</span>
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
          </Card>
        )}
      </div>


      {/* ── Main Dashboard Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5" style={{ animationDelay: '150ms' }}>
        
        {/* Recent Leads Table */}
        <Card className="lg:col-span-2 flex flex-col p-0">
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Recent Leads</h2>
            </div>
            <Link to="/leads" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-2 py-1.5">Lead ID</th>
                  <th className="px-2 py-1.5">Customer</th>
                  <th className="px-2 py-1.5 hidden sm:table-cell">Vehicle</th>
                  <th className="px-2 py-1.5">Amount</th>
                  <th className="px-2 py-1.5">Assigned To</th>
                  <th className="px-2 py-1.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {stats.recentLeads.map((lead, i) => (
                  <tr key={lead.id} className={clsx(
                    'group transition-colors',
                    i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : '',
                    'hover:bg-primary-50/30 dark:hover:bg-primary-500/5'
                  )}>
                    <td className="px-2 py-1.5">
                      <Link to={`/leads/${lead.id}`} className="text-primary-600 dark:text-primary-400 hover:underline font-mono text-xs font-bold">
                        {lead.lead_id}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 text-[12px]">{lead.customer_name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <span className="font-mono">{lead.customer_mobile}</span>
                        {lead.customer_mobile && (
                          <a 
                            href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${lead.customer_name}, regarding your loan file...`)}`}
                            target="_blank" 
                            rel="noreferrer"
                            className="text-emerald-500 hover:text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell truncate max-w-[120px] text-[11px]">
                      <div className="flex items-center gap-1">
                        <Building className="w-2.5 h-2.5 text-slate-300 dark:text-slate-600 shrink-0" />
                        {lead.vehicle_make_model || '—'}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {lead.loan_amount ? formatCurrency(Number(lead.loan_amount)) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-xs">
                      {lead.executive_name ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.2 rounded text-[11px] font-medium">
                          {lead.executive_name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-amber-500 italic text-[10px]">Unassigned</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <Badge status={lead.status}>{STATUS_LABEL[lead.status] || lead.status}</Badge>
                    </td>
                  </tr>
                ))}
                {stats.recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400 text-xs italic">No leads available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-2.5">
          
          {/* Due Follow-ups */}
          <Card className="flex flex-col p-0">
            <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/10">
              <div className="flex items-center gap-1.5">
                {stats.dueFollowups.length > 0 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
                <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Due Follow-ups</h3>
                {stats.dueFollowups.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded">{stats.dueFollowups.length}</span>
                )}
              </div>
              <Link to="/followups" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">All →</Link>
            </div>

            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 max-h-[340px] overflow-y-auto">
              {stats.dueFollowups.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs italic">No overdue follow-ups</div>
              ) : (
                stats.dueFollowups.map((f, i) => (
                  <div key={i} className="px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Link to={`/leads/${f.lead_real_id}`} className="text-xs font-bold text-slate-800 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 truncate block">
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
                            className="p-1.5 rounded-lg text-primary-600 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
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
          </Card>

          {isAdminOrManager && (
            <>
              {/* Top Executives */}
              <Card className="p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary-500" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Top Executives</h3>
                </div>
                <div className="space-y-1.5">
                  {stats.topExecutives.map((ex, i) => {
                    const pct = ex.total > 0 ? Math.round((ex.disbursed / ex.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-2 text-[11px]">{ex.name}</span>
                          <span className="font-mono text-slate-400 shrink-0 text-[11px]">{ex.disbursed}/{ex.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Top Financers */}
              <Card className="p-2.5 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-emerald-500" />
                  <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Top Financers</h3>
                </div>
                <div className="space-y-1.5">
                  {stats.topFinancers.map((fn, i) => {
                    const pct = fn.total > 0 ? Math.round((fn.disbursed / fn.total) * 100) : 0;
                    return (
                      <div key={i} className="space-y-0.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700 dark:text-slate-300 truncate pr-2 text-[11px]">{fn.name}</span>
                          <span className="font-mono text-slate-400 shrink-0 text-[11px]">{fn.disbursed}/{fn.total} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Top DSA Partners Leaderboard */}
              {stats.topAgents && stats.topAgents.length > 0 && (
                <Card className="p-2.5 sm:p-3 flex flex-col gap-2 border-t-2 border-t-amber-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <h3 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">DSA Leaderboard</h3>
                    </div>
                    <span className="text-[9px] bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 font-extrabold px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-500/20">
                      Monthly Top
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stats.topAgents.map((ag, i) => {
                      const maxVol = stats.topAgents![0]?.disbursed_volume || 1;
                      const pct = Math.round((ag.disbursed_volume / maxVol) * 100);
                      const isTop = i === 0;
                      return (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2 flex items-center gap-1">
                              <span>{ag.name}</span>
                            </span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                              {formatCompact(ag.disbursed_volume)} <span className="text-[10px] text-slate-400 font-normal">({ag.disbursed}/{ag.total})</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${isTop ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                              style={{ width: `${Math.max(8, pct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
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