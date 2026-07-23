import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  Search, MessageCircle, Plus, X, Download, UserPlus,
  Phone, ChevronDown,
  CircleDot, Filter, TrendingUp,
  Clock, CheckCircle2, PauseCircle,
  XCircle, Sparkles, Loader2
} from 'lucide-react';
import NewLeadModal from '../components/NewLeadModal';
import AssignmentModal from '../components/AssignmentModal';

import clsx from 'clsx';

interface Lead {
  id: number;
  lead_id: string;
  customer_name: string;
  customer_address?: string;
  customer_mobile: string;
  vehicle_make_model: string;
  registration_number: string;
  vehicle_condition?: string;
  loan_amount: number;
  loan_type: string;
  status: string;
  lead_date: string;
  payout_amount: number;
  agent_name: string | null;
  financer_name: string | null;
  executive_name: string | null;
  dealer_name: string | null;
  channel_executive_name?: string | null;
  channel_name?: string | null;
  financer_id?: number | null;
  executive_id?: number | null;
  agent_id?: number | null;
  channel_id?: number | null;
  channel_executive_id?: number | null;
  next_followup_date?: string | null;
  agent_kyc_verified?: boolean;
  agent_bank_verified?: boolean;
}

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; border: string; icon: React.ElementType; label: string }> = {
  new:       { dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    icon: Sparkles,     label: 'New' },
  pending:   { dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock,        label: 'Pending' },
  approved:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, label: 'Approved' },
  disbursed: { dot: 'bg-teal-500',    bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    icon: TrendingUp,   label: 'Disbursed' },
  on_hold:   { dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200',  icon: PauseCircle,  label: 'On Hold' },
  rejected:  { dot: 'bg-rose-500',    bg: 'bg-rose-50',    text: 'text-rose-700',    border: 'border-rose-200',    icon: XCircle,      label: 'Rejected' },
};
const STATUS_KEYS = ['new', 'pending', 'approved', 'disbursed', 'on_hold', 'rejected'];

