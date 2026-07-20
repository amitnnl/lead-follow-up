import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { 
  Share2, UsersRound, Search, Plus, Edit, Trash2, X, 
  Building2, CreditCard, Lock, CheckCircle2 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface Channel {
  id: number;
  name: string;
  contact_person: string;
  mobile: string;
  email: string;
  notes: string;
  is_active: number;
}

interface ChannelExecutive {
  id: number;
  user_id?: number | null;
  user_email?: string;
  user_name?: string;
  user_is_active?: number;
  channel_id: number | null;
  channel_name?: string;
  name: string;
  mobile: string;
  email: string;
  bank_name?: string;
  bank_account?: string;
  ifsc_code?: string;
  pan_number?: string;
  is_active: number;
}

// ── Top-Level Helper Components (Out of parent scope to prevent typing focus loss) ──

function AgencyModal({
  isOpen,
  onClose,
  onSubmit,
  editingChannel,
  formData,
  setFormData
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingChannel: Channel | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-scale-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-500" />
            {editingChannel ? 'Edit Outsourcing Agency' : 'Add Outsourcing Agency'}
          </h2>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Agency / Firm Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="e.g. Apex Marketing Firm" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person</label>
                <input type="text" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="Contact Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <input type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-mono" placeholder="10 digits" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="email@agency.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white">
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Agreement / Terms Notes</label>
              <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="Commission terms, partnership details..." />
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">Cancel</button>
            <button type="submit" className="px-5 py-2.5 font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer">
              {editingChannel ? 'Save Changes' : 'Add Agency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AgentModal({
  isOpen,
  onClose,
  onSubmit,
  editingExec,
  formData,
  setFormData,
  channels
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingExec: ChannelExecutive | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  channels: Channel[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-scale-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-indigo-500" />
            {editingExec ? 'Edit Channels Profile' : 'Add Channels Profile'}
          </h2>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Agent Full Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="Full Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Link to Outsourcing Agency</label>
                <select value={formData.channel_id} onChange={e => setFormData({...formData, channel_id: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white">
                  <option value="">— Independent / No Agency Link —</option>
                  {channels.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                <input required type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white font-mono" placeholder="10 digits" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="email@domain.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white">
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            {/* Payout Banking Section */}
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/30 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-500" /> Commission Payout Banking
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bank Name</label>
                  <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Account Number</label>
                  <input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono text-slate-800 dark:text-white" placeholder="Account No" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">IFSC Code</label>
                  <input type="text" value={formData.ifsc_code} onChange={e => setFormData({...formData, ifsc_code: e.target.value.toUpperCase()})} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono uppercase text-slate-800 dark:text-white" placeholder="e.g. HDFC0001234" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">PAN Number</label>
                  <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono uppercase text-slate-800 dark:text-white" placeholder="e.g. ABCDE1234F" />
                </div>
              </div>
            </div>

            {/* One-Click Portal Login Access */}
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Enable Portal Login Access
                  </h3>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-0.5">Allow this agent to log in and submit/track self-sourced leads.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={formData.enable_portal_access} onChange={e => setFormData({...formData, enable_portal_access: e.target.checked})} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.enable_portal_access && (
                <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mb-1">Portal Login Email *</label>
                    <input required={formData.enable_portal_access} type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs outline-none focus:border-indigo-500 text-slate-800 dark:text-white" placeholder="Must enter agent email" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                      {editingExec && editingExec.user_id ? 'Reset Password (optional)' : 'Initial Password *'}
                    </label>
                    <input required={formData.enable_portal_access && (!editingExec || !editingExec.user_id)} type="text" value={formData.portal_password} onChange={e => setFormData({...formData, portal_password: e.target.value})} className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs outline-none focus:border-indigo-500 font-mono text-slate-800 dark:text-white" placeholder={editingExec && editingExec.user_id ? 'Leave blank to keep current' : 'Set login password'} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">Cancel</button>
            <button type="submit" className="px-5 py-2.5 font-semibold text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer">
              {editingExec ? 'Save Agent Profile' : 'Add Channels'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Channels() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';
  
  // Tab control: 'agencies' (Outsourcing Companies) vs 'agents' (Field Agents & Payouts)
  const [activeTab, setActiveTab] = useState<'agencies' | 'agents'>('agencies');

  // State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [executives, setExecutives] = useState<ChannelExecutive[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isAgencyModalOpen, setIsAgencyModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [agencyFormData, setAgencyFormData] = useState({
    name: '', contact_person: '', mobile: '', email: '', notes: '', is_active: 1
  });

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingExec, setEditingExec] = useState<ChannelExecutive | null>(null);
  const [agentFormData, setAgentFormData] = useState({
    name: '', mobile: '', email: '', channel_id: '', user_id: '',
    bank_name: '', bank_account: '', ifsc_code: '', pan_number: '', is_active: 1,
    enable_portal_access: false, portal_password: ''
  });

  const fetchData = async () => {
    try {
      const [chRes, exRes] = await Promise.all([
        api.get('/setup/channels'),
        api.get('/setup/channel_executives')
      ]);
      setChannels(chRes.data.channels || []);
      setExecutives(exRes.data.channel_executives || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for Agency Tab
  const handleOpenAgencyModal = (channel?: Channel) => {
    if (channel) {
      setEditingChannel(channel);
      setAgencyFormData({
        name: channel.name || '',
        contact_person: channel.contact_person || '',
        mobile: channel.mobile || '',
        email: channel.email || '',
        notes: channel.notes || '',
        is_active: channel.is_active
      });
    } else {
      setEditingChannel(null);
      setAgencyFormData({ name: '', contact_person: '', mobile: '', email: '', notes: '', is_active: 1 });
    }
    setIsAgencyModalOpen(true);
  };

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingChannel) {
        await api.put('/setup/channels', { id: editingChannel.id, ...agencyFormData });
      } else {
        await api.post('/setup/channels', agencyFormData);
      }
      setIsAgencyModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save agency');
    }
  };

  const handleAgencyDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this agency?')) return;
    try {
      await api.delete(`/setup/channels?id=${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete agency');
    }
  };

  // Handlers for Agent Tab
  const handleOpenAgentModal = (exec?: ChannelExecutive) => {
    if (exec) {
      setEditingExec(exec);
      setAgentFormData({
        name: exec.name || '',
        mobile: exec.mobile || '',
        email: exec.email || '',
        channel_id: exec.channel_id ? exec.channel_id.toString() : '',
        user_id: exec.user_id ? exec.user_id.toString() : '',
        bank_name: exec.bank_name || '',
        bank_account: exec.bank_account || '',
        ifsc_code: exec.ifsc_code || '',
        pan_number: exec.pan_number || '',
        is_active: exec.is_active,
        enable_portal_access: !!exec.user_id,
        portal_password: ''
      });
    } else {
      setEditingExec(null);
      setAgentFormData({
        name: '', mobile: '', email: '', channel_id: '', user_id: '',
        bank_name: '', bank_account: '', ifsc_code: '', pan_number: '', is_active: 1,
        enable_portal_access: false, portal_password: ''
      });
    }
    setIsAgentModalOpen(true);
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (agentFormData.mobile && agentFormData.mobile.replace(/\D/g, '').length !== 10) {
      alert('Mobile number must be exactly 10 digits.');
      return;
    }
    try {
      if (editingExec) {
        await api.put('/setup/channel_executives', { id: editingExec.id, ...agentFormData });
      } else {
        await api.post('/setup/channel_executives', agentFormData);
      }
      setIsAgentModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save channels');
    }
  };

  const handleAgentDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete these channels?')) return;
    try {
      await api.delete(`/setup/channel_executives?id=${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete channels');
    }
  };

  // Filtering
  const filteredChannels = useMemo(() => channels.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_person && c.contact_person.toLowerCase().includes(search.toLowerCase())) ||
    (c.mobile && c.mobile.includes(search))
  ), [channels, search]);

  const filteredExecutives = useMemo(() => executives.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) || 
    (ex.channel_name && ex.channel_name.toLowerCase().includes(search.toLowerCase())) ||
    ex.mobile.includes(search)
  ), [executives, search]);

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <Share2 className="text-indigo-600 dark:text-indigo-400 w-6 h-6" /> Channel Partners & Agents
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unified management of outsourcing agencies, sourcing partners, field agents, and payout banking details.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'agencies' ? (
            <button onClick={() => handleOpenAgencyModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer">
              <Plus className="w-4 h-4" /> Add Outsourcing Agency
            </button>
          ) : (
            <button onClick={() => handleOpenAgentModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer">
              <Plus className="w-4 h-4" /> Add Channels
            </button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('agencies')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'agencies'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Sourcing Agencies / Firms</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'agencies' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {channels.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
              activeTab === 'agents'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-[1.02]'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UsersRound className="w-4 h-4" />
            <span>Field Agents & Payout Profiles</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'agents' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {executives.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={activeTab === 'agencies' ? "Search agencies or contacts..." : "Search agents or accounts..."} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: AGENCIES VIEW ── */}
      {activeTab === 'agencies' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Agency Name</th>
                  <th className="px-4 py-3 font-medium">Contact Person</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">Loading agencies...</td></tr>
                ) : filteredChannels.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-semibold text-slate-800 dark:text-white">{c.name}</div>
                      {c.notes && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{c.notes}</div>}
                    </td>
                    <td className="px-4 py-3.5 align-top text-slate-600 dark:text-slate-300">{c.contact_person || '—'}</td>
                    <td className="px-4 py-3.5 align-top font-mono text-slate-600 dark:text-slate-300">{c.mobile || '—'}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${c.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      {isAdminOrManager && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenAgencyModal(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleAgencyDelete(c.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filteredChannels.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400 text-sm">No agencies found. Click Add Outsourcing Agency above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: AGENTS & PAYOUT PROFILES VIEW ── */}
      {activeTab === 'agents' && (
        <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Agent Name</th>
                  <th className="px-4 py-3 font-medium">Linked Agency</th>
                  <th className="px-4 py-3 font-medium">Mobile & Email</th>
                  <th className="px-4 py-3 font-medium">Payout Bank & A/C</th>
                  <th className="px-4 py-3 font-medium">Portal Access</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">Loading agents...</td></tr>
                ) : filteredExecutives.map(ex => (
                  <tr key={ex.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 align-top font-semibold text-slate-800 dark:text-white">{ex.name}</td>
                    <td className="px-4 py-3.5 align-top text-slate-600 dark:text-slate-300">
                      {ex.channel_name ? (
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          <Building2 className="w-3 h-3" /> {ex.channel_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs font-mono text-slate-600 dark:text-slate-300">
                      <div>{ex.mobile}</div>
                      {ex.email && <div className="text-slate-400 font-sans">{ex.email}</div>}
                    </td>
                    <td className="px-4 py-3.5 align-top text-xs font-mono text-slate-600 dark:text-slate-300">
                      {ex.bank_account ? (
                        <div>
                          <div className="font-sans font-medium text-slate-800 dark:text-slate-200">{ex.bank_name || 'Bank'}</div>
                          <div className="text-slate-500">{ex.bank_account} ({ex.ifsc_code})</div>
                        </div>
                      ) : <span className="text-slate-400 font-sans italic">Not configured</span>}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {ex.user_id ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : <span className="text-slate-400 text-xs italic">Disabled</span>}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border ${ex.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ex.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {ex.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      {isAdminOrManager && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenAgentModal(ex)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleAgentDelete(ex.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && filteredExecutives.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">No channels found. Click Add Channels above.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top-level Modals */}
      <AgencyModal
        isOpen={isAgencyModalOpen}
        onClose={() => setIsAgencyModalOpen(false)}
        onSubmit={handleAgencySubmit}
        editingChannel={editingChannel}
        formData={agencyFormData}
        setFormData={setAgencyFormData}
      />

      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onSubmit={handleAgentSubmit}
        editingExec={editingExec}
        formData={agentFormData}
        setFormData={setAgentFormData}
        channels={channels}
      />
    </div>
  );
}
