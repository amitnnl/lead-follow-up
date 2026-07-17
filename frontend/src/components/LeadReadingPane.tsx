import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { 
  X, Phone, MessageCircle, AlertTriangle, 
  Send, Clock, ChevronDown, ChevronUp, 
  FileText, Sparkles, User, Building, Car,
  CheckCircle2, TrendingUp, Calendar, Check
} from 'lucide-react';
import clsx from 'clsx';

interface LeadReadingPaneProps {
  leadId: number;
  onClose: () => void;
  onStatusChanged: () => void;
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500', pending: 'bg-amber-500', approved: 'bg-emerald-500',
  disbursed: 'bg-teal-500', on_hold: 'bg-purple-500', rejected: 'bg-rose-500',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'New Lead', pending: 'Pending Verification', approved: 'Approved (Sanctioned)',
  disbursed: 'Disbursed', on_hold: 'On Hold', rejected: 'Rejected',
};

const MAIN_PIPELINE_STAGES = [
  { key: 'new', label: 'New Lead', icon: Sparkles },
  { key: 'pending', label: 'Pending / Doc Check', icon: Clock },
  { key: 'approved', label: 'Sanction Approved', icon: CheckCircle2 },
  { key: 'disbursed', label: 'Disbursed', icon: TrendingUp },
];

const QUICK_NOTES = [
  'Called customer - No answer, will retry.',
  'Requested 6 months bank statement & KYC.',
  'Customer confirmed vehicle registration & price.',
  'Sanction letter dispatched to dealer & client.',
  'Disbursal checks verified with financing desk.'
];

