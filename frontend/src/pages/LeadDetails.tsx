import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/axios';
import {
  ArrowLeft, PhoneCall, MessageCircle, FileText,
  Clock, CheckCircle, XCircle, Building,
  Edit, Trash2, Printer, RefreshCw, ShieldAlert,
  User, ChevronRight, AlertTriangle, TrendingUp, Download, Calendar, Banknote,
  Shield, Info, CircleDot, BadgeCheck, List, Users, Plus, X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import NewLeadModal from '../components/NewLeadModal';
import AssignmentModal from '../components/AssignmentModal';
import PragmaticLeadDocuments from '../components/documents/PragmaticLeadDocuments';
import clsx from 'clsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500', pending: 'bg-amber-500', approved: 'bg-emerald-500',
  disbursed: 'bg-teal-500', on_hold: 'bg-purple-500', rejected: 'bg-rose-500',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'New', pending: 'Pending', approved: 'Approved',
  disbursed: 'Disbursed', on_hold: 'On Hold', rejected: 'Rejected',
};

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) {
  const sbClass = `sb-${status.replace('_hold', '_hold')}`;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : size === 'lg' ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1';
  const dot = STATUS_DOT[status] || 'bg-slate-400';
  const label = STATUS_LABEL[status] || status.replace('_', ' ');
  return (
    <span className={clsx('inline-flex items-center gap-1.5 font-semibold rounded-full border', sbClass || 'sb-default', sizeClasses)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} />
      {label}
    </span>
  );
}

// Keep getStatusConfig for audit log color-coding only
function getStatusConfig(status: string) {
  const sbClass = `sb-${status}`;
  const dot = STATUS_DOT[status] || 'bg-slate-400';
  const label = STATUS_LABEL[status] || status.replace('_', ' ');
  return { label, dot, sbClass };
}

function InfoRow({ label, value, mono = false, accent = false }: { label: string; value: React.ReactNode; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
      <span className={clsx('text-[13px] font-semibold text-slate-800 dark:text-slate-100', mono && 'font-mono', accent && 'text-emerald-600 dark:text-emerald-400 text-base')}>
        {value || <span className="text-slate-300 dark:text-slate-600 font-normal">—</span>}
      </span>
    </div>
  );
}

