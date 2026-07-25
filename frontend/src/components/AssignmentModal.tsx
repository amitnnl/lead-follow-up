import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, Building2, UserCircle2, AlertCircle, Plus, MessageCircle, Mail, BellOff } from 'lucide-react';
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

  const [notifyExecMethod, setNotifyExecMethod] = useState<'whatsapp' | 'email' | 'none'>('whatsapp');
  const [execMobile, setExecMobile] = useState('');
  const [execEmail, setExecEmail] = useState('');

  const [notifyFinMethod, setNotifyFinMethod] = useState<'whatsapp' | 'email' | 'none'>('whatsapp');
  const [finMobile, setFinMobile] = useState('');
  const [finEmail, setFinEmail] = useState('');

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
      setNotifyExecMethod('whatsapp');
      setNotifyFinMethod('whatsapp');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (formData.executive_id && executives.length > 0) {
      const exec = executives.find(e => e.id.toString() === formData.executive_id);
      if (exec) {
        setExecMobile(exec.mobile || '');
        setExecEmail(exec.email || '');
      }
    }
  }, [formData.executive_id, executives]);

  useEffect(() => {
    if (formData.financer_id && financers.length > 0) {
      const fin = financers.find(f => f.id.toString() === formData.financer_id);
      if (fin) {
        setFinMobile(fin.mobile || '');
        setFinEmail(fin.email || '');
      }
    }
  }, [formData.financer_id, financers]);

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
      const res = await api.put('/leads?action=assign', {
        id: leadId,
        assigned_date: formData.assigned_date,
        financer_id: formData.financer_id ? parseInt(formData.financer_id) : null,
        executive_id: formData.executive_id ? parseInt(formData.executive_id) : null,
        channel_id: formData.channel_id ? parseInt(formData.channel_id) : null,
        channel_executive_id: formData.channel_executive_id ? parseInt(formData.channel_executive_id) : null
      });
      
      const { assigned_executive, assigned_financer } = res.data || {};

      // Trigger notifications using the form inputs
      if (formData.executive_id && assigned_executive && notifyExecMethod !== 'none') {
        const personName = assigned_executive.name;
        if (notifyExecMethod === 'whatsapp' && execMobile) {
          const text = `Hi ${personName}, a new lead (ID-${leadId}) has been assigned to you. Please log in to your dashboard to view the details.`;
          window.open(`https://wa.me/91${execMobile}?text=${encodeURIComponent(text)}`, '_blank');
        } else if (notifyExecMethod === 'email' && execEmail) {
          const subject = `New Lead Assigned (ID-${leadId})`;
          const body = `Hi ${personName},\n\nA new lead (ID-${leadId}) has been assigned to you. Please log in to your dashboard to view the details.\n\nThanks,\nAdministrative Team`;
          window.open(`mailto:${execEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        }
      }

      if (formData.financer_id && assigned_financer && notifyFinMethod !== 'none') {
        const personName = assigned_financer.name;
        if (notifyFinMethod === 'whatsapp' && finMobile) {
          const text = `Hi ${personName}, a new lead (ID-${leadId}) has been assigned to your bank. Please log in to your dashboard to view the details.`;
          window.open(`https://wa.me/91${finMobile}?text=${encodeURIComponent(text)}`, '_blank');
        } else if (notifyFinMethod === 'email' && finEmail) {
          const subject = `New Lead Assigned (ID-${leadId})`;
          const body = `Hi ${personName},\n\nA new lead (ID-${leadId}) has been assigned to your bank. Please log in to your dashboard to view the details.\n\nThanks,\nAdministrative Team`;
          window.open(`mailto:${finEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;


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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
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

          <div className="space-y-6">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date of Assignment</h4>
                </div>
              </div>
              <input
                type="date"
                required
                value={formData.assigned_date}
                onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                className="p-3 bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-primary-500 text-slate-800 dark:text-white shadow-sm"
              />
            </div>

            <div className="space-y-6">
              <div className="relative p-6 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  </div>
                  <button type="button" onClick={() => { setQuickAddType('financer'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1 cursor-pointer bg-primary-50 px-3 py-1.5 rounded-lg">
                    <Plus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
                <h4 className="text-base font-black text-slate-800 dark:text-white tracking-tight mb-1">Target Financer</h4>
                <p className="text-xs text-slate-500 mb-4">Which bank or institution is funding this?</p>
                
                <div className="space-y-4">
                  <select
                    value={formData.financer_id}
                    onChange={handleFinancerChange}
                    className="w-full p-3.5 bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 text-slate-800 dark:text-white shadow-sm appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                  >
                    <option value="">— Select Financer —</option>
                    {financers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>

                  {formData.financer_id && (
                    <div className="bg-white dark:bg-slate-900/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm animate-fade-in">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><BellOff className="w-3.5 h-3.5"/> Notify Financer</label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyFinMethod === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/5 dark:bg-[#25D366]/10 shadow-sm shadow-[#25D366]/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyFinMethod" value="whatsapp" checked={notifyFinMethod === 'whatsapp'} onChange={() => setNotifyFinMethod('whatsapp')} className="hidden" />
                          <MessageCircle className={`w-4 h-4 mb-1 transition-colors ${notifyFinMethod === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyFinMethod === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-500'}`}>WhatsApp</span>
                        </label>
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyFinMethod === 'email' ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-sm shadow-primary-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyFinMethod" value="email" checked={notifyFinMethod === 'email'} onChange={() => setNotifyFinMethod('email')} className="hidden" />
                          <Mail className={`w-4 h-4 mb-1 transition-colors ${notifyFinMethod === 'email' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyFinMethod === 'email' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Email</span>
                        </label>
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyFinMethod === 'none' ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyFinMethod" value="none" checked={notifyFinMethod === 'none'} onChange={() => setNotifyFinMethod('none')} className="hidden" />
                          <BellOff className={`w-4 h-4 mb-1 transition-colors ${notifyFinMethod === 'none' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyFinMethod === 'none' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500'}`}>None</span>
                        </label>
                      </div>
                      {notifyFinMethod === 'whatsapp' && (
                        <div className="animate-fade-in relative">
                          <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-2.5 top-2.5" />
                          <input type="text" value={finMobile} onChange={e => setFinMobile(e.target.value.replace(/\D/g, ''))} placeholder="10 Digit Number" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111827] border-2 border-[#25D366]/30 rounded-lg outline-none focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/10 text-xs font-mono text-slate-800 dark:text-white transition-all shadow-sm" />
                        </div>
                      )}
                      {notifyFinMethod === 'email' && (
                        <div className="animate-fade-in relative">
                          <Mail className="w-4 h-4 text-primary-500 absolute left-2.5 top-2.5" />
                          <input type="email" value={finEmail} onChange={e => setFinEmail(e.target.value)} placeholder="Email Address" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111827] border-2 border-primary-500/30 rounded-lg outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-xs text-slate-800 dark:text-white transition-all shadow-sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative p-6 bg-gradient-to-br from-primary-50/50 to-primary-100/30 dark:from-primary-900/20 dark:to-primary-900/10 border-2 border-primary-100/50 dark:border-primary-800/30 rounded-2xl shadow-sm hover:border-primary-200 dark:hover:border-primary-700/50 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                    <UserCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <button type="button" onClick={() => { setQuickAddType('executive'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-1 cursor-pointer bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg">
                    <Plus className="w-3 h-3" /> Quick Add
                  </button>
                </div>
                <h4 className="text-base font-black text-primary-900 dark:text-primary-100 tracking-tight mb-1">Field Executive</h4>
                <p className="text-xs text-primary-600/70 dark:text-primary-300/70 mb-4">Who is the on-ground agent managing this?</p>
                
                <div className="space-y-4">
                  <select
                    value={formData.executive_id}
                    onChange={(e) => setFormData({ ...formData, executive_id: e.target.value })}
                    className="w-full p-3.5 bg-white dark:bg-[#111827] border-2 border-primary-200 dark:border-primary-800/60 rounded-xl text-sm font-bold outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-primary-900 dark:text-primary-100 shadow-sm appearance-none cursor-pointer"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                  >
                    <option value="">— Select Executive —</option>
                    {executives
                      .filter(e => !formData.financer_id || !e.financer_id || e.financer_id.toString() === formData.financer_id)
                      .map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))
                    }
                  </select>

                  {formData.executive_id && (
                    <div className="bg-white dark:bg-slate-900/30 p-3 rounded-xl border border-primary-100/50 dark:border-primary-900/30 shadow-sm animate-fade-in">
                      <label className="block text-[10px] font-bold text-primary-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5"><BellOff className="w-3.5 h-3.5"/> Notify Executive</label>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyExecMethod === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/5 dark:bg-[#25D366]/10 shadow-sm shadow-[#25D366]/10' : 'border-primary-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary-200 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyExecMethod" value="whatsapp" checked={notifyExecMethod === 'whatsapp'} onChange={() => setNotifyExecMethod('whatsapp')} className="hidden" />
                          <MessageCircle className={`w-4 h-4 mb-1 transition-colors ${notifyExecMethod === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyExecMethod === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-500'}`}>WhatsApp</span>
                        </label>
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyExecMethod === 'email' ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-sm shadow-primary-500/10' : 'border-primary-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary-200 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyExecMethod" value="email" checked={notifyExecMethod === 'email'} onChange={() => setNotifyExecMethod('email')} className="hidden" />
                          <Mail className={`w-4 h-4 mb-1 transition-colors ${notifyExecMethod === 'email' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyExecMethod === 'email' ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Email</span>
                        </label>
                        <label className={`relative flex flex-col items-center justify-center py-2 rounded-xl cursor-pointer border-2 transition-all ${notifyExecMethod === 'none' ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 shadow-sm' : 'border-primary-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-primary-200 dark:hover:border-slate-700'}`}>
                          <input type="radio" name="notifyExecMethod" value="none" checked={notifyExecMethod === 'none'} onChange={() => setNotifyExecMethod('none')} className="hidden" />
                          <BellOff className={`w-4 h-4 mb-1 transition-colors ${notifyExecMethod === 'none' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-bold tracking-wide transition-colors ${notifyExecMethod === 'none' ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500'}`}>None</span>
                        </label>
                      </div>
                      {notifyExecMethod === 'whatsapp' && (
                        <div className="animate-fade-in relative">
                          <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-2.5 top-2.5" />
                          <input type="text" value={execMobile} onChange={e => setExecMobile(e.target.value.replace(/\D/g, ''))} placeholder="10 Digit Number" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111827] border-2 border-[#25D366]/30 rounded-lg outline-none focus:border-[#25D366] focus:ring-4 focus:ring-[#25D366]/10 text-xs font-mono text-slate-800 dark:text-white transition-all shadow-sm" />
                        </div>
                      )}
                      {notifyExecMethod === 'email' && (
                        <div className="animate-fade-in relative">
                          <Mail className="w-4 h-4 text-primary-500 absolute left-2.5 top-2.5" />
                          <input type="email" value={execEmail} onChange={e => setExecEmail(e.target.value)} placeholder="Email Address" className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#111827] border-2 border-primary-500/30 rounded-lg outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-xs text-slate-800 dark:text-white transition-all shadow-sm" />
                        </div>
                      )}
                    </div>
                  )}
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
