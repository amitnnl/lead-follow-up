import { Link } from 'react-router-dom';
import {
  Car, Phone, MessageCircle, ArrowRight, User, Building, Sparkles, TrendingUp,
  Clock, ShieldCheck, DollarSign
} from 'lucide-react';
import clsx from 'clsx';

interface Lead {
  id: number;
  lead_id: string;
  customer_name: string;
  customer_mobile: string;
  vehicle_make_model: string;
  loan_amount: number;
  status: string;
  lead_date: string;
  executive_name: string | null;
  agent_name: string | null;
  financer_name: string | null;
  registration_number?: string;
}

interface LeadsKanbanProps {
  leads: Lead[];
  onStatusChange?: (leadId: number, newStatus: string) => void;
}

// ─── Column config ────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'new',
    label: 'New Applications',
    sub: 'Fresh Leads',
    headerText: 'text-blue-700 dark:text-blue-300',
    headerBg: 'bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-transparent dark:from-blue-500/20',
    border: 'border-blue-200 dark:border-blue-500/30',
    topBar: 'bg-gradient-to-r from-blue-500 to-cyan-400',
    badgeBg: 'bg-blue-600 text-white shadow-md shadow-blue-500/30',
    emptyText: 'text-blue-400 dark:text-blue-500',
  },
  {
    id: 'pending',
    label: 'In Verification',
    sub: 'KYC & Credit Check',
    headerText: 'text-amber-700 dark:text-amber-300',
    headerBg: 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-500/20',
    border: 'border-amber-200 dark:border-amber-500/30',
    topBar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    badgeBg: 'bg-amber-600 text-white shadow-md shadow-amber-500/30',
    emptyText: 'text-amber-400 dark:text-amber-500',
  },
  {
    id: 'on_hold',
    label: 'On Hold / Query',
    sub: 'Awaiting Doc/Info',
    headerText: 'text-purple-700 dark:text-purple-300',
    headerBg: 'bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent dark:from-purple-500/20',
    border: 'border-purple-200 dark:border-purple-500/30',
    topBar: 'bg-gradient-to-r from-purple-500 to-pink-500',
    badgeBg: 'bg-purple-600 text-white shadow-md shadow-purple-500/30',
    emptyText: 'text-purple-400 dark:text-purple-500',
  },
  {
    id: 'approved',
    label: 'Sanctioned',
    sub: 'Bank Approved',
    headerText: 'text-emerald-700 dark:text-emerald-300',
    headerBg: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent dark:from-emerald-500/20',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    topBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    badgeBg: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30',
    emptyText: 'text-emerald-400 dark:text-emerald-500',
  },
  {
    id: 'disbursed',
    label: 'Disbursed',
    sub: 'Final Payout Done',
    headerText: 'text-teal-700 dark:text-teal-300',
    headerBg: 'bg-gradient-to-r from-teal-500/15 via-teal-500/5 to-transparent dark:from-teal-500/20',
    border: 'border-teal-200 dark:border-teal-500/30',
    topBar: 'bg-gradient-to-r from-teal-500 to-emerald-400',
    badgeBg: 'bg-teal-600 text-white shadow-md shadow-teal-500/30',
    emptyText: 'text-teal-400 dark:text-teal-500',
  },
];

// ─── Deal Health Score Calculation ────────────────────────────────────────────
function getDealHealthScore(lead: Lead) {
  let score = 30;
  if (lead.loan_amount && lead.loan_amount > 100000) score += 20;
  if (lead.executive_name || lead.agent_name) score += 20;
  if (lead.financer_name && lead.financer_name !== 'Unassigned') score += 20;
  if (lead.status === 'approved') score = 95;
  if (lead.status === 'disbursed') score = 100;
  if (lead.status === 'on_hold') score = Math.min(score, 50);
  if (lead.status === 'rejected') score = 0;
  return Math.min(100, Math.max(0, score));
}

