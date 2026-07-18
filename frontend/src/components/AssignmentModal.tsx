import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Building2, UserCircle2, AlertCircle, Plus } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  leadId: number;
  initialData: any;
}

export default function AssignmentModal({ isOpen, onClose, onSuccess, leadId, initialData }: AssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuthStore();
  
  const canAssign = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  const [financers, setFinancers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    assigned_date: '',
    financer_id: '',
    executive_id: '',
    channel_id: '',
    channel_executive_id: ''
  });

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
          setFormData(prev => ({ ...prev, financer_id: newId.toString(), executive_id: '' }));
        }
      } else if (quickAddType === 'executive') {
        const payload: any = { name: quickAddName, mobile: quickAddMobile, is_active: 1 };
        if (formData.financer_id) {
          payload.financer_id = formData.financer_id;
        }
        const res = await api.post('/setup/executives', payload);
        const newId = res.data?.id;
        const listRes = await api.get('/setup/executives');
        setExecutives(listRes.data.executives || []);
        if (newId) {
          setFormData(prev => ({ ...prev, executive_id: newId.toString() }));
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

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.get('/setup/financers'),
        api.get('/setup/executives')
      ]).then(([financersRes, execsRes]) => {
        setFinancers(financersRes.data.financers || []);
        setExecutives(execsRes.data.executives || []);
      });

      setFormData({
        assigned_date: initialData?.assigned_date || new Date().toISOString().split('T')[0],
        financer_id: initialData?.financer_id?.toString() || '',
        executive_id: initialData?.executive_id?.toString() || '',
        channel_id: initialData?.channel_id?.toString() || '',
        channel_executive_id: initialData?.channel_executive_id?.toString() || ''
      });
    }
  }, [isOpen, initialData]);

  // When Financer changes, we clear the executive if it doesn't match the new financer
  const handleFinancerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFinancerId = e.target.value;
    setFormData(prev => ({
      ...prev,
      financer_id: newFinancerId,
      executive_id: ''
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.put('/leads?action=assign', {
        id: leadId,
        assigned_date: formData.assigned_date,
        financer_id: formData.financer_id ? parseInt(formData.financer_id) : null,
        executive_id: formData.executive_id ? parseInt(formData.executive_id) : null,
        channel_id: formData.channel_id ? parseInt(formData.channel_id) : null,
        channel_executive_id: formData.channel_executive_id ? parseInt(formData.channel_executive_id) : null
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectClass = "w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white transition-all";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111622] rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200/80 dark:border-slate-800">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <h2 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            {initialData?.status === 'rejected' ? 'Re-Assign Rejected Lead' : 'Assign Lead Details'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl text-xs font-semibold">{error}</div>}

          {initialData?.status === 'rejected' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold block text-sm mb-0.5">Reactivating Rejected Lead</strong>
                Re-assigning this lead to a Financer or Executive will automatically move it out of Rejection and display it in the active assigned list.
              </div>
            </div>
          )}

          {!canAssign && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> You do not have permission to modify assignments. Only Admins and Staff can perform this action.
            </div>
          )}

          <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-5">
            
            {/* Section 1: Internal Bank & Executive */}
            <div>
              <h3 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Bank & Executive Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Assigned Date */}
                <div>
                  <label className={labelClass}>
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Assigned Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.assigned_date}
                    onChange={(e) => setFormData({...formData, assigned_date: e.target.value})}
                    className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white transition-all"
                  />
                </div>

                {/* 2. Financer / Bank */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Financer
                    </label>
                    <button type="button" onClick={() => { setQuickAddType('financer'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                      <Plus className="w-3 h-3" /> Quick Add
                    </button>
                  </div>
                  <select
                    value={formData.financer_id}
                    onChange={handleFinancerChange}
                    className={selectClass}
                  >
                    <option value="">— Unassigned —</option>
                    {financers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>

                {/* 3. Assign to Executive (SFE) */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <UserCircle2 className="w-3.5 h-3.5 text-primary-500" />
                      Bank Executive
                    </label>
                    <button type="button" onClick={() => { setQuickAddType('executive'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                      <Plus className="w-3 h-3" /> Quick Add
                    </button>
                  </div>
                  <select
                    value={formData.executive_id}
                    onChange={(e) => setFormData({...formData, executive_id: e.target.value})}
                    className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-primary-300 dark:border-primary-900/80 focus:border-primary-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20 shadow-2xs text-slate-800 dark:text-white transition-all"
                  >
                    <option value="">— Unassigned —</option>
                    {executives
                      .filter(e => !formData.financer_id || !e.financer_id || e.financer_id.toString() === formData.financer_id)
                      .map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

          </div>

          <div className="pt-3 flex gap-3 justify-end border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={loading || !canAssign} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-70 shadow-sm shadow-primary-500/20 cursor-pointer">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Assignment'}
            </button>
          </div>
        </form>

      </div>

      {quickAddType && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary-600" />
                Quick Add {quickAddType === 'financer' ? 'Financer' : 'Executive'}
              </h3>
              <button type="button" onClick={() => setQuickAddType(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded-lg p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="space-y-3.5 text-xs text-slate-800 dark:text-white">
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Name *</label>
                <input required type="text" value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="Full Name" className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs text-slate-800 dark:text-white transition-all" />
              </div>
              {quickAddType === 'executive' && (
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                  <input required type="text" value={quickAddMobile} onChange={e => setQuickAddMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 Digits" className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs font-mono text-slate-800 dark:text-white transition-all" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setQuickAddType(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
                <button type="submit" disabled={quickAddLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer disabled:opacity-75 shadow-sm shadow-primary-500/20">
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