function AvatarChip({ name, sub, color = 'indigo' }: { name: string; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  };
  return (
    <div className="flex items-center gap-2.5">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0', colorMap[color] ?? colorMap.slate)}>
        {getInitials(name)}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">{name}</p>
        {sub && <p className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [showWhatsAppTemplates, setShowWhatsAppTemplates] = useState(false);

  // Assignment form state
  const [financers, setFinancers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({
    assigned_date: '',
    financer_id: '',
    executive_id: '',
  });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  const [quickAddType, setQuickAddType] = useState<'financer' | 'executive' | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddMobile, setQuickAddMobile] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName) return;
    setQuickAddLoading(true);
    try {
      if (quickAddType === 'financer') {
        const res = await api.post('/setup/financers', { name: quickAddName, is_active: 1 });
        const newId = res.data?.id;
        const listRes = await api.get('/setup/financers');
        setFinancers(listRes.data.financers || []);
        if (newId) {
          setAssignForm(prev => ({ ...prev, financer_id: newId.toString(), executive_id: '' }));
        }
      } else if (quickAddType === 'executive') {
        const payload: any = { name: quickAddName, mobile: quickAddMobile, is_active: 1 };
        if (assignForm.financer_id) {
          payload.financer_id = assignForm.financer_id;
        }
        const res = await api.post('/setup/executives', payload);
        const newId = res.data?.id;
        const listRes = await api.get('/setup/executives');
        setExecutives(listRes.data.executives || []);
        if (newId) {
          setAssignForm(prev => ({ ...prev, executive_id: newId.toString() }));
        }
      }
      setQuickAddType(null);
      setQuickAddName('');
      setQuickAddMobile('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to quick add');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const activeTab = searchParams.get('tab') || 'overview';

  // Followup form state
  const [remarks, setRemarks] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Inline Disbursal documents & bank details
  const [disburseDocs, setDisburseDocs] = useState<Record<string, File | null>>({
    aadhaar: null, pan: null, bank_statement: null, other: null, rc: null, insurance: null
  });
  const [bankDetails, setBankDetails] = useState({
    customer_bank_name: '', customer_account_number: '', customer_ifsc_code: ''
  });
  const [insuranceDetails, setInsuranceDetails] = useState({
    insurance_company: '', policy_number: '', insurance_expiry_date: ''
  });

  const handleDisburseDocChange = (type: string, file: File | null) => {
    setDisburseDocs(prev => ({ ...prev, [type]: file }));
  };

  const [disburseFinalAmount, setDisburseFinalAmount] = useState('');
  const [disburseTenure, setDisburseTenure] = useState('');
  const [disburseRoi, setDisburseRoi] = useState('');

  const handleUploadDocumentPragmatic = async (category: string, docType: string, file: File, expiryDate?: string) => {
    if (!data?.lead?.id) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('lead_id', data.lead.id.toString());
    formData.append('category', category);
    formData.append('document_type', docType);
    formData.append('file', file);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    try {
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchLeadDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyDoc = async (docId: number, status: 'verified' | 'rejected') => {
    try {
      await api.post('/documents/verify', { id: docId, status });
      fetchLeadDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update document status');
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    if (!window.confirm('Are you sure you want to remove / archive this document?')) return;
    try {
      await api.delete(`/documents/delete?id=${docId}`);
      fetchLeadDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to archive document');
    }
  };

  const canVerifyDocs = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const fetchLeadDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/leads/detail?id=${id}`);
      setData(response.data);
      const st = response.data.lead.status;
      setNewStatus(st === 'new' ? 'pending' : st);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch lead details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeadDetails(); }, [id]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'staff') {
      Promise.all([
        api.get('/setup/financers'),
        api.get('/setup/executives')
      ]).then(([financersRes, execsRes]) => {
        setFinancers(financersRes.data.financers || []);
        setExecutives(execsRes.data.executives || []);
      }).catch(err => console.error("Failed to load assignment dropdowns", err));
    }
  }, [user]);

  useEffect(() => {
    if (data?.lead) {
      setAssignForm({
        assigned_date: data.lead.assigned_date || new Date().toISOString().split('T')[0],
        financer_id: data.lead.financer_id?.toString() || '',
        executive_id: data.lead.executive_id?.toString() || '',
      });
    }
  }, [data]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignSaving(true);
    setAssignError('');
    setAssignSuccess(false);
    try {
      await api.put('/leads?action=assign', {
        id: data?.lead?.id,
        assigned_date: assignForm.assigned_date,
        financer_id: assignForm.financer_id ? parseInt(assignForm.financer_id) : null,
        executive_id: assignForm.executive_id ? parseInt(assignForm.executive_id) : null,
      });
      setAssignSuccess(true);
      fetchLeadDetails();
    } catch (err: any) {
      setAssignError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setAssignSaving(false);
    }
  };

  const handleTabChange = (tab: string) => setSearchParams({ tab });

  const handleAddFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newStatus === 'disbursed') {
        const formData = new FormData();
        formData.append('lead_id', data?.lead.id);
        formData.append('remarks', remarks);
        formData.append('next_followup_date', nextDate);
        formData.append('status', newStatus);
        Object.entries(disburseDocs).forEach(([key, file]) => { if (file) formData.append(`disburse_docs[${key}]`, file); });
        formData.append('customer_bank_name', bankDetails.customer_bank_name || data?.lead.customer_bank_name || '');
        formData.append('customer_account_number', bankDetails.customer_account_number || data?.lead.customer_account_number || '');
        formData.append('customer_ifsc_code', bankDetails.customer_ifsc_code || data?.lead.customer_ifsc_code || '');
        formData.append('insurance_company', insuranceDetails.insurance_company || data?.lead.insurance_company || '');
        formData.append('policy_number', insuranceDetails.policy_number || data?.lead.policy_number || '');
        formData.append('insurance_expiry_date', insuranceDetails.insurance_expiry_date || data?.lead.insurance_expiry_date || '');
        formData.append('final_loan_amount', disburseFinalAmount);
        formData.append('tenure_months', disburseTenure);
        formData.append('roi', disburseRoi);
        await api.post('/followups/add', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        navigate('/leads?status=disbursed');
        return;
      } else {
        await api.post('/followups/add', { lead_id: data?.lead.id, remarks, next_followup_date: nextDate, status: newStatus });
      }
      setRemarks('');
      setNextDate('');
      setDisburseDocs({ aadhaar: null, pan: null, bank_statement: null, other: null, rc: null, insurance: null });
      setDisburseFinalAmount('');
      setDisburseTenure('');
      setDisburseRoi('');
      fetchLeadDetails();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add follow-up');
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to completely delete this lead? This cannot be undone.')) {
      try {
        await api.delete(`/leads?id=${data.lead.id}`);
        navigate('/leads');
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete lead');
      }
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin" />
      </div>
      <p className="text-sm text-slate-400 font-medium">Loading lead details…</p>
    </div>
  );
  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-80 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-rose-500" />
      </div>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">Failed to Load Lead</p>
      <p className="text-sm text-slate-400">{error}</p>
    </div>
  );

  // ── Data ────────────────────────────────────────────────────────────────────
  const { lead, followups, documents, logs } = data;


  const getDocUrl = (filePath: string) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
    const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    return import.meta.env.PROD ? `/backend/${cleanPath}` : `http://localhost/lead-follow-up/backend/${cleanPath}`;
  };

  const handleLogInteraction = async (type: string) => {
    try {
      await api.post('/leads/log_interaction', { lead_id: lead.id, type });
      fetchLeadDetails();
    } catch (err) { console.error('Failed to log interaction', err); }
  };

  const handleDownloadDocs = async () => {
    try {
      const response = await api.get(`/leads/download_docs?id=${lead.id}`, {
        responseType: 'blob', // Important for handling binary file download
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${lead.lead_id}_documents.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download documents. Make sure documents exist for this lead.');
    }
  };

  // Stepper config
  const STAGES = ['new', 'pending', 'approved', 'disbursed'] as const;
  const STAGE_META: Record<string, { label: string; sub: string; icon: React.ElementType }> = {
    new:       { label: 'New',       sub: 'Lead Created',      icon: CircleDot },
    pending:   { label: 'Pending',   sub: 'KYC & Bank',        icon: FileText },
    approved:  { label: 'Approved',  sub: 'Sanctioned',        icon: BadgeCheck },
    disbursed: { label: 'Disbursed', sub: 'Payouts Done',      icon: Banknote },
  };
  const isTerminal = lead.status === 'rejected' || lead.status === 'on_hold';
  const currentStageIdx = STAGES.indexOf(
    isTerminal ? 'pending' : (STAGES.includes(lead.status) ? lead.status : 'new')
  );

  // Overdue follow-up
  const latestFollowup = followups?.[0];
  const isOverdue = latestFollowup?.next_followup_date &&
    new Date(latestFollowup.next_followup_date) < new Date() &&
    lead.status !== 'disbursed';

  // Tabs
  const tabs = [
    { id: 'overview',   icon: List,         label: 'Overview' },
    ...(lead?.status !== 'disbursed' && (user?.role === 'admin' || user?.role === 'staff') ? [{ id: 'assignment', icon: Users, label: 'Assign Lead' }] : []),
    { id: 'documents',  icon: FileText,     label: 'Documents' },
    { id: 'followups',  icon: MessageCircle, label: 'Follow-ups', badge: isOverdue ? '!' : null },

    { id: 'logs',       icon: Clock,        label: 'Audit Logs' },
  ].filter(t => !(t.id === 'documents' && user?.role === 'staff'));

  // Follow-up status dot color
  const followupDotColor: Record<string, string> = {
    approved:  'bg-emerald-500',
    disbursed: 'bg-teal-500',
    pending:   'bg-amber-500',
    rejected:  'bg-rose-500',
    on_hold:   'bg-purple-500',
    reassign:  'bg-slate-400',
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-20 animate-fade-in select-none">

      {/* ── Dynamic, Ink-Saving Print-Only Voucher (Fits exactly on 1 Page) ── */}
      <div className="hidden print:block w-full text-black font-sans bg-white p-2 text-xs leading-tight">
        
        {/* Header Block */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-black">
          <div className="text-left">
            <h2 className="text-lg font-black uppercase tracking-tight">{settings.company_name}</h2>
            <p className="text-[10px] text-slate-700 font-mono mt-0.5">{settings.office_address}</p>
            <p className="text-[10px] text-slate-700 font-mono">Phone: {settings.contact_number} | Email: {settings.support_email}</p>
          </div>
          <div className="text-right">
            <div className="border border-black px-2.5 py-1 text-center rounded">
              <span className="text-[9px] uppercase font-bold block tracking-wider">Voucher Ref No.</span>
              <span className="font-mono font-bold text-sm">{lead.lead_id}</span>
            </div>
            <span className="text-[9px] font-mono block mt-1">Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Title */}
        <div className="bg-slate-100 p-2 text-center rounded border border-slate-300 mb-4">
          <h1 className="text-sm font-black uppercase tracking-widest">VEHICLE LOAN SANCTION & COMMISSION VOUCHER</h1>
        </div>

        {/* Section 1: Customer & Vehicle Information */}
        <div className="mb-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">I. SOURCING & VEHICLE DETAILS</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Customer Name</span>
              <span className="font-bold text-sm text-slate-900">{lead.customer_name}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Customer Mobile</span>
              <span className="font-mono text-xs">{lead.customer_mobile}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Vehicle Make & Model</span>
              <span className="font-bold text-xs">{lead.vehicle_make_model || '—'}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Registration / Condition</span>
              <span className="text-xs uppercase font-bold">
                {lead.registration_number || '—'} · ({lead.vehicle_condition === 'new' ? 'New' : 'Used'})
              </span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Assigned Financer (Bank)</span>
              <span className="text-xs font-semibold">{lead.financer_name || '—'}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Sourced Dealer</span>
              <span className="text-xs font-semibold">{lead.dealer_name || '—'}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Loan Parameters */}
        <div className="mb-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">II. SANCTIONED LOAN DETAILS</h3>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Loan Amount</span>
              <span className="font-bold text-sm text-emerald-700">₹{lead.loan_amount ? Number(lead.loan_amount).toLocaleString('en-IN') : '0'}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Interest Rate (IRR)</span>
              <span className="font-mono text-xs font-bold">{lead.irr_rate ? `${lead.irr_rate}% p.a.` : '—'}</span>
            </div>
            <div>
              <span className="font-semibold block text-slate-500 uppercase text-[9px]">Tenure Months</span>
              <span className="font-mono text-xs font-bold">{lead.tenure_months ? `${lead.tenure_months} Months` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Commission Breakdown & Settlements */}
        <div className="mb-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">III. COMMISSION & PAYOUT SETTLEMENT</h3>
          
          <table className="w-full text-xs text-left border border-slate-200 mt-2">
            <thead>
              <tr className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-2 border-r border-slate-200 font-bold">Line Items</th>
                <th className="p-2 border-r border-slate-200 text-right font-bold">Calculation Rule</th>
                <th className="p-2 text-right font-bold">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="p-2 border-r border-slate-200 text-slate-700 font-sans">Gross Sourced Value</td>
                <td className="p-2 border-r border-slate-200 text-right text-slate-500 font-sans">1.00% of Sourced Loan</td>
                <td className="p-2 text-right font-bold text-slate-800">
                  ₹{(Number(lead.loan_amount || 0) * 0.01).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-200 text-slate-700 font-sans font-bold">DSA Agent Commission Share</td>
                <td className="p-2 border-r border-slate-200 text-right text-slate-500 font-sans">90% of Gross Value</td>
                <td className="p-2 text-right font-black text-indigo-700">
                  ₹{(Number(lead.loan_amount || 0) * 0.009).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-200 text-slate-700 font-sans">TDS Withheld (194H)</td>
                <td className="p-2 border-r border-slate-200 text-right text-slate-500 font-sans">5.00% of DSA Share</td>
                <td className="p-2 text-right text-slate-700">
                  - ₹{(Number(lead.loan_amount || 0) * 0.009 * 0.05).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="p-2 border-r border-slate-200 text-slate-900 font-sans">Net Payable to DSA Agent</td>
                <td className="p-2 border-r border-slate-200 text-right text-slate-950 font-sans">95.00% of DSA Share</td>
                <td className="p-2 text-right font-extrabold text-slate-900 text-sm">
                  ₹{(Number(lead.loan_amount || 0) * 0.009 * 0.95).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-200 text-slate-700 font-sans">Organization Profit Share</td>
                <td className="p-2 border-r border-slate-200 text-right text-slate-500 font-sans">10% of Gross Value</td>
                <td className="p-2 text-right text-slate-700">
                  ₹{(Number(lead.loan_amount || 0) * 0.001).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: Signatures */}
        <div className="mt-8 pt-6 border-t border-dashed border-slate-400">
          <div className="grid grid-cols-3 gap-8 text-center text-[10px] font-bold uppercase tracking-wider text-slate-800">
            <div>
              <div className="border-b border-black h-8 mb-1.5" />
              <span>DSA Agent Signature</span>
            </div>
            <div>
              <div className="border-b border-black h-8 mb-1.5" />
              <span>Prepared / Checked By</span>
            </div>
            <div>
              <div className="border-b border-black h-8 mb-1.5" />
              <span>Authorized Bank Signatory</span>
            </div>
          </div>
        </div>

        {/* Eco-Friendly Warning */}
        <div className="mt-8 flex justify-between items-center text-[9px] text-slate-500 font-mono uppercase tracking-wide border-t border-slate-200 pt-2">
          <span>♻️ Eco-Print Layout (Fits exactly on one A4 page to save ink & paper)</span>
          <span>Sourced via: {lead.referred_by || 'Direct DSA'}</span>
        </div>

      </div>

      {/* ── Breadcrumb ── */}
      <div className="no-print flex items-center gap-2 text-sm text-slate-400">
        <button onClick={() => navigate('/leads')} className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Leads
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{lead.lead_id}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-[200px]">{lead.customer_name}</span>
      </div>

      {/* ══════════════════════════════════════════════════════════
          HERO HEADER CARD
      ══════════════════════════════════════════════════════════ */}
      <div className="no-print bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Top gradient strip */}
        <div className="h-1.5 bg-gradient-to-r from-primary-600 via-indigo-600 to-emerald-500" />

        <div className="p-6 lg:p-7">
          {/* Row 1: Avatar + Info + Badges + Actions */}
          <div className="flex flex-col lg:flex-row gap-5">

            {/* Avatar + primary info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-primary-500/25">
                {getInitials(lead.customer_name)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{lead.customer_name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 px-2 py-0.5 rounded">
                    {lead.lead_id}
                  </span>
                  <StatusBadge status={lead.status} size="md" />
                  <span className={clsx(
                    'text-[11px] font-semibold px-2 py-0.5 rounded border',
                    lead.vehicle_condition === 'new'
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                  )}>
                    {lead.vehicle_condition === 'new' ? '✨ New Vehicle' : '🚗 Used Vehicle'}
                  </span>
                  {lead.loan_type && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {lead.loan_type.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created on <span className="font-medium text-slate-500 dark:text-slate-400">{lead.lead_date}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-start gap-2 shrink-0">
              <a
                href={`tel:${lead.customer_mobile}`}
                onClick={() => handleLogInteraction('Call')}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call
              </a>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppTemplates(!showWhatsAppTemplates)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp ▾
                </button>
                {showWhatsAppTemplates && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 space-y-1 text-[11px] animate-in fade-in slide-in-from-top-1 text-left">
                    {[
                      {
                        label: 'Standard Follow-up',
                        text: `Hi ${lead.customer_name}, following up regarding your vehicle loan file (${lead.lead_id}). Let us know if you need any assistance.`
                      },
                      {
                        label: 'Request Missing KYC',
                        text: `Hi ${lead.customer_name}, please share or upload your Aadhaar Card, PAN Card, and Bank Statement so we can process your vehicle loan (${lead.lead_id}) for approval.`
                      },
                      {
                        label: 'Loan Approved Alert 🎉',
                        text: `Hi ${lead.customer_name}, congratulations! Your vehicle loan application (${lead.lead_id}) has been approved. We are finalizing the disbursal.`
                      }
                    ].map((t, idx) => (
                      <a
                        key={idx}
                        href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g, '')}?text=${encodeURIComponent(t.text)}`}
                        onClick={() => {
                          handleLogInteraction('WhatsApp');
                          setShowWhatsAppTemplates(false);
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-left px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {t.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              {isAdminOrManager && lead.status !== 'disbursed' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
              )}
              {isAdminOrManager && (
                <button
                  onClick={handleDownloadDocs}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Docs
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              {lead.status === 'rejected' && (user?.role === 'admin' || user?.role === 'staff') && (
                <button
                  onClick={() => setSearchParams({ tab: 'assignment' })}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer animate-pulse"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-Assign
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Quick info grid */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-5">
            <InfoRow label="Mobile" value={lead.customer_mobile} mono />
            <InfoRow label="Vehicle" value={lead.vehicle_make_model} />
            <InfoRow label="Loan Amount" value={lead.loan_amount ? `₹${Number(lead.loan_amount).toLocaleString('en-IN')}` : null} accent />
            <InfoRow label="Bank Executive" value={lead.executive_name || 'Unassigned'} />
            {lead.registration_number && <InfoRow label="Registration No." value={lead.registration_number} mono />}
            {lead.insurance_company && (
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Insurance Policy</span>
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {lead.insurance_company} · <span className="font-mono">{lead.policy_number || '—'}</span>
                  {lead.insurance_expiry_date && <span className="text-slate-400 font-normal"> · Exp: {lead.insurance_expiry_date}</span>}
                </span>
              </div>
            )}
          </div>

          {/* Row 3: Final Disbursed Amt */}
          {lead.status === 'disbursed' && lead.final_loan_amount && (
            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-xl">
              <InfoRow label="Final Disbursed Amt" value={<span className="text-emerald-700 dark:text-emerald-400 font-bold">₹{parseFloat(lead.final_loan_amount).toLocaleString()}</span>} />
              <InfoRow label="Tenure (Months)" value={lead.tenure_months} mono />
              <InfoRow label="ROI (%)" value={`${lead.roi}%`} mono />
              {lead.payout_amount && <InfoRow label="Agent Payout" value={<span className="text-indigo-600 dark:text-indigo-400 font-bold">₹{parseFloat(lead.payout_amount).toLocaleString()}</span>} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Automated Sanction / Disbursal Certificate & WhatsApp Dispatch Card ── */}
      {(lead.status === 'approved' || lead.status === 'disbursed') && (
        <div className="no-print card p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <BadgeCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
                  {lead.status === 'disbursed' ? 'Disbursal Verified' : 'Sanction Approved'}
                </span>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight">
                  {lead.status === 'disbursed' ? 'Official Loan Disbursal Certificate Ready' : 'Official Loan Sanction Letter Ready'}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lead.status === 'disbursed'
                  ? `Loan of ₹${Number(lead.loan_amount).toLocaleString('en-IN')} has been disbursed. Dispatch official certificate directly to the customer via WhatsApp.`
                  : `Loan of ₹${Number(lead.loan_amount).toLocaleString('en-IN')} is approved. Send instant sanction alert or download printable official letter.`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
            <a
              href={`https://wa.me/91${lead.customer_mobile.replace(/\D/g, '')}?text=${encodeURIComponent(
                lead.status === 'disbursed'
                  ? `🎉 Congratulations ${lead.customer_name}! Your vehicle loan (File: ${lead.lead_id}) for ₹${Number(lead.loan_amount).toLocaleString('en-IN')} has been officially disbursed. Thank you for choosing us!`
                  : `🎉 Great news ${lead.customer_name}! Your vehicle loan application (File: ${lead.lead_id}) for ₹${Number(lead.loan_amount).toLocaleString('en-IN')} has been APPROVED and sanctioned. Our team will contact you shortly for disbursal signatures.`
              )}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => handleLogInteraction('WhatsApp Notification')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send WhatsApp Alert</span>
            </a>
            <a
              href={`http://localhost/lead-follow-up/backend/api/sanction_pdf.php?id=${lead.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer border border-slate-700 dark:border-slate-300"
            >
              <FileText className="w-4 h-4" />
              <span>{lead.status === 'disbursed' ? 'View Disbursal Certificate' : 'View Sanction Letter'}</span>
            </a>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          CONNECTED STATUS STEPPER
      ══════════════════════════════════════════════════════════ */}
      <div className="no-print card p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Lead Lifecycle
          </span>
          {isTerminal && (
            <span className={clsx(
              'text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5',
              lead.status === 'rejected'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
            )}>
              <AlertTriangle className="w-3 h-3" />
              Currently {lead.status.replace('_', ' ').toUpperCase()}
            </span>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center">
          {STAGES.map((stage, idx) => {
            const meta = STAGE_META[stage];
            const Icon = meta.icon;
            const isPassed = !isTerminal && currentStageIdx > idx;
            const isCurrent = currentStageIdx === idx && !isTerminal;

            return (
              <React.Fragment key={stage}>
                <div className="flex flex-col items-center text-center gap-2 flex-shrink-0 timeline-node">
                  {/* Circle */}
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 relative',
                    isPassed
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : isCurrent
                        ? 'bg-primary-600 text-white ring-4 ring-primary-500/20 shadow-md shadow-primary-500/30'
                        : isTerminal && idx === currentStageIdx
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  )}>
                    {isPassed
                      ? <CheckCircle className="w-[18px] h-[18px]" />
                      : <Icon className="w-4 h-4" />
                    }
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping" />
                    )}
                  </div>
                  {/* Labels */}
                  <div>
                    <p className={clsx(
                      'text-[11px] font-bold capitalize',
                      isPassed ? 'text-emerald-600 dark:text-emerald-400'
                        : isCurrent ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                    )}>{meta.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 hidden sm:block">{meta.sub}</p>
                  </div>
                </div>

                {/* Connector line */}
                {idx < STAGES.length - 1 && (
                  <div className={clsx(
                    'flex-1 h-0.5 mx-2 rounded-full transition-all duration-500',
                    isPassed ? 'bg-emerald-400 dark:bg-emerald-500/60' : 'bg-slate-200 dark:bg-slate-700'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Terminal warning banner */}
        {isTerminal && (
          <div className={clsx(
            'mt-4 flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-xs font-semibold border',
            lead.status === 'rejected'
              ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
              : 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
          )}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            This lead is currently <span className="font-bold uppercase ml-1">{lead.status.replace('_', ' ')}</span>.
            {lead.status === 'rejected' && (user?.role === 'admin' || user?.role === 'staff') && (
              <button onClick={() => setSearchParams({ tab: 'assignment' })} className="ml-auto underline cursor-pointer">
                Re-assign to fix →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          TWO-COLUMN LAYOUT: Tabs | Right Rail
      ══════════════════════════════════════════════════════════ */}
      <div className="no-print grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT: Tab System ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Tab Bar */}
          <div className="no-print card px-1 py-1 flex overflow-x-auto gap-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={clsx(
                    'relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.badge && (
                    <span className={clsx(
                      'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center',
                      isActive ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                    )}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ─────────────── OVERVIEW TAB ─────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">

              {/* Customer & Loan Summary */}
              <div className="card p-5">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Customer & Loan Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                  <InfoRow label="Customer Name" value={lead.customer_name} />
                  <InfoRow label="Mobile" value={lead.customer_mobile} mono />
                  <InfoRow label="Occupation" value={lead.customer_occupation} />
                  <InfoRow label="Vehicle" value={lead.vehicle_make_model} />
                  <InfoRow label="Loan Amount" value={lead.loan_amount ? `₹${Number(lead.loan_amount).toLocaleString('en-IN')}` : null} accent />
                  <InfoRow label="Loan Type" value={lead.loan_type?.replace('_', ' ')} />
                  {lead.loan_tenure && <InfoRow label="Tenure" value={`${lead.loan_tenure} months`} />}
                  {lead.down_payment && <InfoRow label="Down Payment" value={`₹${Number(lead.down_payment).toLocaleString('en-IN')}`} />}
                  {lead.interest_rate && <InfoRow label="Interest Rate" value={`${lead.interest_rate}% p.a.`} />}
                  {lead.emi_amount && <InfoRow label="EMI" value={`₹${Number(lead.emi_amount).toLocaleString('en-IN')}/mo`} accent />}
                  {lead.customer_address && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Address</span>
                      <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 leading-snug">{lead.customer_address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment & Sourcing */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" /> Assignment & Sourcing
                  </h3>
                  {lead.status !== 'disbursed' && (user?.role === 'admin' || user?.role === 'staff') && (
                    <button
                      onClick={() => setSearchParams({ tab: 'assignment' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                    >
                      <Building className="w-3.5 h-3.5" />
                      {((lead.agent_name && lead.agent_name !== 'Direct / None') || lead.financer_name || lead.executive_name) ? 'Edit Assigned' : 'Assign Lead'}
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Dealer\'s', value: lead.agent_name || lead.dealer_name || 'Direct / None', color: 'slate' as const },
                    ...(lead.channel_executive_name ? [{ label: 'Channel Agent', value: lead.channel_executive_name, color: 'indigo' as const }] : []),
                    { label: 'Financer / Bank', value: lead.financer_name || 'Unassigned', color: 'amber' as const },
                    { label: 'Bank Executive', value: lead.executive_name || 'Unassigned', color: 'emerald' as const },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{row.label}</span>
                      <AvatarChip name={row.value} color={row.color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* KYC Documents Gate */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> KYC Disbursal Gate
                  </h3>
                  <button onClick={() => handleTabChange('documents')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                    View Vault →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { type: 'aadhaar', label: 'Aadhaar Card' },
                    { type: 'pan', label: 'PAN Card' },
                    { type: 'bank_statement', label: 'Bank Statement' },
                  ].map((item) => {
                    const doc = documents?.find((d: any) => d.document_type === item.type && d.verification_notes !== 'Archived / Removed by user');
                    const status: string = doc ? doc.verification_status : 'missing';
                    const kycClass = status === 'verified' ? 'kyc-verified' : status === 'rejected' ? 'kyc-rejected' : status === 'pending' ? 'kyc-pending' : 'kyc-missing';
                    return (
                      <div key={item.type} className={clsx('rounded-xl border p-4 flex flex-col gap-3', kycClass)}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{item.label}</span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1" style={{ background: 'rgba(0,0,0,0.1)' }}>
                            {status === 'verified' && <CheckCircle className="w-2.5 h-2.5" />}
                            {status === 'rejected' && <XCircle className="w-2.5 h-2.5" />}
                            {status === 'missing' ? 'Not Uploaded' : status}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-70">
                          {doc ? `Uploaded ${doc.uploaded_at?.split(' ')[0] || 'recently'}` : 'Required for disbursal'}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-current/10 text-[11px]">
                          {doc ? (
                            <>
                              <a href={getDocUrl(doc.file_path)} target="_blank" rel="noreferrer" className="font-semibold hover:underline">Preview</a>
                              <div className="flex items-center gap-1">
                                {canVerifyDocs && status === 'pending' && (
                                  <>
                                    <button onClick={() => handleVerifyDoc(doc.id, 'verified')} className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors">✓</button>
                                    <button onClick={() => handleVerifyDoc(doc.id, 'rejected')} className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors">✗</button>
                                  </>
                                )}
                                {isAdminOrManager && (
                                  <button onClick={() => handleDeleteDoc(doc.id)} className="p-1 hover:opacity-70 rounded cursor-pointer" title="Archive">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            user?.role !== 'staff' ? (
                              <button onClick={() => handleTabChange('documents')} className="font-semibold hover:underline cursor-pointer flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Upload in Vault →
                              </button>
                            ) : (
                              <span className="opacity-60 italic">No file available</span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────── ASSIGN LEAD TAB ─────────────── */}
          {activeTab === 'assignment' && lead?.status !== 'disbursed' && (user?.role === 'admin' || user?.role === 'staff') && (
            <div className="card p-6 space-y-6 animate-fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lead Assignment Details</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Assign the target financer and bank executive for this vehicle finance lead.</p>
                </div>
              </div>

              {assignError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-450 rounded-xl text-xs font-semibold">
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-xl text-xs font-semibold">
                  Assignment updated successfully!
                </div>
              )}

              {lead.status === 'rejected' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-250 dark:border-amber-900/40 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block text-sm mb-0.5">Reactivating Rejected Lead</strong>
                    Re-assigning this lead to a Financer or Executive will automatically move it out of Rejection and display it in the active assigned list.
                  </div>
                </div>
              )}

              <form onSubmit={handleAssignSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Assigned Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Assigned Date
                    </label>
                    <input
                      type="date"
                      required
                      value={assignForm.assigned_date}
                      onChange={(e) => setAssignForm({ ...assignForm, assigned_date: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-slate-250 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* 2. Target Financer / Bank */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Financer
                      </label>
                      <button type="button" onClick={() => { setQuickAddType('financer'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Plus className="w-3 h-3" /> Quick Add
                      </button>
                    </div>
                    <select
                      value={assignForm.financer_id}
                      onChange={(e) => setAssignForm({ ...assignForm, financer_id: e.target.value, executive_id: '' })}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-slate-250 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white"
                    >
                      <option value="">— Unassigned —</option>
                      {financers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>

                  {/* 3. Assign to Executive */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        Bank Executive
                      </label>
                      <button type="button" onClick={() => { setQuickAddType('executive'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Plus className="w-3 h-3" /> Quick Add
                      </button>
                    </div>
                    <select
                      value={assignForm.executive_id}
                      onChange={(e) => setAssignForm({ ...assignForm, executive_id: e.target.value })}
                      className="w-full p-2.5 bg-white dark:bg-[#111827] border border-indigo-200 dark:border-indigo-900/60 rounded-lg text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-white font-medium"
                    >
                      <option value="">— Unassigned —</option>
                      {executives
                        .filter(e => !assignForm.financer_id || !e.financer_id || e.financer_id.toString() === assignForm.financer_id)
                        .map(ex => (
                          <option key={ex.id} value={ex.id}>{ex.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={assignSaving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-indigo-500/20 disabled:opacity-70 cursor-pointer"
                  >
                    {assignSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Save Assignment Details'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ─────────────── FOLLOW-UPS TAB ─────────────── */}
          {activeTab === 'followups' && (
            <div className="space-y-4 animate-fade-in">

              {/* Form / gate */}
              {!lead.executive_id ? (
                <div className="card p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7 text-amber-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Lead Unassigned</h3>
                  <p className="text-xs text-slate-400 max-w-xs">This lead must be assigned to a bank executive before you can log follow-ups.</p>
                  <button onClick={() => setSearchParams({ tab: 'assignment' })} className="mt-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors cursor-pointer">
                    Assign Executive
                  </button>
                </div>
              ) : lead.status === 'disbursed' ? (
                <div className="card p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Lead Disbursed ✓</h3>
                  <p className="text-xs text-slate-400">This loan has been successfully disbursed. No new follow-ups can be added.</p>
                </div>
              ) : (
                <div className="card p-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-indigo-500" /> Log Interaction
                  </h3>
                  <form onSubmit={handleAddFollowup} className="space-y-4">
                    <textarea
                      required value={remarks} onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter discussion remarks, updates, or next steps…"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 dark:focus:border-indigo-400 min-h-[90px] text-slate-800 dark:text-white text-sm resize-none transition-colors"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Next Follow-up Date</label>
                        <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                          className="w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Update Status</label>
                        <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full text-sm">
                          <option value="rejected">Rejected</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="disbursed">Disbursed</option>
                          <option value="reassign">Re-assign</option>
                        </select>
                      </div>
                    </div>

                    {/* Disbursal extras */}
                    {newStatus === 'disbursed' && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20 space-y-4">
                        <div className="space-y-3 pb-4 border-b border-amber-200/50">
                          <div className="flex items-center gap-2">
                            <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Final Loan Details (Required)</h4>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Final Loan Amount *</label>
                              <input required type="number" min="1" value={disburseFinalAmount} onChange={e => setDisburseFinalAmount(e.target.value)} className="w-full text-xs font-mono" placeholder="₹ Amount" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Tenure (Months) *</label>
                              <input required type="number" min="1" value={disburseTenure} onChange={e => setDisburseTenure(e.target.value)} className="w-full text-xs font-mono" placeholder="e.g. 60" />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">ROI (%) *</label>
                              <input required type="number" step="0.01" min="0.1" value={disburseRoi} onChange={e => setDisburseRoi(e.target.value)} className="w-full text-xs font-mono" placeholder="e.g. 8.5" />
                            </div>
                          </div>
                        </div>

                        {lead.vehicle_condition === 'new' ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Insurance Details (Required)</h4>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-500">Provide the new vehicle insurance details before disbursing.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Insurance Company *</label>
                                <input required type="text" defaultValue={lead.insurance_company || ''} onChange={e => setInsuranceDetails(prev => ({...prev, insurance_company: e.target.value}))} className="w-full text-xs" placeholder="e.g. Tata AIG" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Policy Number *</label>
                                <input required type="text" defaultValue={lead.policy_number || ''} onChange={e => setInsuranceDetails(prev => ({...prev, policy_number: e.target.value}))} className="w-full font-mono text-xs" placeholder="Policy No." />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Expiry Date *</label>
                                <input required type="date" defaultValue={lead.insurance_expiry_date || ''} onChange={e => setInsuranceDetails(prev => ({...prev, insurance_expiry_date: e.target.value}))} className="w-full text-xs" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-amber-500" />
                              <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Required Disbursal Documents</h4>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-500">Only attach documents that are <span className="font-bold underline">missing</span> from the Document Vault.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {[
                                { key: 'aadhaar', label: 'Aadhaar Card' }, { key: 'pan', label: 'PAN Card' },
                                { key: 'bank_statement', label: 'Bank Statement' }, { key: 'other', label: 'Others' },
                                ...(lead.rc_status === 'received' ? [{ key: 'rc', label: 'RC (Registration)' }] : []),
                                ...(lead.insurance_status === 'received' ? [{ key: 'insurance', label: 'Insurance Policy' }] : []),
                              ].map(doc => {
                                const existingDoc = documents?.find((d: any) => d.document_type === doc.key && d.verification_notes !== 'Archived / Removed by user');
                                return existingDoc ? (
                                  <div key={doc.key} className="p-3 bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <div>
                                        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 truncate">{doc.label}</p>
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 capitalize">✓ Ready ({existingDoc.verification_status})</p>
                                      </div>
                                    </div>
                                    <a href={getDocUrl(existingDoc.file_path)} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 bg-white/80 dark:bg-slate-900/80 px-2 py-1 rounded border border-emerald-300/50 dark:border-emerald-800">View</a>
                                  </div>
                                ) : (
                                  <div key={doc.key} className="p-2.5 bg-white dark:bg-slate-900/80 border border-amber-300 dark:border-amber-700/60 rounded-xl">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <label className="text-xs font-bold text-amber-900 dark:text-amber-300">{doc.label}</label>
                                      <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">Missing</span>
                                    </div>
                                    <input type="file" onChange={e => handleDisburseDocChange(doc.key, e.target.files?.[0] || null)}
                                      className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-950 dark:file:text-amber-300 text-slate-500"
                                      accept=".pdf,.jpg,.jpeg,.png" />
                                  </div>
                                );
                              })}
                            </div>
                            <div className="pt-4 mt-2 border-t border-amber-200/50 space-y-3">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Customer Bank Details</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                                  <input type="text" defaultValue={lead.customer_bank_name || ''} onChange={e => setBankDetails(prev => ({...prev, customer_bank_name: e.target.value}))} className="w-full text-xs" placeholder="HDFC Bank" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                                  <input type="text" defaultValue={lead.customer_account_number || ''} onChange={e => setBankDetails(prev => ({...prev, customer_account_number: e.target.value}))} className="w-full font-mono text-xs" placeholder="1234567890" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">IFSC Code</label>
                                  <input type="text" defaultValue={lead.customer_ifsc_code || ''} onChange={e => setBankDetails(prev => ({...prev, customer_ifsc_code: e.target.value}))} className="w-full font-mono uppercase text-xs" placeholder="HDFC0001" />
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button type="submit"
                      className={clsx(
                        'px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all cursor-pointer',
                        newStatus === 'disbursed'
                          ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-500/25'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25'
                      )}
                    >
                      {newStatus === 'disbursed' ? '🎉 Mark as Disbursed' : 'Post Follow-up'}
                    </button>
                  </form>
                </div>
              )}

              {/* Timeline */}
              {followups && followups.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Activity Timeline
                  </h3>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                    <div className="space-y-4">
                      {followups.map((f: any, idx: number) => {
                        const dotColor = f.status_changed_to ? (followupDotColor[f.status_changed_to] ?? 'bg-indigo-500') : 'bg-slate-300 dark:bg-slate-600';
                        return (
                          <div key={f.id} className="relative flex gap-4">
                            {/* Dot */}
                            <div className="relative z-10 mt-1 shrink-0">
                              <div className={clsx('w-10 h-10 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm', idx === 0 && 'ring-2 ring-offset-1 ring-indigo-500/20')}>
                                <div className={clsx('w-3 h-3 rounded-full', dotColor)} />
                              </div>
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="card p-3.5 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                      {getInitials(f.creator_name || 'S')}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{f.creator_name || 'System'}</span>
                                  </div>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">{f.followup_date}</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">"{f.remarks}"</p>
                                <div className="flex items-center justify-between mt-2.5">
                                  {f.status_changed_to ? (
                                    <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border inline-flex items-center gap-1',
                                      getStatusConfig(f.status_changed_to).sbClass
                                    )}>
                                      <TrendingUp className="w-2.5 h-2.5" />
                                      → {f.status_changed_to === 'reassign' ? 'Re-assigned' : f.status_changed_to}
                                    </span>
                                  ) : <span />}
                                  {f.next_followup_date && (
                                    <span className={clsx(
                                      'text-[11px] font-medium flex items-center gap-1',
                                      new Date(f.next_followup_date) < new Date() ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                                    )}>
                                      <Calendar className="w-3 h-3" /> {f.next_followup_date}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────── DOCUMENTS TAB ─────────────── */}
          {activeTab === 'documents' && (
            <div className="animate-fade-in">
              {user?.role === 'staff' ? (
                <div className="card p-10 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7 text-rose-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Access Restricted</h3>
                  <p className="text-sm text-slate-400 max-w-xs">Staff members do not have permission to view uploaded documents.</p>
                </div>
              ) : (
                <PragmaticLeadDocuments
                  lead={lead} documents={documents || []}
                  onUpload={handleUploadDocumentPragmatic} onVerify={handleVerifyDoc}
                  onDelete={handleDeleteDoc} onOpenAssignmentModal={() => setSearchParams({ tab: 'assignment' })}
                  canVerifyDocs={canVerifyDocs} isAdminOrManager={isAdminOrManager}
                  uploadingDoc={uploadingDoc} getDocUrl={getDocUrl}
                />
              )}
            </div>
          )}
          {/* ─────────────── AUDIT LOGS TAB ─────────────── */}
          {activeTab === 'logs' && (
            <div className="card p-5 animate-fade-in">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Audit Trail
              </h3>
              <div className="space-y-0 divide-y divide-slate-50 dark:divide-slate-800/60">
                {logs?.map((l: any) => {
                  // Color-code action type
                  const actionLower = (l.action || '').toLowerCase();
                  const actionColor =
                    actionLower.includes('create') || actionLower.includes('add') || actionLower.includes('upload')
                      ? 'text-blue-600 dark:text-blue-400'
                      : actionLower.includes('verify') || actionLower.includes('approve') || actionLower.includes('disburse')
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : actionLower.includes('reject') || actionLower.includes('delete') || actionLower.includes('remov')
                          ? 'text-rose-600 dark:text-rose-400'
                          : actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('assign')
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300';
                  return (
                    <div key={l.id} className="flex gap-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="text-slate-400 dark:text-slate-500 font-mono text-[11px] w-36 shrink-0 pt-0.5 leading-relaxed">
                        {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        <br />
                        <span className="text-[10px]">{new Date(l.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className={clsx('text-xs font-bold', actionColor)}>{l.action}</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">by</span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{l.performed_by_name || 'System'}</span>
                        </div>
                        {l.details && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{l.details}</p>}
                      </div>
                    </div>
                  );
                })}
                {(!logs || logs.length === 0) && (
                  <div className="flex flex-col items-center gap-2 py-10 text-slate-300 dark:text-slate-600">
                    <Info className="w-8 h-8" />
                    <p className="text-sm">No audit entries yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            RIGHT RAIL
        ══════════════════════════════════════════════════════════ */}
        <div className="no-print space-y-4 lg:sticky lg:top-6">

          {/* Quick Stats */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Loan Summary
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Loan Amount</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {lead.loan_amount ? `₹${Number(lead.loan_amount).toLocaleString('en-IN')}` : '—'}
              </span>
            </div>

            {lead.status === 'disbursed' && lead.loan_amount && (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-800" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Commission Split</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Agent (90%)</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{(Number(lead.loan_amount) * 0.009).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Organization (10%)</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    ₹{(Number(lead.loan_amount) * 0.001).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </>
            )}

            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Status</span>
              <StatusBadge status={lead.status} size="sm" />
            </div>

            {latestFollowup?.next_followup_date && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Next Follow-up</span>
                <span className={clsx(
                  'text-xs font-semibold flex items-center gap-1',
                  isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                )}>
                  {isOverdue && <AlertTriangle className="w-3 h-3" />}
                  {latestFollowup.next_followup_date}
                </span>
              </div>
            )}

            {lead.executive_name && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Executive</span>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">{lead.executive_name}</span>
              </div>
            )}
          </div>

          {/* Mini stepper (vertical) */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Pipeline Stage</h3>
            <div className="relative space-y-0">
              {STAGES.map((stage, idx) => {
                const meta = STAGE_META[stage];
                const Icon = meta.icon;
                const isPassed = !isTerminal && currentStageIdx > idx;
                const isCurrent = currentStageIdx === idx;
                return (
                  <div key={stage} className="flex gap-3 items-start">
                    {/* Icon + line */}
                    <div className="flex flex-col items-center">
                      <div className={clsx(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs transition-all',
                        isPassed ? 'bg-emerald-500 text-white' :
                        isCurrent && !isTerminal ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/20' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      )}>
                        {isPassed ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                      </div>
                      {idx < STAGES.length - 1 && (
                        <div className={clsx('w-0.5 h-6 my-0.5 rounded-full', isPassed ? 'bg-emerald-300 dark:bg-emerald-600' : 'bg-slate-100 dark:bg-slate-800')} />
                      )}
                    </div>
                    {/* Label */}
                    <div className="pt-1 pb-4">
                      <p className={clsx('text-xs font-semibold capitalize',
                        isPassed ? 'text-emerald-600 dark:text-emerald-400' :
                        isCurrent && !isTerminal ? 'text-indigo-600 dark:text-indigo-400' :
                        'text-slate-400 dark:text-slate-500'
                      )}>{meta.label}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600">{meta.sub}</p>
                    </div>
                  </div>
                );
              })}
              {isTerminal && (
                <div className={clsx(
                  'mt-1 flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-lg border',
                  lead.status === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                    : 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/30'
                )}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {lead.status.replace('_', ' ').toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {lead.status !== 'disbursed' && (
                <button
                  onClick={() => { handleTabChange('followups'); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20"
                >
                  <MessageCircle className="w-4 h-4" /> Log Follow-up
                </button>
              )}
              {lead.status !== 'disbursed' && (user?.role === 'admin' || user?.role === 'staff') && (
                <button
                  onClick={() => setSearchParams({ tab: 'assignment' })}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Building className="w-4 h-4" />
                  {lead.executive_name ? 'Re-assign Lead' : 'Assign Lead'}
                </button>
              )}
              {isAdminOrManager && lead.status !== 'disbursed' && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                >
                  <Edit className="w-4 h-4" /> Edit Lead Data
                </button>
              )}

              {isAdminOrManager && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white hover:border-transparent"
                >
                  <Trash2 className="w-4 h-4" /> Delete Lead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* ── Modals (unchanged) ── */}
      <NewLeadModal
        isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}
        initialData={data?.lead}
        onSuccess={() => { setIsEditModalOpen(false); fetchLeadDetails(); }}
      />
      <AssignmentModal
        isOpen={isAssignmentModalOpen} onClose={() => setIsAssignmentModalOpen(false)}
        leadId={data?.lead?.id} initialData={data?.lead}
        onSuccess={() => { setIsAssignmentModalOpen(false); fetchLeadDetails(); }}
      />
      
      {quickAddType && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-600" />
                Quick Add {quickAddType === 'financer' ? 'Financer' : 'Executive'}
              </h3>
              <button type="button" onClick={() => setQuickAddType(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-lg p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5 text-xs text-slate-800 dark:text-white">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name *</label>
                <input required type="text" value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="Full Name" className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800 dark:text-white transition-all" />
              </div>
              {quickAddType === 'executive' && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                  <input required type="text" value={quickAddMobile} onChange={e => setQuickAddMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 Digits" className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs font-mono text-slate-800 dark:text-white transition-all" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setQuickAddType(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={quickAddLoading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer disabled:opacity-75 shadow-sm shadow-indigo-500/20">
                  {quickAddLoading ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
