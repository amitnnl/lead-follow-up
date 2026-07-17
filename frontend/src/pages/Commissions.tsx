import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { 
  Briefcase, IndianRupee, 
  DollarSign, Calculator, X, CheckCircle, Edit, CheckSquare, Square, Clock, Check, Ban, AlertCircle,
  TrendingUp, Download, CreditCard
} from 'lucide-react';
import clsx from 'clsx';

interface Commission {
  id: number;
  customer_name: string;
  lead_code?: string;
  lead_ref?: string;
  agent_name: string | null;
  pan_number?: string;
  commission_amount: string | number;
  tds_amount: string | number;
  tds_rate: number | string;
  net_payable: string | number;
  paid_amount: string | number;
  approval_status: string;
  payment_mode?: string;
  notes?: string;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
    pending_approval: { 
      label: 'Pending Checker', 
      icon: <Clock className="w-2.5 h-2.5 animate-pulse" />, 
      className: 'sb-pending' 
    },
    rejected: { 
      label: 'Rejected', 
      icon: <Ban className="w-2.5 h-2.5" />, 
      className: 'sb-rejected' 
    },
    approved: { 
      label: 'Approved', 
      icon: <CheckCircle className="w-2.5 h-2.5" />, 
      className: 'sb-approved' 
    },
  };
  const cfg = configs[status] || configs.approved;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border', cfg.className)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function FormatCurrency({ value, color = 'slate' }: { value: number; color?: string }) {
  const colors: Record<string, string> = {
    slate: 'text-slate-850 dark:text-white',
    emerald: 'text-emerald-600 dark:text-emerald-450',
    rose: 'text-rose-600 dark:text-rose-450',
    amber: 'text-amber-600 dark:text-amber-450',
    indigo: 'text-indigo-600 dark:text-indigo-400',
  };
  return (
    <span className={clsx('font-mono font-bold text-xs', colors[color])}>
      ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    </span>
  );
}