function HealthBar({ score }: { score: number }) {
  const color = score >= 80
    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/30'
    : score >= 50
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm shadow-amber-500/30'
      : 'bg-gradient-to-r from-rose-500 to-red-400 shadow-sm shadow-rose-500/30';
  const textColor = score >= 80
    ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
    : score >= 50
      ? 'text-amber-600 dark:text-amber-400 font-bold'
      : 'text-rose-500 dark:text-rose-400 font-bold';

  return (
    <div className="space-y-1 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          Deal Health Index
        </span>
        <span className={clsx('text-[11px] flex items-center gap-1 font-mono', textColor)}>
          <TrendingUp className="w-3 h-3" /> {score}%
        </span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Modern Kanban Card ────────────────────────────────────────────────────────
function KanbanCard({ lead }: { lead: Lead }) {
  const health = getDealHealthScore(lead);

  return (
    <div className="group relative bg-white dark:bg-[#151c2c] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-xl hover:border-primary-500/50 transition-all duration-300 flex flex-col gap-3.5 transform hover:-translate-y-1 overflow-hidden">
      
      {/* Top Header: Lead ID Badge & Date */}
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/leads/${lead.id}`}
          className="inline-flex items-center gap-1 font-mono text-[11px] font-black tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-500/20 hover:bg-indigo-100 transition-colors"
        >
          {lead.lead_id}
        </Link>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3 text-slate-400" />
          {new Date(lead.lead_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </span>
      </div>

      {/* Customer & Vehicle Info */}
      <div>
        <Link
          to={`/leads/${lead.id}`}
          className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 block truncate leading-snug transition-colors"
        >
          {lead.customer_name}
        </Link>
        <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
          <Car className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{lead.vehicle_make_model || 'Vehicle Not Specified'}</span>
        </div>
      </div>

      {/* Loan Amount Highlight Box */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Loan Req.
        </span>
        <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
          {lead.loan_amount ? `₹ ${Number(lead.loan_amount).toLocaleString('en-IN')}` : '—'}
        </span>
      </div>

      {/* Deal Health Bar */}
      <HealthBar score={health} />

      {/* Assignment Tags */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg px-2 py-1.5 truncate border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Exec</span>
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold truncate" title={lead.executive_name || 'Unassigned'}>
            <User className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate">{lead.executive_name ? lead.executive_name.split(' ')[0] : 'Unassigned'}</span>
          </span>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg px-2 py-1.5 truncate border border-slate-100 dark:border-slate-800">
          <span className="text-[9px] font-bold text-slate-400 block uppercase">Bank</span>
          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-semibold truncate" title={lead.financer_name || 'Pending Bank'}>
            <Building className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">{lead.financer_name ? lead.financer_name.split(' ')[0] : 'No Bank'}</span>
          </span>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {lead.customer_mobile && (
            <a
              href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.customer_name}, regarding your loan file ${lead.lead_id}...`)}`}
              target="_blank" rel="noreferrer"
              className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition-all shadow-sm"
              title="Quick WhatsApp"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          {lead.customer_mobile && (
            <a
              href={`tel:${lead.customer_mobile}`}
              className="p-1.5 rounded-lg text-blue-600 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-600 transition-all shadow-sm"
              title="Quick Call"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <Link
          to={`/leads/${lead.id}`}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 text-xs font-bold transition-all shadow-sm group/btn"
        >
          <span>Examine</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ─── Main Kanban Component ───────────────────────────────────────────────────
export default function LeadsKanban({ leads }: LeadsKanbanProps) {
  const totalLoanValue = leads.reduce((sum, l) => sum + (Number(l.loan_amount) || 0), 0);

  return (
    <div className="space-y-6 select-none animate-fade-in">

      {/* Executive Pipeline Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight flex items-center gap-2">
              Pipeline Stage Progression
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                Live Board
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span>Total Applications: <strong className="text-white font-mono">{leads.length}</strong></span>
              <span className="text-slate-600">·</span>
              <span>Sanction Pipeline Value: <strong className="text-emerald-400 font-mono">₹ {(totalLoanValue / 100000).toFixed(2)} Lakhs</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Auto-Calculated Yield & Commission</span>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5 items-start">
        {COLUMNS.map(col => {
          const colLeads = leads.filter(l => l.status === col.id || (col.id === 'pending' && l.status === 'initiated'));
          const colTotal = colLeads.reduce((sum, l) => sum + (Number(l.loan_amount) || 0), 0);

          return (
            <div
              key={col.id}
              className={`rounded-2xl border bg-slate-50/80 dark:bg-[#111622]/80 backdrop-blur-xs overflow-hidden shadow-md flex flex-col min-h-[520px] transition-all duration-300 ${col.border}`}
            >
              {/* Top Accent Gradient Bar */}
              <div className={`h-1.5 ${col.topBar}`} />

              {/* Column Header */}
              <div className={`px-4 py-3.5 flex items-center justify-between border-b ${col.headerBg} ${col.border}`}>
                <div>
                  <h4 className={`text-sm font-black tracking-tight ${col.headerText}`}>{col.label}</h4>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{col.sub}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-xl text-xs font-black ${col.badgeBg}`}>
                    {colLeads.length}
                  </span>
                  {colTotal > 0 && (
                    <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mt-1">
                      ₹ {colTotal >= 100000 ? `${(colTotal / 100000).toFixed(1)}L` : colTotal.toLocaleString('en-IN')}
                    </div>
                  )}
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-3 space-y-3.5 flex-1 overflow-y-auto max-h-[660px] custom-scrollbar">
                {colLeads.length === 0 ? (
                  <div className={`h-40 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl text-xs font-semibold p-4 text-center gap-2 mt-2 ${col.border} ${col.emptyText}`}>
                    <ShieldCheck className="w-6 h-6 opacity-40" />
                    <span>No applications currently in {col.label}</span>
                  </div>
                ) : (
                  colLeads.map(lead => <KanbanCard key={lead.id} lead={lead} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
