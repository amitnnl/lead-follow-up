import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, Download, BarChart3, XCircle, SlidersHorizontal, Building,
  Filter, Users, DollarSign, CreditCard, TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/axios';
import clsx from 'clsx';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';

interface ReportRecord {
  id: number;
  lead_id: string;
  customer_name: string;
  customer_mobile: string;
  vehicle_make_model: string;
  loan_amount: number;
  status: string;
  lead_date: string;
  agent_name: string | null;
  financer_name: string | null;
  executive_name: string | null;
  commission_amount: number | null;
  paid_amount: number | null;
  payout_90_status: string | null;
  payout_10_status: string | null;
  rc_status?: string;
  insurance_status?: string;
  rto_status?: string;
}

interface ReportSummary {
  totalLoanAmount: number;
  totalCommission: number;
  totalPaid: number;
  totalLeads: number;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    released: { label: 'Released', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    eligible: { label: 'Eligible', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    received: { label: 'Received', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    done: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    missing: { label: 'Missing', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
  };
  const cfg = configs[status] || { label: status, className: 'bg-slate-50 text-slate-500 border-slate-200' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function FormatCurrency({ value, color = 'slate' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'text-slate-850 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    indigo: 'text-indigo-600 dark:text-indigo-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={clsx('font-mono font-bold text-xs', colors[color])}>
      ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </span>
  );
}

function KPICard({ label, value, icon: Icon, color, trend, bgColor }: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ElementType; 
  color: string; 
  trend?: number; 
  bgColor?: string;
}) {
  return (
    <div className={clsx('card p-4 flex items-center gap-3 relative overflow-hidden group', bgColor)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-base sm:text-lg font-black text-slate-850 dark:text-white mt-0.5">{value}</p>
        {trend !== undefined && (
          <div className={clsx('flex items-center gap-1.5 mt-1.5', trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            <TrendingUp className={clsx('w-3 h-3', trend < 0 && 'rotate-180')} />
            <span className="text-[10px] font-bold">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SelectInput({ value, onChange, children, className = '' }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select value={value} onChange={onChange} className={clsx(
      'w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-800 dark:text-white transition-all',
      className
    )}>
      {children}
    </select>
  );
}

function DateInput({ value, onChange, className = '' }: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  className?: string;
}) {
  return (
    <input type="date" value={value} onChange={onChange} className={clsx(
      'w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-800 dark:text-white transition-all',
      className
    )} />
  );
}

export default function Reports() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const [reportType, setReportType] = useState('disbursement');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [agentId, setAgentId] = useState('');
  const [financerId, setFinancerId] = useState('');
  const [executiveId, setExecutiveId] = useState('');

  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [financers, setFinancers] = useState<{ id: number; name: string }[]>([]);
  const [executives, setExecutives] = useState<{ id: number; name: string }[]>([]);

  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [agRes, finRes, exRes] = await Promise.all([
          api.get('/setup/agents').catch(() => ({ data: { agents: [] } })),
          api.get('/setup/financers').catch(() => ({ data: { financers: [] } })),
          api.get('/setup/executives').catch(() => ({ data: { executives: [] } }))
        ]);
        setAgents(agRes.data?.agents || []);
        setFinancers(finRes.data?.financers || []);
        setExecutives(exRes.data?.executives || []);
      } catch (err) {
        console.error('Failed to load filters lookup', err);
      }
    };
    fetchLookups();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setHasGenerated(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.append('agent_id', agentId);
      if (financerId) params.append('financer_id', financerId);
      if (executiveId) params.append('executive_id', executiveId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (reportType === 'disbursement' || reportType === 'payouts') {
        params.append('status', 'disbursed');
      }

      const res = await api.get(`/reports?${params.toString()}`);
      setRecords(res.data.records || []);
      setSummary(res.data.summary || null);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return;
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'disbursement') {
      headers = ["Lead ID", "Date", "Customer Name", "Vehicle", "Financer Bank", "Agent (DSA)", "Loan Amount"];
      rows = records.map(r => [
        r.lead_id, r.lead_date,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${(r.vehicle_make_model || '').replace(/"/g, '""')}"`,
        `"${(r.financer_name || '—').replace(/"/g, '""')}"`,
        `"${(r.agent_name || 'Direct').replace(/"/g, '""')}"`,
        r.loan_amount || 0
      ]);
    } else if (reportType === 'payouts') {
      headers = ["Lead ID", "Customer Name", "Agent (DSA)", "Commission Amount", "Paid Amount", "90% Payout Status", "10% Payout Status"];
      rows = records.map(r => [
        r.lead_id,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${(r.agent_name || 'Direct').replace(/"/g, '""')}"`,
        r.commission_amount || 0,
        r.paid_amount || 0,
        r.payout_90_status || 'pending',
        r.payout_10_status || 'pending'
      ]);
    } else if (reportType === 'pending_docs') {
      headers = ["Lead ID", "Customer Name", "Status", "RC Status", "Insurance Status", "RTO Status"];
      rows = records.map(r => [
        r.lead_id,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        r.status,
        r.rc_status || 'pending',
        r.insurance_status || 'pending',
        r.rto_status || 'pending'
      ]);
    } else {
      headers = ["Lead ID", "Date", "Customer Name", "Loan Amount", "Executive Name", "Status"];
      rows = records.map(r => [
        r.lead_id, r.lead_date,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        r.loan_amount || 0,
        `"${(r.executive_name || 'Unassigned').replace(/"/g, '""')}"`,
        r.status
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `MIS_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const reportTypes = [
    { value: 'disbursement', label: 'Disbursement Register', icon: Building, desc: 'All disbursed leads with loan details' },
    { value: 'payouts', label: 'Payouts & Commission', icon: DollarSign, desc: 'Commission register with 90/10 split status' },
    { value: 'pending_docs', label: 'Pending Documents', icon: FileText, desc: 'RC, Insurance, RTO document tracking' },
    { value: 'executive_perf', label: 'Executive Performance', icon: Users, desc: 'Executive-wise lead pipeline & conversion' },
  ];

  const activeReport = reportTypes.find(r => r.value === reportType) || reportTypes[0];

  // Chart data for visual summary
  const chartData = useMemo(() => {
    if (!records.length) return [];
    const monthly: Record<string, { amount: number; count: number }> = {};
    records.forEach(r => {
      const month = r.lead_date?.slice(0, 7) || 'Unknown';
      if (!monthly[month]) monthly[month] = { amount: 0, count: 0 };
      monthly[month].amount += r.loan_amount || 0;
      monthly[month].count += 1;
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month: month.slice(5) + '/' + month.slice(2,4), ...data }));
  }, [records]);

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; color: string }> = {};
    records.forEach(r => {
      const key = r.status || 'unknown';
      if (!breakdown[key]) breakdown[key] = { count: 0, color: '#64748b' };
      breakdown[key].count++;
    });
    const colors: Record<string, string> = {
      new: '#3b82f6', pending: '#f59e0b', approved: '#10b981',
      disbursed: '#0d9488', on_hold: '#8b5cf6', rejected: '#f43f5e'
    };
    return Object.entries(breakdown).map(([status, data]) => ({ 
      status: status.charAt(0).toUpperCase() + status.slice(1), 
      count: data.count, 
      color: colors[status] || '#64748b' 
    }));
  }, [records]);

  return (
    <div className="space-y-6 pb-12 select-none animate-fade-in">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="text-indigo-500 w-5 h-5" /> MIS Reports & Analytics
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Generate audit-ready statements, payout logs, and pipeline performance sheets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && hasGenerated && records.length > 0 && (
            <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/25 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" /> Export CSV ({records.length})
            </button>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              showFilters 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        
        {/* ── Filters Sidebar ── */}
        <div className="col-span-1">
          <form onSubmit={handleGenerate} className={clsx('card p-5 space-y-4', !showFilters && 'hidden lg:block')}>
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Report Settings
            </h3>
            
            <div className="space-y-4">
              {/* Report Type - Card Selector */}
              <FilterSection label="Report Type">
                <div className="grid grid-cols-2 gap-2">
                  {reportTypes.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReportType(opt.value)}
                      className={clsx(
                        'p-3 rounded-xl border-2 transition-all cursor-pointer text-left',
                        reportType === opt.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                      )}
                    >
                      <opt.icon className={clsx('w-4 h-4 mb-2', reportType === opt.value ? 'text-indigo-500' : 'text-slate-400')} />
                      <div className="font-bold text-xs text-slate-800 dark:text-white">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* Date Filters */}
              <FilterSection label="Date Range">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Date</label>
                    <DateInput value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">To Date</label>
                    <DateInput value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </FilterSection>

              {/* Entity Filters */}
              <FilterSection label="Agent (DSA)">
                <SelectInput value={agentId} onChange={e => setAgentId(e.target.value)}>
                  <option value="">All Agents</option>
                  {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                </SelectInput>
              </FilterSection>

              <FilterSection label="Financer Bank">
                <SelectInput value={financerId} onChange={e => setFinancerId(e.target.value)}>
                  <option value="">All Financers</option>
                  {financers.map(fin => <option key={fin.id} value={fin.id}>{fin.name}</option>)}
                </SelectInput>
              </FilterSection>

              <FilterSection label="Bank Executive">
                <SelectInput value={executiveId} onChange={e => setExecutiveId(e.target.value)}>
                  <option value="">All Executives</option>
                  {executives.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </SelectInput>
              </FilterSection>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white py-2.5 rounded-lg font-bold text-xs mt-2 transition-all cursor-pointer shadow-sm shadow-indigo-500/25 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </form>

          {!showFilters && (
            <button 
              onClick={() => setShowFilters(true)}
              className="lg:hidden w-full text-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm py-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition"
            >
              Show Filters <Filter className="w-4 h-4 inline-block ml-1" />
            </button>
          )}
        </div>

        {/* ── Output Grid ── */}
        <div className="col-span-1 lg:col-span-3 space-y-5">
          
          {/* Report Type Header */}
          <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/5 dark:to-violet-500/5 border border-indigo-200/50 dark:border-indigo-800/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <activeReport.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">{activeReport.label}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeReport.desc}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {reportType}
            </span>
          </div>

          {/* Loading / Empty States */}
          {loading ? (
            <div className="card min-h-[350px] flex flex-col items-center justify-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-500/20" />
                <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin" />
              </div>
              <p className="text-xs text-slate-400 font-medium">Generating report register...</p>
            </div>
          ) : !hasGenerated ? (
            <div className="card min-h-[350px] flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent">
              <BarChart3 className="w-14 h-14 text-slate-200 dark:text-slate-800 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No report generated yet</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-xs">
                Select your parameters on the left and click "Generate Report" to view dynamic database registers.
              </p>
            </div>
          ) : records.length === 0 ? (
            <div className="card min-h-[350px] flex flex-col items-center justify-center text-center p-6">
              <XCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-500">No matching records found</h3>
              <p className="text-xs text-slate-400 mt-1">Try expanding your date ranges or changing your filters.</p>
            </div>
          ) : (
            <>
              {/* Summary Cards with Visual Charts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
                <KPICard label="Total Loan Book" value={<FormatCurrency value={summary?.totalLoanAmount || 0} color="indigo" />} icon={Building} color="#4f46e5" bgColor="bg-indigo-50/30 dark:bg-indigo-500/5" />
                <KPICard label="Total Commissions" value={<FormatCurrency value={summary?.totalCommission || 0} color="indigo" />} icon={DollarSign} color="#4f46e5" bgColor="bg-indigo-50/30 dark:bg-indigo-500/5" />
                <KPICard label="Paid Out" value={<FormatCurrency value={summary?.totalPaid || 0} color="emerald" />} icon={CreditCard} color="#10b981" bgColor="bg-emerald-50/30 dark:bg-emerald-500/5" />
                <KPICard label="Total Leads" value={summary?.totalLeads || 0} icon={Users} color="#3b82f6" bgColor="bg-blue-50/30 dark:bg-blue-500/5" />
              </div>

              {/* Visual Analytics Row */}
              {(chartData.length > 0 || statusBreakdown.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
                  {/* Monthly Trend */}
                  {chartData.length > 0 && (
                    <div className="card p-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Monthly Trend
                      </h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaLoan" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="areaCount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} tickFormatter={val => val >= 1e6 ? `₹${(val/1e6).toFixed(1)}Cr` : val >= 1e5 ? `₹${(val/1e5).toFixed(0)}L` : `₹${val}`} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Legend wrapperStyle={{ paddingTop: '8px' }} />
                          <Area type="monotone" dataKey="amount" name="Loan Amount" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#areaLoan)" dot={false} activeDot={{ r: 6, strokeWidth: 2 }} />
                          <Area type="monotone" dataKey="count" name="Lead Count" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#areaCount)" dot={false} activeDot={{ r: 6, strokeWidth: 2 }} yAxisId="right" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Status Breakdown */}
                  {statusBreakdown.length > 0 && (
                    <div className="card p-4">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Lead Status Breakdown
                      </h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                          <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} width={80} />
                          <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {statusBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {/* Data Table */}
              <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-400 to-teal-400" />
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        {reportType === 'disbursement' && (
                          <>
                            {["Lead ID", "Date", "Customer Name", "Vehicle", "Financer", "DSA Agent", "Loan Amount"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{h}</th>
                            ))}
                          </>
                        )}
                        {reportType === 'payouts' && (
                          <>
                            {["Lead ID", "Customer", "Agent (DSA)", "Comm. Amount", "Paid Amount", "90% Payout", "10% Retention"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{h}</th>
                            ))}
                          </>
                        )}
                        {reportType === 'pending_docs' && (
                          <>
                            {["Lead ID", "Customer", "Overall Status", "RC Book", "Insurance Policy", "RTO file"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{h}</th>
                            ))}
                          </>
                        )}
                        {reportType === 'executive_perf' && (
                          <>
                            {["Lead ID", "Date", "Customer", "Executive Name", "Loan Amount", "Status"].map(h => (
                              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{h}</th>
                            ))}
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                      {records.map((r, i) => (
                        <tr key={i} className={clsx(
                          'hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors',
                          i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : ''
                        )}>
                          {reportType === 'disbursement' && (
                            <>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.lead_id}</td>
                              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.lead_date}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white text-[13px]">{r.customer_name}</td>
                              <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                <div className="flex items-center gap-1">
                                  <Building className="w-3.5 h-3.5 shrink-0" />
                                  {r.vehicle_make_model || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-indigo-500">{r.financer_name || '—'}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-medium">{r.agent_name || 'Direct'}</td>
                              <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                <FormatCurrency value={r.loan_amount || 0} color="emerald" />
                              </td>
                            </>
                          )}

                          {reportType === 'payouts' && (
                            <>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.lead_id}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white text-[13px]">{r.customer_name}</td>
                              <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-medium">{r.agent_name || 'Direct'}</td>
                              <td className="px-4 py-3 font-mono text-slate-850 dark:text-slate-200 text-xs">
                                <FormatCurrency value={r.commission_amount || 0} color="slate" />
                              </td>
                              <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 text-xs">
                                <FormatCurrency value={r.paid_amount || 0} color="emerald" />
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={r.payout_90_status || 'pending'} />
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={r.payout_10_status || 'pending'} />
                              </td>
                            </>
                          )}

                          {reportType === 'pending_docs' && (
                            <>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.lead_id}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white text-[13px]">{r.customer_name}</td>
                              <td className="px-4 py-3 text-xs capitalize font-medium">{r.status}</td>
                              <td className="px-4 py-3">
                                <StatusBadge status={r.rc_status === 'received' ? 'received' : 'missing'} />
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={r.insurance_status === 'received' ? 'received' : 'missing'} />
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={r.rto_status === 'done' ? 'done' : 'missing'} />
                              </td>
                            </>
                          )}

                          {reportType === 'executive_perf' && (
                            <>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{r.lead_id}</td>
                              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{r.lead_date}</td>
                              <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white text-[13px]">{r.customer_name}</td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300">{r.executive_name || 'Unassigned'}</td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-850 dark:text-white text-xs">
                                <FormatCurrency value={r.loan_amount || 0} color="slate" />
                              </td>
                              <td className="px-4 py-3 text-xs capitalize">{r.status}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-600 dark:text-slate-350">{records.length}</span> record{records.length !== 1 ? 's' : ''}
                  </p>
                  {isAdminOrManager && records.length > 0 && (
                    <button onClick={handleExportCSV} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
                      <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}