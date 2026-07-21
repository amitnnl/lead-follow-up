import React, { useState, useEffect } from 'react';
import { X, User, Car, IndianRupee, MapPin, Plus } from 'lucide-react';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLeadId: number) => void;
  initialData?: any;
}

export default function NewLeadModal({ isOpen, onClose, onSuccess, initialData }: NewLeadModalProps) {
  const { user } = useAuthStore();
  const isSelfScopedAgent = user?.role === 'channel_agent' || user?.role === 'agent';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [agents, setAgents] = useState<any[]>([]);
  const [channelExecutives, setChannelExecutives] = useState<any[]>([]);

  const [quickAddType, setQuickAddType] = useState<'dealer' | 'channel_agent' | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddMobile, setQuickAddMobile] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_mobile: '',
    customer_mobile2: '',
    customer_address: '',
    vehicle_condition: 'new',
    vehicle_make_model: '',
    year_of_manufacture: '',
    registration_number: '',
    insurance_company: '',
    policy_number: '',
    insurance_expiry_date: '',
    loan_amount: '',
    loan_type: 'new_loan',
    referred_by: '',
    agent_id: '',
    channel_id: '',
    channel_executive_id: '',
    lead_date: new Date().toISOString().split('T')[0],
    query_notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (!isSelfScopedAgent) {
        Promise.all([
          api.get('/setup/agents'),
          api.get('/setup/channel_executives')
        ]).then(([agentsRes, chanExecsRes]) => {
          setAgents(agentsRes.data.agents || []);
          setChannelExecutives(chanExecsRes.data.channel_executives || []);
        });
      }

      if (initialData) {
        setFormData({
          customer_name: initialData.customer_name || '',
          customer_mobile: initialData.customer_mobile || '',
          customer_mobile2: initialData.customer_mobile2 || '',
          customer_address: initialData.customer_address || '',
          vehicle_condition: initialData.vehicle_condition || 'new',
          vehicle_make_model: initialData.vehicle_make_model || '',
          year_of_manufacture: initialData.year_of_manufacture?.toString() || '',
          registration_number: initialData.registration_number || '',
          insurance_company: initialData.insurance_company || '',
          policy_number: initialData.policy_number || '',
          insurance_expiry_date: initialData.insurance_expiry_date || '',
          loan_amount: initialData.loan_amount?.toString() || '',
          loan_type: initialData.loan_type || 'new_loan',
          referred_by: initialData.referred_by || '',
          agent_id: initialData.agent_id?.toString() || '',
          channel_id: initialData.channel_id?.toString() || '',
          channel_executive_id: initialData.channel_executive_id?.toString() || '',
          lead_date: initialData.lead_date || new Date().toISOString().split('T')[0],
          query_notes: initialData.query_notes || ''
        });
      } else {
        setFormData({
          customer_name: '',
          customer_mobile: '',
          customer_mobile2: '',
          customer_address: '',
          vehicle_condition: 'new',
          vehicle_make_model: '',
          year_of_manufacture: '',
          registration_number: '',
          insurance_company: '',
          policy_number: '',
          insurance_expiry_date: '',
          loan_amount: '',
          loan_type: 'new_loan',
          referred_by: '',
          agent_id: '',
          channel_id: '',
          channel_executive_id: '',
          lead_date: new Date().toISOString().split('T')[0],
          query_notes: ''
        });
      }
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (e.target.name === 'customer_mobile' || e.target.name === 'customer_mobile2') {
      val = val.replace(/\D/g, '').slice(0, 10);
    }
    const updates: any = { [e.target.name]: val };
    if (e.target.name === 'vehicle_condition') {
      if (val === 'old') {
        updates.loan_type = formData.loan_type === 'new_loan' ? 'refinance' : formData.loan_type;
      } else if (val === 'new') {
        updates.loan_type = 'new_loan';
        updates.registration_number = '';
        updates.year_of_manufacture = '';
        updates.insurance_company = '';
        updates.policy_number = '';
        updates.insurance_expiry_date = '';
      }
    }
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName || !quickAddMobile) return;
    setQuickAddLoading(true);
    try {
      if (quickAddType === 'dealer') {
        const res = await api.post('/setup/agents', { name: quickAddName, mobile: quickAddMobile, is_active: 1 });
        const newAgentId = res.data?.id;
        const agentsRes = await api.get('/setup/agents');
        setAgents(agentsRes.data.agents || []);
        if (newAgentId) {
          setFormData(prev => ({ ...prev, agent_id: newAgentId.toString() }));
        }
      } else if (quickAddType === 'channel_agent') {
        const res = await api.post('/setup/channel_executives', { name: quickAddName, mobile: quickAddMobile, is_active: 1 });
        const newExecId = res.data?.id;
        const chanExecsRes = await api.get('/setup/channel_executives');
        setChannelExecutives(chanExecsRes.data.channel_executives || []);
        if (newExecId) {
          setFormData(prev => ({ ...prev, channel_executive_id: newExecId.toString() }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.customer_mobile && formData.customer_mobile.length !== 10) {
      setError('Primary mobile number must be exactly 10 digits.');
      return;
    }
    if (formData.customer_mobile2 && formData.customer_mobile2.length !== 10) {
      setError('Alternate mobile number must be exactly 10 digits.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        loan_amount: parseFloat(formData.loan_amount) || 0,
        year_of_manufacture: formData.year_of_manufacture ? parseInt(formData.year_of_manufacture) : null,
        agent_id: formData.agent_id ? parseInt(formData.agent_id) : null,
        channel_id: formData.channel_id ? parseInt(formData.channel_id) : null,
        channel_executive_id: formData.channel_executive_id ? parseInt(formData.channel_executive_id) : null
      };

      if (initialData?.id) {
        await api.put('/leads', { ...payload, id: initialData.id });
        onSuccess(initialData.id);
      } else {
        const response = await api.post('/leads', payload);
        onSuccess(response.data.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || (initialData ? 'Failed to update lead' : 'Failed to create lead'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white text-xs transition-all shadow-2xs";
  const labelClass = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#111622] rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-full overflow-hidden animate-scale-in duration-200">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            {initialData ? 'Edit Lead Dossier Details' : 'Create New Lead Dossier'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <form id="new-lead-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Smart Vehicle Condition Dropdown */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-6">
              <label className={labelClass}>Lead Type *</label>
              <select 
                required 
                name="vehicle_condition" 
                value={formData.vehicle_condition} 
                onChange={handleChange} 
                className={`${inputClass} font-semibold`}
              >
                <option value="new">✨ New Vehicle</option>
                <option value="old">🚗 Used / Pre-Owned</option>
              </select>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 italic">
                {formData.vehicle_condition === 'new' 
                  ? "Configuring new vehicle fields (Dealer network selection, New Loan types)." 
                  : "Configuring used vehicle fields (Registration details, Manufacture Year, Insurance policy tracking, Refinance types)."}
              </p>
            </div>

            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <User className="w-4 h-4" /> Customer Profile
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Full Name *</label>
                  <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className={inputClass} placeholder="John Doe" />
                </div>
                <div>
                  <label className={labelClass}>Primary Mobile *</label>
                  <input required type="tel" maxLength={10} pattern="^\d{10}$" title="Mobile number must be exactly 10 digits" name="customer_mobile" value={formData.customer_mobile} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="9876543210" />
                </div>
                <div>
                  <label className={labelClass}>Alternate Mobile</label>
                  <input type="tel" maxLength={10} pattern="^\d{10}$" title="Mobile number must be exactly 10 digits" name="customer_mobile2" value={formData.customer_mobile2} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Optional" />
                </div>
                <div className="md:col-span-2 relative">
                  <label className={labelClass}>Address *</label>
                  <textarea required name="customer_address" value={formData.customer_address} onChange={handleChange} className="w-full p-2.5 pl-8 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none h-16 text-slate-800 dark:text-white text-sm" placeholder="Full residential address"></textarea>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-[35px]" />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Car className="w-4 h-4" /> Vehicle Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Make & Model *</label>
                  <input required type="text" name="vehicle_make_model" list="vehicle-suggestions" value={formData.vehicle_make_model} onChange={handleChange} className={inputClass} placeholder="e.g. Tata LPT 1512" />
                  <datalist id="vehicle-suggestions">
                    <option value="Tata Ace Gold" />
                    <option value="Mahindra Bolero Pickup" />
                    <option value="Tata LPT 1512" />
                    <option value="Eicher Pro 2049" />
                    <option value="Ashok Leyland Dost" />
                    <option value="BharatBenz 1917R" />
                    <option value="Maruti Suzuki Swift" />
                    <option value="Hyundai Creta" />
                    <option value="Maruti Suzuki Ertiga" />
                    <option value="Tata Nexon" />
                    <option value="Mahindra XUV700" />
                    <option value="Toyota Innova Crysta" />
                    <option value="Tata Punch" />
                  </datalist>
                </div>
                {formData.vehicle_condition === 'old' && (
                  <>
                    <div>
                      <label className={labelClass}>Registration Number *</label>
                      <input required type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className={inputClass} placeholder="e.g. MH 04 AB 1234" />
                    </div>
                    <div>
                      <label className={labelClass}>Year of Manufacture *</label>
                      <input required type="number" min="1990" max="2030" name="year_of_manufacture" value={formData.year_of_manufacture} onChange={handleChange} className={inputClass} placeholder="YYYY" />
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Old Vehicle Insurance Details</span>
                    </div>
                    <div>
                      <label className={labelClass}>Insurance Company Name *</label>
                      <input required type="text" name="insurance_company" value={formData.insurance_company} onChange={handleChange} className={inputClass} placeholder="e.g. ICICI Lombard" />
                    </div>
                    <div>
                      <label className={labelClass}>Policy Number *</label>
                      <input required type="text" name="policy_number" value={formData.policy_number} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Policy No." />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Insurance Expiry Date *</label>
                      <input required type="date" name="insurance_expiry_date" value={formData.insurance_expiry_date} onChange={handleChange} className={inputClass} />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Financial Details & Network Sourcing */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                <IndianRupee className="w-4 h-4" /> Financials & Sourcing Network
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Requested Loan Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                    <input required type="number" name="loan_amount" value={formData.loan_amount} onChange={handleChange} className={`${inputClass} pl-7`} placeholder="0.00" />
                  </div>
                </div>
                 <div>
                   <label className={labelClass}>Loan Type</label>
                   {formData.vehicle_condition === 'new' ? (
                     <select disabled name="loan_type" value="new_loan" className={`${inputClass} opacity-75 cursor-not-allowed`}>
                       <option value="new_loan">New Loan</option>
                     </select>
                   ) : (
                     <select required name="loan_type" value={formData.loan_type} onChange={handleChange} className={inputClass}>
                       <option value="refinance">Refinance</option>
                       <option value="repurchase">Repurchase</option>
                       <option value="bt">BT (Balance Transfer)</option>
                     </select>
                   )}
                 </div>
                <div>
                  <label className={labelClass}>Lead Date *</label>
                  <input required type="date" name="lead_date" value={formData.lead_date} onChange={handleChange} className={inputClass} />
                </div>
                {!isSelfScopedAgent && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dealer *</label>
                      <button type="button" onClick={() => { setQuickAddType('dealer'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Plus className="w-3 h-3" /> Quick Add
                      </button>
                    </div>
                    <select required name="agent_id" value={formData.agent_id} onChange={handleChange} className={`${inputClass} text-xs`}>
                      <option value="">— Direct / None —</option>
                      {agents.map(ag => <option key={ag.id} value={ag.id}>{ag.name}</option>)}
                    </select>
                  </div>
                )}
                {!isSelfScopedAgent && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Channels *</label>
                      <button type="button" onClick={() => { setQuickAddType('channel_agent'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                        <Plus className="w-3 h-3" /> Quick Add
                      </button>
                    </div>
                    <select required name="channel_executive_id" value={formData.channel_executive_id} onChange={handleChange} className={`${inputClass} text-xs`}>
                      <option value="">— Select Agent —</option>
                      {channelExecutives.map(ce => <option key={ce.id} value={ce.id}>{ce.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className={labelClass}>Query / Notes</label>
                  <textarea name="query_notes" value={formData.query_notes} onChange={handleChange} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none h-14 text-slate-800 dark:text-white text-sm" placeholder="Any queries or remarks..."></textarea>
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button 
            type="submit" 
            form="new-lead-form"
            disabled={loading}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-primary-500/20 disabled:opacity-75 cursor-pointer"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : null}
            {initialData ? 'Update Lead' : 'Create Lead'}
          </button>
        </div>

      </div>

      {quickAddType && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111622] rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5 animate-scale-in">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-primary-600" />
                Quick Add {quickAddType === 'dealer' ? 'Dealer' : 'Channels'}
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
              <div>
                <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                <input required type="text" value={quickAddMobile} onChange={e => setQuickAddMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 Digits" className="w-full p-2.5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs font-mono text-slate-800 dark:text-white transition-all" />
              </div>
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
