import React, { useEffect, useState, useMemo } from 'react';
import { 
  FileText, Download, BarChart3, XCircle, SlidersHorizontal, Building,
  Filter, Users, DollarSign, CreditCard, TrendingUp, Search,
  RefreshCw, CheckCircle2
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
    released: { label: 'Released', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    eligible: { label: 'Eligible', className: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    received: { label: 'Received', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    done: { label: 'Done', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    missing: { label: 'Missing', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
    disbursed: { label: 'Disbursed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' },
    approved: { label: 'Approved', className: 'bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-500/10 dark:text-primary-400 dark:border-primary-500/20' },
    rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
    new: { label: 'New', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
  };
  const cfg = configs[(status || '').toLowerCase()] || { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border uppercase tracking-wider', cfg.className)}>
      {cfg.label}
    </span>
  );
}

function FormatCurrency({ value, color = 'slate' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'text-slate-850 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    indigo: 'text-primary-600 dark:text-primary-400',
    amber: 'text-amber-600 dark:text-amber-400',
  };
  return (
    <span className={clsx('font-mono font-bold text-xs', colors[color])}>
      ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </span>
  );
}

function KPICard({ label, value, icon: Icon, color, subText, bgGradient }: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ElementType; 
  color: string; 
  subText?: string;
  bgGradient?: string;
}) {
  return (
    <div className={clsx('relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-lg', bgGradient || 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800')}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: `${color}18`, color }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-2">
        <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
        {subText && (
          <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>{subText}</span>
          </div>
        )}
      </div>
    </div>
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
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [tableSearch, setTableSearch] = useState('');

  // Report Categories Config
  const reportTypes = [
    { value: 'disbursement', label: 'Disbursement Register', icon: Building, desc: 'All disbursed loans & bank details' },
    { value: 'payouts', label: 'Payouts & Commission', icon: DollarSign, desc: '90/10 commission split log' },
    { value: 'pending_docs', label: 'Pending Documents', icon: FileText, desc: 'RC, Insurance & RTO tracking' },
    { value: 'executive_perf', label: 'Executive Performance', icon: Users, desc: 'Staff lead conversion sheets' },
  ];

  const activeReport = reportTypes.find(r => r.value === reportType) || reportTypes[0];

  // Fetch Lookups
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
        console.error('Failed to load filter lookups', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Data Function
  const fetchReportData = async (
    type = reportType,
    ag = agentId,
    fin = financerId,
    ex = executiveId,
    sDate = startDate,
    eDate = endDate
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (ag) params.append('agent_id', ag);
      if (fin) params.append('financer_id', fin);
      if (ex) params.append('executive_id', ex);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      
      if (type === 'disbursement' || type === 'payouts') {
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

  // Auto-generate on initial render or reportType change
  useEffect(() => {
    fetchReportData();
  }, [reportType]);

  const handleGenerate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchReportData();
  };

  // Date Quick Preset Handlers
  const handleDatePreset = (preset: 'this_month' | 'last_month' | 'ytd' | 'all') => {
    const now = new Date();
    let s = '';
    let e = '';

    if (preset === 'this_month') {
      s = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      e = now.toISOString().slice(0, 10);
    } else if (preset === 'last_month') {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      e = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    } else if (preset === 'ytd') {
      s = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      e = now.toISOString().slice(0, 10);
    }

    setStartDate(s);
    setEndDate(e);
    fetchReportData(reportType, agentId, financerId, executiveId, s, e);
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setAgentId('');
    setFinancerId('');
    setExecutiveId('');
    setTableSearch('');
    fetchReportData(reportType, '', '', '', '', '');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;
    setExporting(true);
    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'disbursement') {
      headers = ["Lead ID", "Date", "Customer Name", "Vehicle", "Financer Bank", "Agent (DSA)", "Loan Amount"];
      rows = filteredRecords.map(r => [
        r.lead_id, r.lead_date,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${(r.vehicle_make_model || '').replace(/"/g, '""')}"`,
        `"${(r.financer_name || '—').replace(/"/g, '""')}"`,
        `"${(r.agent_name || 'Direct').replace(/"/g, '""')}"`,
        r.loan_amount || 0
      ]);
    } else if (reportType === 'payouts') {
      headers = ["Lead ID", "Customer Name", "Agent (DSA)", "Commission Amount", "Paid Amount", "90% Payout Status", "10% Payout Status"];
      rows = filteredRecords.map(r => [
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
      rows = filteredRecords.map(r => [
        r.lead_id,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        r.status,
        r.rc_status || 'pending',
        r.insurance_status || 'pending',
        r.rto_status || 'pending'
      ]);
    } else {
      headers = ["Lead ID", "Date", "Customer Name", "Loan Amount", "Executive Name", "Status"];
      rows = filteredRecords.map(r => [
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setExporting(false), 600);
  };

  // Filtered records by client-side table search
  const filteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return records;
    const query = tableSearch.toLowerCase().trim();
    return records.filter(r => 
      (r.lead_id && r.lead_id.toLowerCase().includes(query)) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(query)) ||
      (r.vehicle_make_model && r.vehicle_make_model.toLowerCase().includes(query)) ||
      (r.financer_name && r.financer_name.toLowerCase().includes(query)) ||
      (r.agent_name && r.agent_name.toLowerCase().includes(query)) ||
      (r.executive_name && r.executive_name.toLowerCase().includes(query))
    );
  }, [records, tableSearch]);

  // Chart Data: Monthly Volume
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
      .map(([month, data]) => ({ month: month.slice(5) + '/' + month.slice(2, 4), ...data }));
  }, [records]);

  // Chart Data: Status Breakdown
  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; color: string }> = {};
    records.forEach(r => {
      const key = r.status || 'unknown';
      if (!breakdown[key]) breakdown[key] = { count: 0, color: '#64748b' };
      breakdown[key].count++;
    });
    const colors: Record<string, string> = {
      new: '#3b82f6', pending: '#f59e0b', approved: '#6366f1',
      disbursed: '#10b981', on_hold: '#8b5cf6', rejected: '#f43f5e'
    };
    return Object.entries(breakdown).map(([status, data]) => ({ 
      status: status.charAt(0).toUpperCase() + status.slice(1), 
      count: data.count, 
      color: colors[status] || '#64748b' 
    }));
  }, [records]);

  return (
    <div className="space-y-5 pb-10 font-sans select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              MIS Reports & Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              Live Register
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Generate audit-ready loan statements, commission registers, document logs, and conversion sheets.
          </p>
        </div>

        {/* Quick Date Presets + Export */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              onClick={() => handleDatePreset('this_month')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => handleDatePreset('last_month')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Last Month
            </button>
            <button
              onClick={() => handleDatePreset('ytd')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              YTD
            </button>
          </div>

          {isAdminOrManager && records.length > 0 && (
            <button 
              onClick={handleExportCSV} 
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-75"
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exporting ? 'Exporting...' : `Export CSV (${filteredRecords.length})`}</span>
            </button>
          )}

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border',
              showFilters 
                ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800' 
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
        </div>
      </div>

      {/* ── Report Category Selector Tabs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {reportTypes.map((opt) => {
          const isSelected = reportType === opt.value;
          const OptIcon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReportType(opt.value)}
              className={clsx(
                'p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between relative overflow-hidden group',
                isSelected
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary-300 dark:hover:border-primary-700'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={clsx(
                  'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                  isSelected ? 'bg-white/20 text-white' : 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400'
                )}>
                  <OptIcon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                )}
              </div>
              <div>
                <div className={clsx('font-black text-xs tracking-tight', isSelected ? 'text-white' : 'text-slate-900 dark:text-white')}>
                  {opt.label}
                </div>
                <div className={clsx('text-[10px] font-medium mt-0.5 truncate', isSelected ? 'text-primary-100' : 'text-slate-400 dark:text-slate-400')}>
                  {opt.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Top Filter Control Panel ── */}
      {showFilters && (
        <form onSubmit={handleGenerate} className="bg-white dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary-500" />
              <span>Report Parameters & Filters</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset All</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Agent / DSA */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                Agent (DSA)
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              >
                <option value="">All Agents</option>
                {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
              </select>
            </div>

            {/* Financer Bank */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                Financer Bank
              </label>
              <select
                value={financerId}
                onChange={(e) => setFinancerId(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              >
                <option value="">All Financers</option>
                {financers.map(fin => <option key={fin.id} value={fin.id}>{fin.name}</option>)}
              </select>
            </div>

            {/* Executive */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                Staff Executive
              </label>
              <select
                value={executiveId}
                onChange={(e) => setExecutiveId(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              >
                <option value="">All Executives</option>
                {executives.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button 
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white rounded-xl font-extrabold text-xs transition-all cursor-pointer shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Filter className="w-3.5 h-3.5" />
              )}
              <span>{loading ? 'Applying Filters...' : 'Apply Filters & Refresh'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard 
          label="Total Loan Book" 
          value={<FormatCurrency value={summary?.totalLoanAmount || 0} color="indigo" />} 
          icon={Building} 
          color="#6366f1" 
          subText={`${records.length} Total Loans`}
        />
        <KPICard 
          label="Total Commission" 
          value={<FormatCurrency value={summary?.totalCommission || 0} color="amber" />} 
          icon={DollarSign} 
          color="#f59e0b" 
          subText="Standard 90/10 Split Model"
        />
        <KPICard 
          label="Total Paid Out" 
          value={<FormatCurrency value={summary?.totalPaid || 0} color="emerald" />} 
          icon={CreditCard} 
          color="#10b981" 
          subText="Agent & Partner Disbursals"
        />
        <KPICard 
          label="Filtered Records" 
          value={filteredRecords.length} 
          icon={Users} 
          color="#3b82f6" 
          subText={`Out of ${records.length} Total Records`}
        />
      </div>

      {/* ── Visual Analytics Charts Row ── */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Monthly Trend Area Chart */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Monthly Loan Volume & Lead Count
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Real-Time Data</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaLoan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={val => val >= 1e6 ? `₹${(val/1e6).toFixed(1)}Cr` : val >= 1e5 ? `₹${(val/1e5).toFixed(0)}L` : `₹${val}`} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Area type="monotone" dataKey="amount" name="Loan Amount" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#areaLoan)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown Bar Chart */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/90 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Lead Status Distribution
                </h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusBreakdown} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} opacity={0.5} />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="status" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {statusBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      )}

      {/* ── High-Density Data Table ── */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <activeReport.icon className="w-4 h-4 text-primary-500" />
            <h3 className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              {activeReport.label}
            </h3>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
              ({filteredRecords.length} records)
            </span>
          </div>

          {/* Table Search Input */}
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search Lead ID, Name, Bank..."
              className="w-full pl-9 pr-3 h-8 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-bold">Loading report data...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <XCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">No records found</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Try adjusting your filters or date selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {reportType === 'disbursement' && (
                    <>
                      <th className="px-3.5 py-2.5">Lead ID</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Customer Name</th>
                      <th className="px-3.5 py-2.5">Vehicle</th>
                      <th className="px-3.5 py-2.5">Financer Bank</th>
                      <th className="px-3.5 py-2.5">Agent (DSA)</th>
                      <th className="px-3.5 py-2.5 text-right">Loan Amount</th>
                    </>
                  )}
                  {reportType === 'payouts' && (
                    <>
                      <th className="px-3.5 py-2.5">Lead ID</th>
                      <th className="px-3.5 py-2.5">Customer Name</th>
                      <th className="px-3.5 py-2.5">Agent (DSA)</th>
                      <th className="px-3.5 py-2.5 text-right">Comm. Amount</th>
                      <th className="px-3.5 py-2.5 text-right">Paid Amount</th>
                      <th className="px-3.5 py-2.5 text-center">90% Payout</th>
                      <th className="px-3.5 py-2.5 text-center">10% Retention</th>
                    </>
                  )}
                  {reportType === 'pending_docs' && (
                    <>
                      <th className="px-3.5 py-2.5">Lead ID</th>
                      <th className="px-3.5 py-2.5">Customer Name</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5 text-center">RC Book</th>
                      <th className="px-3.5 py-2.5 text-center">Insurance</th>
                      <th className="px-3.5 py-2.5 text-center">RTO File</th>
                    </>
                  )}
                  {reportType === 'executive_perf' && (
                    <>
                      <th className="px-3.5 py-2.5">Lead ID</th>
                      <th className="px-3.5 py-2.5">Date</th>
                      <th className="px-3.5 py-2.5">Customer Name</th>
                      <th className="px-3.5 py-2.5">Executive Name</th>
                      <th className="px-3.5 py-2.5 text-right">Loan Amount</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {filteredRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-primary-50/20 dark:hover:bg-primary-950/20 transition-colors">
                    {reportType === 'disbursement' && (
                      <>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary-600 dark:text-primary-400">{r.lead_id}</td>
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono text-[11px]">{r.lead_date}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">{r.vehicle_make_model || '—'}</td>
                        <td className="px-3.5 py-2.5 font-bold text-primary-600 dark:text-primary-400">{r.financer_name || '—'}</td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">{r.agent_name || 'Direct'}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          <FormatCurrency value={r.loan_amount || 0} color="emerald" />
                        </td>
                      </>
                    )}

                    {reportType === 'payouts' && (
                      <>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary-600 dark:text-primary-400">{r.lead_id}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">{r.agent_name || 'Direct'}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          <FormatCurrency value={r.commission_amount || 0} color="slate" />
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          <FormatCurrency value={r.paid_amount || 0} color="emerald" />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.payout_90_status || 'pending'} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.payout_10_status || 'pending'} />
                        </td>
                      </>
                    )}

                    {reportType === 'pending_docs' && (
                      <>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary-600 dark:text-primary-400">{r.lead_id}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3.5 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.rc_status === 'received' ? 'received' : 'missing'} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.insurance_status === 'received' ? 'received' : 'missing'} />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.rto_status === 'done' ? 'done' : 'missing'} />
                        </td>
                      </>
                    )}

                    {reportType === 'executive_perf' && (
                      <>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-primary-600 dark:text-primary-400">{r.lead_id}</td>
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono text-[11px]">{r.lead_date}</td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">{r.customer_name}</td>
                        <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 font-semibold">{r.executive_name || 'Unassigned'}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-black text-slate-900 dark:text-white">
                          <FormatCurrency value={r.loan_amount || 0} color="slate" />
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={r.status} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            Showing <span className="font-bold text-slate-800 dark:text-white">{filteredRecords.length}</span> of <span className="font-bold text-slate-800 dark:text-white">{records.length}</span> entries
          </div>
          {isAdminOrManager && filteredRecords.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="text-primary-600 dark:text-primary-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export as CSV
            </button>
          )}
        </div>

      </div>

    </div>
  );
}