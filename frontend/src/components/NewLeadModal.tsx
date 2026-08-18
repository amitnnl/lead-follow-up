import React, { useState, useEffect } from 'react';
import { X, User, Car, IndianRupee, MapPin, Plus, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import api from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import Modal from './ui/Modal';

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
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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
    customer_pan: '',
    customer_aadhaar: '',
    customer_dob: '',
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
    financer_lead_number: '',
    lead_date: new Date().toISOString().split('T')[0],
    query_notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setError('');
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
          customer_pan: initialData.customer_pan || '',
          customer_aadhaar: initialData.customer_aadhaar || '',
          customer_dob: initialData.customer_dob || '',
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
          financer_lead_number: initialData.financer_lead_number || '',
          lead_date: initialData.lead_date || new Date().toISOString().split('T')[0],
          query_notes: initialData.query_notes || ''
        });
      } else {
        setFormData({
          customer_name: '',
          customer_mobile: '',
          customer_mobile2: '',
          customer_address: '',
          customer_pan: '',
          customer_aadhaar: '',
          customer_dob: '',
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
          financer_lead_number: '',
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
    if (error) setError('');
  };

  const validateStep = (step: number) => {
    setError('');
    if (step === 1) {
      if (!formData.customer_name.trim()) {
        setError('Please enter the customer full name.');
        return false;
      }
      if (!formData.customer_mobile || formData.customer_mobile.length !== 10) {
        setError('Primary mobile number must be exactly 10 digits.');
        return false;
      }
      if (formData.customer_mobile2 && formData.customer_mobile2.length !== 10) {
        setError('Alternate mobile number must be exactly 10 digits.');
        return false;
      }
      if (!formData.customer_address.trim()) {
        setError('Please enter the residential address.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.vehicle_make_model.trim()) {
        setError('Please select or enter the vehicle make & model.');
        return false;
      }
      if (formData.vehicle_condition === 'old') {
        if (!formData.registration_number.trim()) {
          setError('Registration number is required for used vehicles.');
          return false;
        }
        if (!formData.year_of_manufacture) {
          setError('Year of manufacture is required for used vehicles.');
          return false;
        }
        if (!formData.insurance_company.trim()) {
          setError('Insurance company name is required for used vehicles.');
          return false;
        }
        if (!formData.policy_number.trim()) {
          setError('Insurance policy number is required for used vehicles.');
          return false;
        }
        if (!formData.insurance_expiry_date) {
          setError('Insurance expiry date is required for used vehicles.');
          return false;
        }
      }
    } else if (step === 3) {
      if (!formData.loan_amount || parseFloat(formData.loan_amount) <= 0) {
        setError('Please enter a valid requested loan amount.');
        return false;
      }
      if (!formData.lead_date) {
        setError('Please select the lead creation date.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3);
      }
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
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
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

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

  const inputClass = "w-full h-[44px] px-4 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:focus:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-slate-800 dark:text-white text-xs transition-all shadow-sm placeholder:text-slate-400";
  const labelClass = "block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} zClassName="z-[9999]" className="w-full max-w-3xl max-h-[96vh] bg-white dark:bg-[#162230] rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col my-auto overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#162230] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-500 shadow-md flex items-center justify-center text-white">
              {currentStep === 1 ? <User className="w-6 h-6" /> : currentStep === 2 ? <Car className="w-6 h-6" /> : <IndianRupee className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {initialData ? 'Edit Lead Dossier' : 'New Lead Dossier'}
              </h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Step {currentStep} of 3 — {currentStep === 1 ? 'Customer Profile' : currentStep === 2 ? 'Vehicle Details' : 'Finance & Sourcing'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Step Progress Indicator Bar */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
            
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => { if (currentStep > 1) setCurrentStep(1); }}
              className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 1 ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110' : currentStep > 1 ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === 1 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Customer</span>
            </button>

            <div className={`flex-1 h-1 rounded-full -mx-4 ${currentStep > 1 ? 'bg-primary-500/40' : 'bg-slate-200 dark:bg-slate-800'}`} />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => { if (currentStep > 2 || (currentStep === 1 && validateStep(1))) setCurrentStep(2); }}
              className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 2 ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110' : currentStep > 2 ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === 2 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Vehicle</span>
            </button>

            <div className={`flex-1 h-1 rounded-full -mx-4 ${currentStep > 2 ? 'bg-primary-500/40' : 'bg-slate-200 dark:bg-slate-800'}`} />

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => { if (currentStep === 3 || (validateStep(1) && validateStep(2))) setCurrentStep(3); }}
              className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                currentStep === 3 ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-110' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-300 dark:group-hover:bg-slate-700'
              }`}>
                3
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${currentStep === 3 ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Finance</span>
            </button>

          </div>
        </div>

        {/* Step Body View */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form id="new-lead-form" onSubmit={handleSubmit}>
            
            {/* STEP 1: Customer Profile */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="w-4 h-4" /> 1. Customer Personal & Contact Profile
                  </h3>
                  <span className="text-xs text-slate-400">Step 1 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Customer Full Name *</label>
                    <input required type="text" name="customer_name" value={formData.customer_name} onChange={handleChange} className={inputClass} placeholder="e.g. Rajesh Kumar" />
                  </div>

                  <div>
                    <label className={labelClass}>Primary Mobile Number *</label>
                    <input required type="tel" maxLength={10} pattern="^\d{10}$" title="Mobile number must be exactly 10 digits" name="customer_mobile" value={formData.customer_mobile} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="10 Digits (e.g. 9829012345)" />
                  </div>

                  <div>
                    <label className={labelClass}>Alternate Mobile Number</label>
                    <input type="tel" maxLength={10} pattern="^\d{10}$" title="Mobile number must be exactly 10 digits" name="customer_mobile2" value={formData.customer_mobile2} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Optional 10 Digits" />
                  </div>

                  <div className="sm:col-span-2 relative group">
                    <label className={labelClass}>Residential Address *</label>
                    <textarea required name="customer_address" value={formData.customer_address} onChange={handleChange} className="w-full px-4 pl-10 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:focus:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none h-24 text-slate-800 dark:text-white text-xs transition-all shadow-sm placeholder:text-slate-400" placeholder="Complete residential address with locality & city"></textarea>
                    <MapPin className="w-4 h-4 text-slate-400 group-focus-within:text-primary-500 absolute left-4 top-[36px] transition-colors" />
                  </div>

                  <div>
                    <label className={labelClass}>PAN Card Number</label>
                    <input type="text" maxLength={10} name="customer_pan" value={formData.customer_pan} onChange={handleChange} className={`${inputClass} font-mono uppercase`} placeholder="e.g. ABCDE1234F" />
                  </div>

                  <div>
                    <label className={labelClass}>Aadhaar Card Number</label>
                    <input type="text" maxLength={12} pattern="^\d{12}$" title="Aadhaar number must be 12 digits" name="customer_aadhaar" value={formData.customer_aadhaar} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="12 Digits" />
                  </div>

                  <div>
                    <label className={labelClass}>Date of Birth</label>
                    <input type="date" name="customer_dob" value={formData.customer_dob} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Vehicle Details */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest flex items-center gap-2">
                    <Car className="w-4 h-4" /> 2. Vehicle Condition & Specifications
                  </h3>
                  <span className="text-xs text-slate-400">Step 2 of 3</span>
                </div>

                {/* Condition Selector */}
                <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Vehicle Condition:</span>
                    <div className="inline-flex p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                      <button
                        type="button"
                        onClick={() => handleChange({ target: { name: 'vehicle_condition', value: 'new' } } as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          formData.vehicle_condition === 'new'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> New Vehicle
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange({ target: { name: 'vehicle_condition', value: 'old' } } as any)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          formData.vehicle_condition === 'old'
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" /> Used / Pre-Owned
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic">
                    {formData.vehicle_condition === 'new' 
                      ? "New Vehicle mode: Dealer network & New Loan parameters." 
                      : "Used Vehicle mode: Registration number, Mfg Year & Insurance tracking."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Make & Model *</label>
                    <input required type="text" name="vehicle_make_model" list="vehicle-suggestions" value={formData.vehicle_make_model} onChange={handleChange} className={inputClass} placeholder="e.g. Tata LPT 1512 / Mahindra Bolero Pickup" />
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

                  {formData.vehicle_condition === 'old' ? (
                    <>
                      <div>
                        <label className={labelClass}>Registration Number *</label>
                        <input required type="text" name="registration_number" value={formData.registration_number} onChange={handleChange} className={`${inputClass} font-mono uppercase`} placeholder="e.g. MH 04 AB 1234" />
                      </div>
                      <div>
                        <label className={labelClass}>Year of Manufacture *</label>
                        <input required type="number" min="1990" max="2030" name="year_of_manufacture" value={formData.year_of_manufacture} onChange={handleChange} className={inputClass} placeholder="YYYY (e.g. 2021)" />
                      </div>
                      
                      <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Pre-Existing Insurance Policy Info</span>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className={labelClass}>Insurance Co. Name *</label>
                            <input required type="text" name="insurance_company" value={formData.insurance_company} onChange={handleChange} className={inputClass} placeholder="e.g. ICICI Lombard" />
                          </div>
                          <div>
                            <label className={labelClass}>Policy Number *</label>
                            <input required type="text" name="policy_number" value={formData.policy_number} onChange={handleChange} className={`${inputClass} font-mono`} placeholder="Policy Number" />
                          </div>
                          <div>
                            <label className={labelClass}>Insurance Expiry Date *</label>
                            <input required type="date" name="insurance_expiry_date" value={formData.insurance_expiry_date} onChange={handleChange} className={inputClass} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 p-4 bg-emerald-50/80 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <strong className="block font-bold mb-0.5">New Vehicle Selected</strong>
                        Registration number, year of manufacture, and new insurance policy details will be updated automatically during invoicing and bank disbursal.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Finance & Sourcing */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" /> 3. Financial Requirements & Sourcing Network
                  </h3>
                  <span className="text-xs text-slate-400">Step 3 of 3</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Requested Loan Amount *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                      <input required type="number" name="loan_amount" value={formData.loan_amount} onChange={handleChange} className={`${inputClass} pl-8 font-mono font-semibold text-sm`} placeholder="0.00" />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Loan Product Category *</label>
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

                  <div>
                    <label className={labelClass}>Financer Ref / Lead No.</label>
                    <input type="text" name="financer_lead_number" value={formData.financer_lead_number} onChange={handleChange} className={inputClass} placeholder="Optional Bank Lead No." />
                  </div>

                  {!isSelfScopedAgent && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dealer Network Partner *</label>
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
                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Channels Partner *</label>
                        <button type="button" onClick={() => { setQuickAddType('channel_agent'); setQuickAddName(''); setQuickAddMobile(''); }} className="text-[10px] font-bold text-primary-600 hover:underline flex items-center gap-0.5 cursor-pointer">
                          <Plus className="w-3 h-3" /> Quick Add
                        </button>
                      </div>
                      <select required name="channel_executive_id" value={formData.channel_executive_id} onChange={handleChange} className={inputClass}>
                        <option value="">— Select Agent —</option>
                        {channelExecutives.map(ce => <option key={ce.id} value={ce.id}>{ce.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Query Notes / Remarks (Optional)</label>
                    <textarea name="query_notes" value={formData.query_notes} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white dark:bg-slate-900/50 dark:hover:bg-slate-900 dark:focus:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 resize-none h-24 text-slate-800 dark:text-white text-xs transition-all shadow-sm placeholder:text-slate-400" placeholder="Any additional information..."></textarea>
                  </div>
                </div>
              </div>
            )}

          </form>
        </div>

        {/* Footer Navigation Action Bar */}
        <div className="px-6 py-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 shrink-0">
          {currentStep > 1 ? (
            <Button type="button" variant="ghost" onClick={handleBack} disabled={loading}>
              Back
            </Button>
          ) : <div />}
          
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button type="button" variant="primary" onClick={handleNext} disabled={loading}>
                Continue to Step {currentStep + 1}
              </Button>
            ) : (
              <Button type="submit" form="new-lead-form" variant="primary" isLoading={loading}>
                {initialData ? 'Save Changes' : 'Create Lead Dossier'}
              </Button>
            )}
          </div>
        </div>

      </Modal>

      <Modal isOpen={!!quickAddType} onClose={() => setQuickAddType(null)} zClassName="z-[10050]" className="bg-white dark:bg-[#111622] rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-slate-800 p-5">
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
            <input required type="text" value={quickAddName} onChange={e => setQuickAddName(e.target.value)} placeholder="Full Name" className="w-full h-[42px] px-3 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs text-slate-800 dark:text-white transition-all" />
          </div>
          <div>
            <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
            <input required type="text" value={quickAddMobile} onChange={e => setQuickAddMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 Digits" className="w-full h-[42px] px-3 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-xs font-mono text-slate-800 dark:text-white transition-all" />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setQuickAddType(null)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold cursor-pointer">Cancel</button>
            <button type="submit" disabled={quickAddLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-1 cursor-pointer disabled:opacity-75 shadow-sm shadow-primary-500/20">
              {quickAddLoading ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