// ─── Table Row ───────────────────────────────────────────────────────────────
function LeadTableRow({
  lead, isAdminOrManager, onAssign, getWhatsAppLink,
  isSelected, onToggleSelect, onOpenPreview
}: {
  lead: Lead; isAdminOrManager: boolean;
  onAssign: (l: Lead) => void;
  getWhatsAppLink: (m: string, n: string) => string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenPreview: (id: number) => void;
}) {
  return (
    <tr className={clsx(
      "group border-b border-slate-200 dark:border-slate-800/60 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/10 transition-colors",
      isSelected ? "bg-indigo-50/50 dark:bg-indigo-900/20" : ""
    )}>
      {/* Checkbox */}
      <td className="w-12 px-4 py-4 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500/20 w-4 h-4 cursor-pointer"
        />
      </td>

      <td className="px-4 py-4 whitespace-nowrap">
        <button onClick={() => onOpenPreview(lead.id)} className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
          {lead.lead_id}
        </button>
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-medium">
        {lead.lead_date}
      </td>

      <td className="px-4 py-4">
        <span className="font-bold text-slate-800 dark:text-white text-xs truncate max-w-[150px] block" title={lead.customer_name}>
          {lead.customer_name}
        </span>
      </td>

      <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={lead.customer_address}>
        {lead.customer_address || '—'}
      </td>

      <td className="px-4 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <span>{lead.customer_mobile}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={getWhatsAppLink(lead.customer_mobile, lead.customer_name)} target="_blank" rel="noreferrer" className="text-emerald-600 hover:text-emerald-500"><MessageCircle className="w-3.5 h-3.5" /></a>
            <a href={`tel:${lead.customer_mobile}`} className="text-blue-600 hover:text-blue-500"><Phone className="w-3.5 h-3.5" /></a>
          </div>
        </div>
      </td>

      <td className="px-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]" title={lead.vehicle_make_model}>
        {lead.vehicle_make_model || '—'}
      </td>

      <td className="px-4 py-4 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase">
        {lead.registration_number || '—'}
      </td>

      <td className="px-4 py-4 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-right">
        ₹{(lead.loan_amount || 0).toLocaleString('en-IN')}
      </td>

      <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
        {lead.financer_name || '—'}
      </td>

      <td className="px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
        {lead.executive_name || '—'}
      </td>

      <td className="px-4 py-4 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {lead.loan_type ? (lead.loan_type === 'new_loan' ? 'New Loan' : (lead.loan_type === 'used_loan' ? 'Used Loan' : lead.loan_type)) : '—'}
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-xs">
        {lead.channel_name || lead.channel_executive_name ? (
          <div className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]" title={lead.channel_name || lead.channel_executive_name || undefined}>{lead.channel_name || lead.channel_executive_name}</div>
        ) : <span className="text-slate-400">—</span>}
      </td>

      <td className="px-4 py-4 whitespace-nowrap text-xs">
        {lead.dealer_name || lead.agent_name ? (
          <div className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[130px]" title={lead.dealer_name || lead.agent_name || undefined}>{lead.dealer_name || lead.agent_name}</div>
        ) : <span className="text-slate-400">—</span>}
      </td>

      <td className="px-4 py-4">
        <span className={clsx(
          "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide",
          STATUS_CONFIG[lead.status]?.bg, STATUS_CONFIG[lead.status]?.text
        )}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_CONFIG[lead.status]?.dot || 'bg-slate-400')} />
          {STATUS_CONFIG[lead.status]?.label || lead.status}
        </span>
      </td>

      <td className="px-4 py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          {isAdminOrManager && (
            <button onClick={() => onAssign(lead)}
              className="p-1 rounded text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Full Assignment Dialog">
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onOpenPreview(lead.id)}
            className="px-2 py-1 bg-white border border-slate-300 dark:border-slate-600 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded text-xs font-medium transition-colors text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            View
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Interactive KPI Metric Card ──────────────────────────────────────────────
function KpiBadge({ statusKey, count, active, onClick }: { statusKey: string; count: number; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[statusKey];
  if (!cfg || count === 0) return null;
  const Icon = cfg.icon;

  return (
    <button onClick={onClick}
      className={clsx(
        'group flex items-center gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer',
        active
          ? clsx(cfg.bg, cfg.border, 'border-indigo-500 shadow-sm')
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      )}>
      <div className={clsx('w-6 h-6 rounded flex items-center justify-center shrink-0', active ? cfg.dot : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300', active && 'text-white')}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="text-left">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-none">{cfg.label}</div>
        <div className={clsx('text-sm font-bold mt-0.5', active ? cfg.text : 'text-slate-800 dark:text-slate-100')}>{count}</div>
      </div>
    </button>
  );
}

// ─── Modern Pill Tab ─────────────────────────────────────────────────────────
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={clsx(
        'px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5',
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-100'
          : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-white'
      )}>
      {label}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Leads() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const [searchParams, setSearchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [financers, setFinancers] = useState<{ id: number; name: string }[]>([]);
  const [executives, setExecutives] = useState<{ id: number; name: string }[]>([]);
  const [channelExecutives, setChannelExecutives] = useState<{ id: number; name: string }[]>([]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterAssigned, setFilterAssigned] = useState(searchParams.get('assigned') || '');
  const [filterAgent, setFilterAgent] = useState(searchParams.get('agent_id') || '');
  const [filterFinancer, setFilterFinancer] = useState(searchParams.get('financer_id') || '');
  const [filterExecutive, setFilterExecutive] = useState(searchParams.get('executive_id') || '');
  const [filterChannelExecutive, setFilterChannelExecutive] = useState(searchParams.get('channel_executive_id') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalLead, setAssignModalLead] = useState<any>(null);

  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const navigate = useNavigate();

  // Clear selections when leads list updates
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [leads]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeadIds(leads.map(l => l.id));
    } else {
      setSelectedLeadIds([]);
    }
  };

  const handleSelectRow = (id: number) => {
    setSelectedLeadIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkAssignExecutive = async (execIdStr: string) => {
    if (!execIdStr) return;
    const execId = execIdStr === 'null' ? null : parseInt(execIdStr);
    setBulkUpdating(true);
    try {
      await Promise.all(selectedLeadIds.map(async (id) => {
        const l = leads.find(item => item.id === id);
        if (!l) return;
        await api.put('/leads?action=assign', {
          id,
          assigned_date: new Date().toISOString().split('T')[0],
          financer_id: l.financer_id || null,
          executive_id: execId,
          channel_id: l.channel_id || null,
          channel_executive_id: l.channel_executive_id || null
        });
      }));
      setSelectedLeadIds([]);
      await fetchLeads();
      alert('Bulk executive assignment completed.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply bulk assignment');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkAssignFinancer = async (finIdStr: string) => {
    if (!finIdStr) return;
    const finId = finIdStr === 'null' ? null : parseInt(finIdStr);
    setBulkUpdating(true);
    try {
      await Promise.all(selectedLeadIds.map(async (id) => {
        const l = leads.find(item => item.id === id);
        if (!l) return;
        await api.put('/leads?action=assign', {
          id,
          assigned_date: new Date().toISOString().split('T')[0],
          financer_id: finId,
          executive_id: l.executive_id || null,
          channel_id: l.channel_id || null,
          channel_executive_id: l.channel_executive_id || null
        });
      }));
      setSelectedLeadIds([]);
      await fetchLeads();
      alert('Bulk financer update completed.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply bulk financer update');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!status) return;
    setBulkUpdating(true);
    try {
      await Promise.all(selectedLeadIds.map(async (id) => {
        await api.post('/leads/status', {
          id,
          status,
          remarks: `Bulk status update to ${status}.`
        });
      }));
      setSelectedLeadIds([]);
      await fetchLeads();
      alert('Bulk status update completed.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to apply bulk status update');
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    if (!selectedLeadIds.length) return;
    const filteredLeads = leads.filter(l => selectedLeadIds.includes(l.id));
    const headers = ["Lead ID", "Date", "Customer Name", "Address", "Mobile", "Make & Model", "Reg No", "Loan Amount", "Financer", "Executive", "Lead Type", "Channel", "Dealer", "Status"];
    const rows = filteredLeads.map(l => [
      l.lead_id, l.lead_date,
      `"${(l.customer_name || '').replace(/"/g, '""')}"`,
      `"${(l.customer_address || '').replace(/"/g, '""')}"`,
      l.customer_mobile || '',
      `"${(l.vehicle_make_model || '').replace(/"/g, '""')}"`,
      l.registration_number || '', l.loan_amount || 0,
      `"${(l.financer_name || 'N/A').replace(/"/g, '""')}"`,
      `"${(l.executive_name || 'Unassigned').replace(/"/g, '""')}"`,
      l.loan_type === 'new_loan' ? 'New Loan' : (l.loan_type === 'used_loan' ? 'Used Loan' : (l.loan_type || 'N/A')),
      `"${(l.channel_name || l.channel_executive_name || '').replace(/"/g, '""')}"`,
      `"${(l.dealer_name || l.agent_name || 'Direct / None').replace(/"/g, '""')}"`,
      l.status || ''
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.setAttribute("href", encodeURI(csv));
    a.setAttribute("download", `Selected_Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filterStatus) params.append('status', filterStatus);
      if (filterAssigned) params.append('assigned', filterAssigned);
      if (filterAgent) params.append('agent_id', filterAgent);
      if (filterFinancer) params.append('financer_id', filterFinancer);
      if (filterExecutive) params.append('executive_id', filterExecutive);
      if (filterChannelExecutive) params.append('channel_executive_id', filterChannelExecutive);
      const res = await api.get(`/leads?${params.toString()}`);
      setLeads(res.data.leads || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [agRes, finRes, exRes, chExRes] = await Promise.all([
          api.get('/setup/agents').catch(() => ({ data: { agents: [] } })),
          api.get('/setup/financers').catch(() => ({ data: { financers: [] } })),
          api.get('/setup/executives').catch(() => ({ data: { executives: [] } })),
          api.get('/setup/channel_executives').catch(() => ({ data: { channel_executives: [] } }))
        ]);
        setAgents(agRes.data?.agents || []);
        setFinancers(finRes.data?.financers || []);
        setExecutives(exRes.data?.executives || []);
        setChannelExecutives(chExRes.data?.channel_executives || []);
      } catch (e) { console.error(e); }
    };
    fetchLookups();
  }, []);

  useEffect(() => {
    setFilterStatus(searchParams.get('status') || '');
    setFilterAssigned(searchParams.get('assigned') || '');
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(fetchLeads, 300);
    return () => clearTimeout(t);
  }, [searchQuery, filterStatus, filterAssigned, filterAgent, filterFinancer, filterExecutive, filterChannelExecutive]);

  const handleTabChange = (assignedVal: string, statusVal: string = '') => {
    setFilterAssigned(assignedVal);
    setFilterStatus(statusVal);
    setSearchParams(prev => {
      if (assignedVal && assignedVal !== 'all') prev.set('assigned', assignedVal); else prev.delete('assigned');
      if (statusVal) prev.set('status', statusVal); else prev.delete('status');
      return prev;
    });
  };

  const clearFilters = () => {
    setFilterStatus(''); setFilterAssigned(''); setFilterAgent('');
    setFilterFinancer(''); setFilterExecutive(''); setFilterChannelExecutive('');
    setSearchQuery(''); setSearchParams({});
  };

  const exportToCSV = () => {
    if (!leads.length) return;
    const headers = ["Lead ID", "Date", "Customer Name", "Address", "Mobile", "Make & Model", "Reg No", "Loan Amount", "Financer", "Executive", "Lead Type", "Channel", "Dealer", "Status"];
    const rows = leads.map(l => [
      l.lead_id, l.lead_date,
      `"${(l.customer_name || '').replace(/"/g, '""')}"`,
      `"${(l.customer_address || '').replace(/"/g, '""')}"`,
      l.customer_mobile || '',
      `"${(l.vehicle_make_model || '').replace(/"/g, '""')}"`,
      l.registration_number || '', l.loan_amount || 0,
      `"${(l.financer_name || 'N/A').replace(/"/g, '""')}"`,
      `"${(l.executive_name || 'Unassigned').replace(/"/g, '""')}"`,
      l.loan_type === 'new_loan' ? 'New Loan' : (l.loan_type === 'used_loan' ? 'Used Loan' : (l.loan_type || 'N/A')),
      `"${(l.channel_name || l.channel_executive_name || '').replace(/"/g, '""')}"`,
      `"${(l.dealer_name || l.agent_name || 'Direct / None').replace(/"/g, '""')}"`,
      l.status || ''
    ]);
    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const a = document.createElement("a");
    a.setAttribute("href", encodeURI(csv));
    a.setAttribute("download", `Leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const hasActiveFilters = filterStatus || filterAgent || filterFinancer || filterExecutive || filterChannelExecutive || searchQuery || (filterAssigned && filterAssigned !== 'all');

  const statusCounts = useMemo(() =>
    leads.reduce((acc: Record<string, number>, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {}),
    [leads]
  );

  const totalLoanValue = useMemo(() => leads.reduce((sum, l) => sum + (l.loan_amount || 0), 0), [leads]);

  const getPageTitle = () => {
    if (filterAssigned === '1') return 'Assigned Leads';
    if (filterAssigned === 'followup') return 'Follow-up Pipeline';
    if (filterAssigned === '0') return 'Unassigned Leads';
    if (filterStatus === 'approved') return 'Approved Leads';
    if (filterStatus === 'disbursed') return 'Disbursed Leads';
    return 'All Leads';
  };

  const getWhatsAppLink = (mobile: string, name: string) => {
    if (!mobile) return '#';
    const num = mobile.replace(/\D/g, '');
    return `https://wa.me/91${num}?text=${encodeURIComponent(`Hi ${name}, regarding your loan application...`)}`;
  };

  const QUICK_TABS = [
    { label: 'All Leads', assigned: 'all', status: '' },
    { label: 'Unassigned', assigned: '0', status: '' },
    { label: 'Assigned', assigned: '1', status: '' },
    { label: 'Follow Up', assigned: 'followup', status: '' },
    { label: 'Approved', assigned: '', status: 'approved' },
    { label: 'Disbursed', assigned: '', status: 'disbursed' },
  ];

  return (
    <div className="space-y-4 select-none animate-fade-in">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{getPageTitle()}</h1>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                <Filter className="w-2.5 h-2.5" /> Filtered
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : (
              <>
                <span className="font-semibold text-slate-600">{leads.length}</span> lead{leads.length !== 1 ? 's' : ''}
                {totalLoanValue > 0 && (
                  <> · Total value: <span className="font-semibold text-emerald-600">₹{(totalLoanValue / 100000).toFixed(1)}L</span></>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdminOrManager && (
            <button onClick={exportToCSV} disabled={!leads.length}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-primary-400 hover:text-primary-600 transition-all disabled:opacity-40 cursor-pointer shadow-2xs">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}

          <button onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> New Lead
          </button>
        </div>
      </div>

      {/* ── Status KPI Strip ─────────────────────────────────────────── */}
      {!loading && leads.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {STATUS_KEYS.map(key => (
            <KpiBadge key={key} statusKey={key} count={statusCounts[key] || 0} active={filterStatus === key}
              onClick={() => { setFilterStatus(key); setFilterAssigned(''); setSearchParams({ status: key }); }} />
          ))}
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#162230] border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm sticky top-14 z-30">
        {/* Tab row */}
        <div className="flex items-center overflow-x-auto border-b border-slate-100 dark:border-slate-800 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-900/20">
          {QUICK_TABS.map(tab => {
            const isActive = tab.status
              ? filterStatus === tab.status && !filterAssigned
              : tab.assigned === 'all' ? !filterAssigned && !filterStatus : filterAssigned === tab.assigned;
            return <Tab key={tab.label} label={tab.label} active={isActive} onClick={() => handleTabChange(tab.assigned, tab.status)} />;
          })}
          <div className="flex-1" />
          <button onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 mx-2 rounded-md text-xs font-medium transition-colors cursor-pointer',
              hasActiveFilters ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}>
            <Filter className="w-3 h-3" />
            Filters {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
            <ChevronDown className={clsx('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
          </button>
        </div>

        {/* Search + Filters */}
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="text"
              id="leads-search"
              placeholder="Search by name, mobile, lead ID, vehicle…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111622] outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-[#162230] transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-[#111622] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-colors">
                    <option value="" className="bg-white dark:bg-[#111622]">All Statuses</option>
                    <option value="new" className="bg-white dark:bg-[#111622]">New</option>
                    <option value="pending" className="bg-white dark:bg-[#111622]">Pending</option>
                    <option value="on_hold" className="bg-white dark:bg-[#111622]">On Hold</option>
                    <option value="approved" className="bg-white dark:bg-[#111622]">Approved</option>
                    <option value="disbursed" className="bg-white dark:bg-[#111622]">Disbursed</option>
                    <option value="rejected" className="bg-white dark:bg-[#111622]">Rejected</option>
                  </select>
                </div>
                {isAdminOrManager && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dealer's</label>
                    <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-[#111622] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-colors">
                      <option value="" className="bg-white dark:bg-[#111622]">All Dealers</option>
                      {agents.map(ag => <option key={ag.id} value={ag.id} className="bg-white dark:bg-[#111622]">{ag.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Bank / Financer</label>
                  <select value={filterFinancer} onChange={(e) => setFilterFinancer(e.target.value)}
                    className="w-full text-sm bg-slate-50 dark:bg-[#111622] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-colors">
                    <option value="" className="bg-white dark:bg-[#111622]">All Financers</option>
                    {financers.map(f => <option key={f.id} value={f.id} className="bg-white dark:bg-[#111622]">{f.name}</option>)}
                  </select>
                </div>
                {isAdminOrManager && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Field Executive</label>
                    <select value={filterExecutive} onChange={(e) => setFilterExecutive(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-[#111622] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-colors">
                      <option value="" className="bg-white dark:bg-[#111622]">All Executives</option>
                      {executives.map(ex => <option key={ex.id} value={ex.id} className="bg-white dark:bg-[#111622]">{ex.name}</option>)}
                    </select>
                  </div>
                )}
                {isAdminOrManager && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Channel Executive</label>
                    <select value={filterChannelExecutive} onChange={(e) => setFilterChannelExecutive(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-[#111622] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20 outline-none transition-colors">
                      <option value="" className="bg-white dark:bg-[#111622]">All Channel Execs</option>
                      {channelExecutives.map(chEx => <option key={chEx.id} value={chEx.id} className="bg-white dark:bg-[#111622]">{chEx.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer transition-colors">
                    <X className="w-3 h-3" /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Institutional Financial Data Grid (Comprehensive Table View) ── */}
      <div className="bg-white dark:bg-[#162230] border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm animate-fade-in animate-in slide-in-from-bottom-2 duration-500">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-slate-800" />
              <div className="absolute inset-0 rounded-full border-[3px] border-t-primary-600 animate-spin" />
            </div>
            <p className="text-xs text-slate-400 font-bold">Loading Leads Grid…</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
              <CircleDot className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No leads match your criteria</p>
            <p className="text-xs text-slate-400 max-w-sm">{hasActiveFilters ? 'Try adjusting or clearing your active filters above.' : 'Create your first lead to start populating your institutional grid.'}</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs font-bold text-primary-600 hover:underline cursor-pointer mt-1">Clear active filters →</button>
            )}
          </div>
        ) : (
          <div className="overflow-auto relative custom-scrollbar max-h-[600px]">
            <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1150px]">
              <thead className="sticky top-0 z-30 shadow-sm">
                <tr className="bg-slate-50 dark:bg-[#192736] border-b border-slate-200 dark:border-slate-800">
                  <th className="sticky left-0 bg-slate-50 dark:bg-[#192736] z-40 px-2 py-3 border-r border-slate-200/80 dark:border-slate-800 text-center w-12">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 dark:border-slate-700 text-primary-600 focus:ring-primary-500/20 w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="sticky left-12 bg-slate-50 dark:bg-[#192736] z-40 px-3 py-3 border-r border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-24">Lead ID</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-24">Date</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-40">Customer Name</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-40">Address</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">Mobile</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-36">Make & Model</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-28">Reg No</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-right w-28">Loan Amount</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">Financer</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">Executive</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-24">Lead Type</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">Channel</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-32">Dealer</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap w-28">Status</th>
                  <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    isAdminOrManager={isAdminOrManager}
                    onAssign={setAssignModalLead}
                    getWhatsAppLink={getWhatsAppLink}
                    isSelected={selectedLeadIds.includes(lead.id)}
                    onToggleSelect={() => handleSelectRow(lead.id)}
                    onOpenPreview={(id) => navigate(`/leads/${id}`)}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3.5 bg-slate-50/60 dark:bg-slate-900/20 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-800 dark:text-white">{leads.length}</span> lead{leads.length !== 1 ? 's' : ''}
                {totalLoanValue > 0 && <> · Portfolio Value: <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">₹{(totalLoanValue / 100000).toFixed(2)} Lakhs</span></>}
              </p>
              {isAdminOrManager && leads.length > 0 && (
                <button onClick={exportToCSV} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Download Comprehensive CSV
                </button>
              )}
            </div>
          </div>
        )}
      </div>



      {/* Modals */}
      <NewLeadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchLeads(); }} />
      {assignModalLead && (
        <AssignmentModal
          isOpen={!!assignModalLead}
          onClose={() => setAssignModalLead(null)}
          onSuccess={() => { setAssignModalLead(null); fetchLeads(); }}
          leadId={assignModalLead.id}
          initialData={assignModalLead}
        />
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedLeadIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950/95 text-white py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-4 z-50 border border-slate-800/80 backdrop-blur-md animate-scale-in text-xs font-bold">
          <span className="bg-indigo-600 px-2.5 py-1 rounded-lg">
            {selectedLeadIds.length} Selected
          </span>

          {bulkUpdating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Applying bulk updates...</span>
            </div>
          ) : (
            <>
              {isAdminOrManager && (
                <>
                  {/* Bulk Financer Assign */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Bank:</span>
                    <select
                      onChange={(e) => handleBulkAssignFinancer(e.target.value)}
                      defaultValue=""
                      className="bg-slate-800 text-white border border-slate-700 py-1 px-2 rounded-lg text-xs outline-none cursor-pointer hover:bg-slate-700"
                    >
                      <option value="" disabled>— Assign Bank —</option>
                      <option value="null">Unassign</option>
                      {financers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {/* Bulk Executive Assign */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">SFE:</span>
                    <select
                      onChange={(e) => handleBulkAssignExecutive(e.target.value)}
                      defaultValue=""
                      className="bg-slate-800 text-white border border-slate-700 py-1 px-2 rounded-lg text-xs outline-none cursor-pointer hover:bg-slate-700"
                    >
                      <option value="" disabled>— Assign SFE —</option>
                      <option value="null">Unassign</option>
                      {executives.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                  </div>
                </>
              )}

              {/* Bulk Status Update */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Status:</span>
                <select
                  onChange={(e) => handleBulkStatusChange(e.target.value)}
                  defaultValue=""
                  className="bg-slate-800 text-white border border-slate-700 py-1 px-2 rounded-lg text-xs outline-none cursor-pointer hover:bg-slate-700"
                >
                  <option value="" disabled>— Set Status —</option>
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Export Selected */}
              <button
                onClick={handleBulkExport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export Selected
              </button>

              <div className="w-[1px] h-4 bg-slate-800" />

              {/* Cancel Selection */}
              <button
                onClick={() => setSelectedLeadIds([])}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Deselect
              </button>
            </>
          )}
        </div>
      )}


    </div>
  );
}