export default function LeadReadingPane({ leadId, onClose, onStatusChanged }: LeadReadingPaneProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [stageFlash, setStageFlash] = useState(false);

  // Form states for Quick Composer
  const [remarks, setRemarks] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/leads/detail?id=${leadId}`);
      setData(response.data);
      const st = response.data.lead.status;
      setNewStatus(st);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [leadId]);

  // One-Click Pipeline Stage Tracker update
  const handleQuickStageUpdate = async (newStageKey: string) => {
    if (!data?.lead) return;
    const currentStatus = data.lead.status;
    if (newStageKey === currentStatus) return;

    // Strict workflow enforcement
    const stageOrder = ['new', 'pending', 'approved', 'disbursed'];
    const currentIdx = stageOrder.indexOf(currentStatus);
    const newIdx = stageOrder.indexOf(newStageKey);

    if (currentIdx !== -1 && newIdx !== -1) {
      if (newIdx > currentIdx + 1) {
        alert('Invalid Transition: You must follow the exact pipeline order (New → Pending → Approved → Disbursed). You cannot skip stages.');
        return;
      }
    }

    if (newStageKey === 'approved' && data.lead.agent_id) {
      if (!data.lead.agent_kyc_verified || !data.lead.agent_bank_verified) {
        alert('Action Blocked: This lead belongs to an Agent/DSA whose KYC or Bank details are not yet verified. Please verify agent documents first.');
        return;
      }
    }

    if (newStageKey === 'on_hold' || newStageKey === 'rejected') {
      const reason = window.prompt(`Please provide a mandatory reason for moving this lead to ${newStageKey.toUpperCase()}:`);
      if (!reason || !reason.trim()) {
        alert('Action cancelled: A valid reason is required.');
        return;
      }
      try {
        setStageFlash(true);
        await api.post('/followups/add', {
          lead_id: leadId,
          remarks: `[${newStageKey.toUpperCase()}] ${reason.trim()}`,
          status: newStageKey
        });
        await fetchDetails();
        onStatusChanged();
        setTimeout(() => setStageFlash(false), 1200);
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to update stage');
      }
      return;
    }

    if (newStageKey === 'disbursed') {
      const confirmDisburse = window.confirm('Advancing to Disbursed completes this lead. Make sure all KYC and bank records are verified. Proceed?');
      if (!confirmDisburse) return;
    }

    try {
      setStageFlash(true);
      await api.post('/followups/add', {
        lead_id: leadId,
        remarks: `[Pipeline Stage Advanced] Status transitioned to ${newStageKey.toUpperCase()} via interactive stage tracker.`,
        status: newStageKey
      });
      await fetchDetails();
      onStatusChanged();
      setTimeout(() => setStageFlash(false), 1200);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update stage');
    }
  };

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim()) {
      alert('Please enter follow-up notes or click one of the Quick-Insert chips above.');
      return;
    }
    
    if (newStatus === 'disbursed') {
      alert('Disbursing a lead requires complete KYC verification and banking documentation. Please open this lead in Full Dossier view to upload verified files.');
      return;
    }

    const stageOrder = ['new', 'pending', 'approved', 'disbursed'];
    const currentIdx = stageOrder.indexOf(data?.lead?.status || 'new');
    const newIdx = stageOrder.indexOf(newStatus);

    if (currentIdx !== -1 && newIdx !== -1) {
      if (newIdx > currentIdx + 1) {
        alert('Invalid Transition: You must follow the exact pipeline order (New → Pending → Approved → Disbursed).');
        return;
      }
    }

    if (newStatus === 'approved' && data?.lead?.agent_id) {
      if (!data.lead.agent_kyc_verified || !data.lead.agent_bank_verified) {
        alert('Action Blocked: This lead belongs to an Agent/DSA whose KYC or Bank details are not yet verified. Please verify agent documents first.');
        return;
      }
    }

    // Next Action Requirement Protection
    if (!nextDate && newStatus !== 'disbursed' && newStatus !== 'rejected') {
      const confirmNoDate = window.confirm('No Next Action Date selected! It is recommended to schedule a follow-up date unless this lead is closed. Continue without a date?');
      if (!confirmNoDate) return;
    }

    setSubmitting(true);
    try {
      await api.post('/followups/add', {
        lead_id: leadId,
        remarks,
        next_followup_date: nextDate || null,
        status: newStatus
      });
      setRemarks('');
      setNextDate('');
      await fetchDetails();
      onStatusChanged();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add follow-up remarks');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Date presets
  const setPresetDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNextDate(d.toISOString().split('T')[0]);
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40">
        <div className="relative w-12 h-12 mb-3">
          <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-t-blue-600 animate-spin" />
        </div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Lead Dossier...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 text-center">
        <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-2xl flex items-center justify-center mb-3">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Error Loading Details</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">{error || 'Lead details are unavailable.'}</p>
      </div>
    );
  }

  const { lead, history = [] } = data;
  const statusLabel = STATUS_LABEL[lead.status] || lead.status;
  const statusDot = STATUS_DOT[lead.status] || 'bg-slate-400';

  // Check overdue status
  const isOverdue = lead.next_followup_date && new Date(lead.next_followup_date) < new Date() && lead.status !== 'disbursed' && lead.status !== 'rejected';

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#111622] border-l border-slate-200/80 dark:border-slate-800 animate-fade-in relative overflow-y-auto custom-scrollbar">
      
      {/* ── Dossier Header Bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 transition cursor-pointer shrink-0"
            title="Close Dossier"
          >
            <X className="w-4.5 h-4.5" />
          </button>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

          {/* Customer & Status Badge */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-extrabold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-700/40 shrink-0">
                {lead.lead_id}
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 truncate">
                <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
                <span className="truncate">{statusLabel}</span>
              </span>
              {isOverdue && (
                <span className="bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 text-[10px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                </span>
              )}
            </div>
            <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block truncate">
              {lead.customer_name}
            </span>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {lead.customer_mobile && (
            <a 
              href={`tel:${lead.customer_mobile}`} 
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 text-xs font-bold"
              title="Call Customer"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Call</span>
            </a>
          )}
          
          {lead.customer_mobile && (
            <a 
              href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl transition bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1 text-xs font-bold"
              title="WhatsApp Customer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">WhatsApp</span>
            </a>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Full screen */}
          <Link 
            to={`/leads/${lead.id}`}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Open Full Dossier Page"
          >
            <span>Full Dossier →</span>
          </Link>
        </div>
      </div>

      {/* ── Interactive Pipeline Stage Tracker Bar ── */}
      <div className="bg-slate-100/80 dark:bg-slate-900/80 px-5 py-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Pipeline Progression</span>
            {stageFlash && <span className="text-emerald-600 dark:text-emerald-400 animate-fade-in font-bold">✓ Stage Updated</span>}
          </span>
          <div className="flex items-center gap-1">
            {['on_hold', 'rejected'].map((altStage) => (
              <button
                key={altStage}
                onClick={() => handleQuickStageUpdate(altStage)}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border',
                  lead.status === altStage
                    ? altStage === 'on_hold' ? 'bg-purple-600 text-white border-purple-600' : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                )}
              >
                {altStage === 'on_hold' ? '⏸️ On Hold' : '❌ Reject'}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Connected Chevrons */}
        <div className="grid grid-cols-4 gap-1.5">
          {MAIN_PIPELINE_STAGES.map((s, idx) => {
            const isCurrent = lead.status === s.key;
            const Icon = s.icon;
            const isPast = MAIN_PIPELINE_STAGES.findIndex(item => item.key === lead.status) > idx && !['on_hold', 'rejected'].includes(lead.status);

            return (
              <button
                key={s.key}
                onClick={() => handleQuickStageUpdate(s.key)}
                className={clsx(
                  'flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors border cursor-pointer',
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : isPast
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                )}
                title={`Click to switch stage to ${s.label}`}
              >
                {isPast ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <Icon className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Top-Level Action Composer (No Scrolling Needed!) ── */}
      <div className="p-5 bg-blue-50/40 dark:bg-slate-900/40 border-b border-slate-200/90 dark:border-slate-800 space-y-3">
        <form onSubmit={handleAddFollowup} className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
              <span>Log Follow-Up & Next Step</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400">Protects against forgotten reminders</span>
          </div>

          {/* Quick Note Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {QUICK_NOTES.map((qNote, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setRemarks(prev => prev ? `${prev} ${qNote}` : qNote)}
                className="text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/90 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 transition cursor-pointer shadow-2xs"
              >
                + {qNote}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Record follow-up remarks, verification progress, or customer agreement terms..."
            className="w-full text-xs p-3 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-[#162230] resize-none min-h-[4rem] text-slate-800 dark:text-slate-100 outline-none transition font-medium shadow-inner"
          />

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
            <div className="flex flex-wrap items-center gap-3">
              {/* Stage Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>Stage:</span>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="h-8 text-xs py-1 px-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#162230] text-slate-800 dark:text-white font-semibold outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
                >
                  <option value="new">New</option>
                  <option value="pending">Pending Verification</option>
                  <option value="approved">Approved (Sanctioned)</option>
                  <option value="disbursed">Disbursed</option>
                  <option value="on_hold">On Hold</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Next Followup Date + Quick Presets */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Next Date:</span>
                <input
                  type="date"
                  value={nextDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="h-8 text-xs py-1 px-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-[#162230] text-slate-800 dark:text-white font-mono font-bold outline-none focus:border-blue-500 w-36 shadow-2xs"
                />
                <div className="flex items-center gap-1 ml-0.5">
                  {[
                    { label: 'Tomorrow', days: 1 },
                    { label: '+3d', days: 3 },
                    { label: '+1w', days: 7 }
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setPresetDate(p.days)}
                      className="px-2 py-1 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md shadow-blue-600/25 ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Note & Set Reminder'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Collapsible Parameters Card & Timeline ── */}
      <div className="p-5 space-y-5">
        
        {/* Customer & Vehicle Specs Card */}
        <div className="border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs bg-white dark:bg-[#162230]">
          <div 
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="bg-slate-50 dark:bg-slate-900/60 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-white">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Application Parameters & Assigned Team</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">{isDetailsExpanded ? 'Hide Specs' : 'Show Specs'}</span>
              {isDetailsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>

          {isDetailsExpanded && (
            <div className="p-4.5 bg-white dark:bg-slate-900/20 grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4 border-t border-slate-100 dark:border-slate-800 text-xs animate-fade-in">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Mobile Contact</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lead.customer_mobile}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Loan Sanction Req.</span>
                <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(lead.loan_amount)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Vehicle Condition</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${lead.vehicle_condition === 'new' ? 'bg-violet-500' : 'bg-amber-500'}`} />
                  {lead.vehicle_condition || 'New'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Make & Model</span>
                <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{lead.vehicle_make_model || '—'}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Registration No.</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{lead.registration_number || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Application Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(lead.created_at || lead.lead_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Source / Partner</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{lead.agent_name || 'Direct / Org Team'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Mapped Bank</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="truncate">{lead.financer_name || 'Unassigned Bank'}</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block tracking-wider mb-0.5">Field Executive</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{lead.executive_name || 'Unassigned'}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Follow-up History Audit Trail ── */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Communication History & Audit Trail
            </h4>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md font-bold border border-slate-200/80 dark:border-slate-700">
              {history.length} Logs
            </span>
          </div>
          
          {history.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2 bg-slate-50/50 dark:bg-slate-900/20">
              <Sparkles className="w-6 h-6 mx-auto text-blue-400 opacity-60" />
              <p className="font-semibold">No follow-up notes recorded yet.</p>
              <p className="text-[11px] text-slate-400">Use the Quick Composer above to log your first interaction!</p>
            </div>
          ) : (
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {history.map((h: any, index: number) => {
                const creator = h.created_by_name || 'System';
                const timeStr = new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={h.id || index} className="relative pl-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-sm transition">
                    {/* Left Timeline Node */}
                    <div className="absolute left-1.5 top-4 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900">
                    </div>

                    <div className="flex items-baseline justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2">
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        {creator}
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                          Log Entry
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">{timeStr}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-medium">{h.remarks}</p>

                    {/* Status transition badge */}
                    {h.status && (
                      <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span>Status Transition:</span>
                        <span className="font-extrabold uppercase text-blue-600 dark:text-blue-400">
                          {STATUS_LABEL[h.status] || h.status}
                        </span>
                      </div>
                    )}

                    {/* Next Action Date info */}
                    {h.next_followup_date && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50/60 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-200/50 dark:border-blue-800/40">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Next Action Reminder: {new Date(h.next_followup_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