function KPICard({ 
  label, value, icon: Icon, color, trend, trendLabel, bgColor 
}: { 
  label: string; 
  value: React.ReactNode; 
  icon: React.ElementType; 
  color: string; 
  trend?: number; 
  trendLabel?: string; 
  bgColor?: string;
}) {
  return (
    <div className={clsx('card p-4 flex items-center gap-3 relative overflow-hidden group', bgColor)}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-base sm:text-lg font-black text-slate-850 dark:text-white mt-0.5">{value}</p>
        {(trend !== undefined || trendLabel) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {trend !== undefined && (
              <span className={clsx('flex items-center gap-0.5 text-[10px] font-bold', trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                {Math.abs(trend)}%
              </span>
            )}
            {trendLabel && <span className="text-[10px] text-slate-400 dark:text-slate-500">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Commissions() {
  const { user } = useAuthStore();
  const isRestrictedRole = user?.role === 'channel_agent' || user?.role === 'agent' || user?.role === 'executive';
  const canManagePayouts = !isRestrictedRole;
  const canApprovePayouts = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<Commission | null>(null);
  const [formData, setFormData] = useState({
    amount: 0,
    payment_mode: 'NEFT',
    notes: ''
  });

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await api.get('/commissions');
      setCommissions(response.data.commissions || []);
    } catch (error) {
      console.error('Failed to fetch commissions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCommissions(); }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === commissions.length) setSelectedIds([]);
    else setSelectedIds(commissions.map(c => Number(c.id)));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleBatchSettlement = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Execute batch settlement for ${selectedIds.length} commissions?`)) return;
    setBatchProcessing(true);
    try {
      const res = await api.post('/commissions/batch_payout', {
        commission_ids: selectedIds,
        payment_mode: 'NEFT',
        notes: 'Consolidated Batch Settlement'
      });
      alert(res.data?.message || 'Batch payout successful!');
      setSelectedIds([]);
      fetchCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Batch settlement failed.');
    } finally { setBatchProcessing(false); }
  };

  const handleApprovalAction = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.post('/commissions/approve', {
        id, status,
        rejection_reason: status === 'rejected' ? 'Rejected by Maker-Checker policy' : ''
      });
      fetchCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Approval action failed.');
    }
  };

  const handleOpenModal = (c: Commission) => {
    setEditingComm(c);
    setFormData({
      amount: Number(c.net_payable) - Number(c.paid_amount),
      payment_mode: c.payment_mode || 'NEFT',
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComm) return;
    try {
      await api.post('/commissions/payout', {
        id: editingComm.id,
        amount: formData.amount,
        payment_mode: formData.payment_mode,
        notes: formData.notes
      });
      setIsModalOpen(false);
      fetchCommissions();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to record payout.");
    }
  };

  // KPI Calculations
  const totalComm = useMemo(() => 
    commissions.reduce((acc, c) => acc + (parseFloat(String(c.commission_amount)) || 0), 0), [commissions]);
  const totalPaid = useMemo(() => 
    commissions.reduce((acc, c) => acc + (parseFloat(String(c.paid_amount)) || 0), 0), [commissions]);
  const totalTds = useMemo(() => 
    commissions.reduce((acc, c) => acc + (parseFloat(String(c.tds_amount)) || 0), 0), [commissions]);
  const totalPending = totalComm - totalPaid;

  const netPayable = useMemo(() => 
    commissions.reduce((acc, c) => acc + (parseFloat(String(c.net_payable)) || 0), 0), [commissions]);

  return (
    <div className="space-y-4 animate-fade-in select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            {isRestrictedRole ? 'My Earnings & Payouts' : 'DSA Commissions Engine'}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {isRestrictedRole 
              ? 'Track your commission earnings, TDS breakdown (194H), and release schedules.' 
              : 'Automated 194H TDS withholding (5% PAN / 20% Non-PAN), Maker-Checker verification, and Batch Settlements.'
            }
          </p>
        </div>

        {!isRestrictedRole && selectedIds.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
            <span className="text-xs font-bold">{selectedIds.length} payout(s) selected</span>
            <button 
              onClick={handleBatchSettlement}
              disabled={batchProcessing}
              className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              {batchProcessing ? 'Settling...' : 'Release Batch'}
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard 
          label="Gross Commission" 
          value={<FormatCurrency value={totalComm} color="indigo" />} 
          icon={DollarSign} 
          color="#4f46e5" 
          trend={12} 
          trendLabel="vs last month"
        />
        <KPICard 
          label="TDS Withheld (194H)" 
          value={<FormatCurrency value={totalTds} color="rose" />} 
          icon={Calculator} 
          color="#f43f5e" 
          trend={-3} 
          trendLabel="lower is better"
          bgColor="bg-rose-50/30 dark:bg-rose-500/5"
        />
        <KPICard 
          label="Total Paid" 
          value={<FormatCurrency value={totalPaid} color="emerald" />} 
          icon={IndianRupee} 
          color="#10b981" 
          trend={8} 
          trendLabel="vs last month"
        />
        <KPICard 
          label="Pending Balance" 
          value={<FormatCurrency value={totalPending} color="amber" />} 
          icon={AlertCircle} 
          color="#f59e0b" 
          trend={0} 
          trendLabel="action required"
          bgColor="bg-amber-50/30 dark:bg-amber-500/5 border-l-4 border-l-amber-500"
        />
      </div>

      {/* ── Net Payable Summary ── */}
      <div className="card p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-200/50 dark:border-indigo-800/30 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Net Payable</p>
            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              <FormatCurrency value={netPayable} color="indigo" />
            </p>
          </div>
        </div>
        {!isRestrictedRole && (
          <button
            onClick={() => { setSelectedIds(commissions.map(c => Number(c.id))); }}
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all shadow-sm shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Select All for Batch
          </button>
        )}
      </div>

      {/* ── Data Table ── */}
      <div className="card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-400 to-teal-400" />

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                {!isRestrictedRole && (
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                      {commissions.length > 0 && selectedIds.length === commissions.length 
                        ? <CheckSquare className="w-4 h-4 text-indigo-600" /> 
                        : <Square className="w-4 h-4" />
                      }
                    </button>
                  </th>
                )}
                <th className="px-4 py-3 font-medium">Lead & Customer</th>
                <th className="px-4 py-3 font-medium">DSA Partner</th>
                <th className="px-4 py-3 font-medium">Gross Comm</th>
                <th className="px-4 py-3 font-medium">TDS Withheld</th>
                <th className="px-4 py-3 font-medium">Net Payable</th>
                <th className="px-4 py-3 font-medium">Checker Verification</th>
                {!isRestrictedRole && <th className="px-4 py-3 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={isRestrictedRole ? 6 : 8} className="py-12 text-center">
                    <div className="relative w-8 h-8 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={isRestrictedRole ? 6 : 8} className="py-12 text-center text-slate-400 text-xs italic">
                    No commission records found.
                  </td>
                </tr>
              ) : (
                commissions.map((c, i) => {
                  const isSelected = selectedIds.includes(Number(c.id));
                  return (
                    <tr 
                      key={c.id} 
                      className={clsx(
                        'hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors',
                        i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : ''
                      )}
                    >
                      {!isRestrictedRole && (
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelect(Number(c.id))} className="text-slate-400 hover:text-slate-650 cursor-pointer">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-white text-[13px]">{c.customer_name}</div>
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{c.lead_code || c.lead_ref}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 dark:text-slate-350 font-semibold">{c.agent_name || 'Direct Lead'}</div>
                        {c.pan_number ? (
                          <span className="inline-block mt-1 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-500">
                            PAN: {c.pan_number}
                          </span>
                        ) : (
                          <span className="inline-block mt-1 text-[9px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded">
                            NO PAN (20% TDS)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white text-xs">
                        <FormatCurrency value={Number(c.commission_amount)} color="slate" />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <span className="text-rose-500 font-bold">-<FormatCurrency value={Number(c.tds_amount)} color="rose" /></span>
                        <span className="text-[9px] text-slate-400 ml-1">({c.tds_rate}% TDS)</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                          <FormatCurrency value={Number(c.net_payable)} color="emerald" />
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">Paid: <FormatCurrency value={Number(c.paid_amount)} color="slate" /></div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.approval_status || 'approved'} />
                      </td>
                      {!isRestrictedRole && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canApprovePayouts && c.approval_status === 'pending_approval' && (
                              <>
                                <button 
                                  onClick={() => handleApprovalAction(Number(c.id), 'approved')} 
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg cursor-pointer transition-colors" 
                                  title="Approve Payout"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleApprovalAction(Number(c.id), 'rejected')} 
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors" 
                                  title="Reject Payout"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {canManagePayouts && (
                              <button 
                                onClick={() => handleOpenModal(c)} 
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-lg cursor-pointer transition-all hover:bg-indigo-100"
                              >
                                <Edit className="w-3.5 h-3.5"/> Payout
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Single Payout Recording Modal ── */}
      {isModalOpen && editingComm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Record Payout Release</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-650 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Gross</div>
                  <div className="font-mono font-bold text-slate-850 dark:text-white text-xs mt-1"><FormatCurrency value={Number(editingComm.commission_amount)} color="slate" /></div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">TDS ({editingComm.tds_rate}%)</div>
                  <div className="font-mono font-bold text-rose-500 text-xs mt-1">-<FormatCurrency value={Number(editingComm.tds_amount)} color="rose" /></div>
                </div>
                <div>
                  <div className="text-[9px] font-bold text-slate-450 uppercase tracking-wider">Net Payable</div>
                  <div className="font-mono font-bold text-emerald-600 text-xs mt-1"><FormatCurrency value={Number(editingComm.net_payable)} color="emerald" /></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Release Amount (₹)</label>
                  <input 
                    type="number" step="0.01" required 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 font-mono text-slate-800 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Payment Mode</label>
                  <select 
                    value={formData.payment_mode} 
                    onChange={e => setFormData({...formData, payment_mode: e.target.value})} 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="NEFT">NEFT / IMPS / RTGS</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Transaction Remarks</label>
                <textarea 
                  rows={2} 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-xs text-slate-850 dark:text-white resize-none" 
                  placeholder="Enter transaction reference advice notes..."
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition-all cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer shadow-sm shadow-emerald-500/25">Release Payout</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}