import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { 
  UsersRound, Search, Plus, Edit, Trash2, X, 
  CreditCard, ShieldCheck, CheckCircle2, Lock 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

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

// ── Top-Level Modal Component (Outside parent scope to guarantee stable input focus during typing) ──

function AgentModal({
  isOpen,
  onClose,
  onSubmit,
  editingExec,
  formData,
  setFormData
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  editingExec: ChannelExecutive | null;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-xl bg-white dark:bg-[#111827] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-scale-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UsersRound className="w-5 h-5 text-primary-500" />
            {editingExec ? 'Edit Channel Agent Profile' : 'Add Channel Agent'}
          </h2>
          <button onClick={onClose} type="button" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Agent Full Name *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white font-medium" 
                  placeholder="e.g. Rahul Sharma" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                <input 
                  required 
                  type="text" 
                  value={formData.mobile} 
                  onChange={e => setFormData({...formData, mobile: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white font-mono" 
                  placeholder="10 digits" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white" 
                  placeholder="agent@example.com" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select 
                  value={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white font-semibold"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>

            {/* Portal Login Access Card */}
            <div className="p-4 rounded-xl bg-primary-50/70 dark:bg-primary-950/20 border border-primary-200/80 dark:border-primary-800/40 space-y-3.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      Portal Login Access
                      {formData.enable_portal_access && (
                        <span className="text-[10px] bg-emerald-500 text-white font-semibold px-1.5 py-0.5 rounded uppercase">Active</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Allow this agent to log in and submit/track their own leads</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.enable_portal_access} 
                    onChange={e => setFormData({...formData, enable_portal_access: e.target.checked})} 
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {formData.enable_portal_access && (
                <div className="pt-3 border-t border-primary-200/50 dark:border-primary-800/40 space-y-3 animate-fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {editingExec && (editingExec.user_id || editingExec.user_email) ? 'Reset Portal Password (optional)' : 'Set Portal Password *'}
                      </label>
                      <button 
                        type="button" 
                        onClick={() => {
                          const randomPwd = 'Agent@' + Math.floor(1000 + Math.random() * 9000);
                          setFormData({...formData, portal_password: randomPwd});
                        }} 
                        className="text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>⚡ Auto-Generate</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={formData.portal_password} 
                      onChange={e => setFormData({...formData, portal_password: e.target.value})} 
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border border-primary-200 dark:border-primary-800/60 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white font-mono text-sm shadow-sm" 
                      placeholder={editingExec && (editingExec.user_id || editingExec.user_email) ? "Leave blank to keep current password" : "Enter secure password (e.g. Agent@1234)"} 
                    />
                  </div>
                  <div className="text-[11px] text-primary-700 dark:text-primary-300 bg-white/60 dark:bg-slate-900/40 p-2.5 rounded-lg border border-primary-100 dark:border-primary-800/30 flex items-center gap-1.5">
                    <span>ℹ️</span>
                    <span>Agent will log into the portal using <strong>{formData.email || 'their email address'}</strong> and this password.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bank & Tax Details Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary-500" /> Payout Banking & KYC Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Bank Name</label>
                  <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white" placeholder="e.g. HDFC Bank" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">PAN Number</label>
                  <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white uppercase font-mono" placeholder="e.g. ABCDE1234F" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Account Number</label>
                  <input type="text" value={formData.bank_account} onChange={e => setFormData({...formData, bank_account: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white font-mono" placeholder="Account Number" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IFSC Code</label>
                  <input type="text" value={formData.ifsc_code} onChange={e => setFormData({...formData, ifsc_code: e.target.value.toUpperCase()})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 text-slate-800 dark:text-white uppercase font-mono" placeholder="e.g. HDFC0001234" />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2.5 font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700">Cancel</button>
            <button type="submit" className="px-5 py-2.5 font-semibold text-sm bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-colors cursor-pointer">
              {editingExec ? 'Save Profile' : 'Add Channel Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ── Top-Level Row Component (Outside parent scope) ──
function AgentRow({
  ex,
  isAdminOrManager,
  onEdit,
  onDelete
}: {
  ex: ChannelExecutive;
  isAdminOrManager: boolean;
  onEdit: (ex: ChannelExecutive) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3.5 align-top">
        <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          {ex.name}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">Authorized Channel Agent</div>
      </td>
      <td className="px-4 py-3.5 align-top text-xs font-mono text-slate-600 dark:text-slate-300">
        <div className="font-semibold text-slate-800 dark:text-slate-200">{ex.mobile}</div>
        {ex.email && <div className="text-slate-400 font-sans mt-0.5">{ex.email}</div>}
      </td>
      <td className="px-4 py-3.5 align-top text-xs font-mono text-slate-600 dark:text-slate-300">
        {ex.bank_account ? (
          <div>
            <div className="font-sans font-medium text-slate-800 dark:text-slate-200">{ex.bank_name || 'Bank'}</div>
            <div className="text-slate-500">{ex.bank_account} ({ex.ifsc_code})</div>
            {ex.pan_number && <div className="text-[10px] text-slate-400 mt-0.5">PAN: {ex.pan_number}</div>}
          </div>
        ) : <span className="text-slate-400 font-sans italic">Not configured</span>}
      </td>
      <td className="px-4 py-3.5 align-top">
        {ex.user_id ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/30">
            <CheckCircle2 className="w-3 h-3" /> Enabled
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
            <button onClick={() => onEdit(ex)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer" title="Edit"><Edit className="w-4 h-4" /></button>
            <button onClick={() => onDelete(ex.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Main Page Component ──
export default function ChannelExecutives() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';
  
  const [executives, setExecutives] = useState<ChannelExecutive[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExec, setEditingExec] = useState<ChannelExecutive | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', channel_id: '', user_id: '',
    bank_name: '', bank_account: '', ifsc_code: '', pan_number: '', is_active: 1,
    enable_portal_access: false, portal_password: ''
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/setup/channel_executives');
      setExecutives(res.data.channel_executives || []);
    } catch (error) {
      console.error('Failed to fetch channel agents', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (exec?: ChannelExecutive) => {
    if (exec) {
      setEditingExec(exec);
      setFormData({
        name: exec.name || '',
        mobile: exec.mobile || '',
        email: exec.email || '',
        channel_id: exec.channel_id?.toString() || '',
        user_id: exec.user_id?.toString() || '',
        bank_name: exec.bank_name || '',
        bank_account: exec.bank_account || '',
        ifsc_code: exec.ifsc_code || '',
        pan_number: exec.pan_number || '',
        is_active: exec.is_active,
        enable_portal_access: Boolean(exec.user_id || exec.user_email),
        portal_password: ''
      });
    } else {
      setEditingExec(null);
      setFormData({ 
        name: '', mobile: '', email: '', channel_id: '', user_id: '', 
        bank_name: '', bank_account: '', ifsc_code: '', pan_number: '', 
        is_active: 1, enable_portal_access: false, portal_password: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExec) {
        await api.put('/setup/channel_executives', { id: editingExec.id, ...formData });
      } else {
        await api.post('/setup/channel_executives', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save channel agent');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this channel agent?')) return;
    try {
      await api.delete(`/setup/channel_executives?id=${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete channel agent');
    }
  };

  const filteredExecutives = useMemo(() => executives.filter(ex => 
    ex.name.toLowerCase().includes(search.toLowerCase()) || 
    (ex.email && ex.email.toLowerCase().includes(search.toLowerCase())) ||
    ex.mobile.includes(search)
  ), [executives, search]);

  const totalAgents = executives.length;
  const activeAgents = executives.filter(ex => ex.is_active).length;
  const portalEnabled = executives.filter(ex => ex.user_id).length;
  const bankConfigured = executives.filter(ex => ex.bank_account && ex.ifsc_code).length;

  return (
    <div className="space-y-6 animate-fade-in select-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2.5">
            <UsersRound className="text-primary-500 w-6 h-6" /> Channels
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your sourcing channels & agents, capture payout bank accounts & KYC details, and enable DSA portal logins.
          </p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer">
          <Plus className="w-4 h-4" /> Add Channel / Agent
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Agents</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1">{totalAgents}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <UsersRound className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeAgents}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Portal Logins</p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{portalEnabled}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#111827] p-4.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bank Configured</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{bankConfigured}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by agent name, mobile or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white transition-all"
          />
        </div>
      </div>

      {/* Main Content Area - Table View */}
      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Agent Name</th>
                <th className="px-4 py-3 font-medium">Contact Details</th>
                <th className="px-4 py-3 font-medium">Payout Bank & A/C</th>
                <th className="px-4 py-3 font-medium">Portal Access</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">Loading agents...</td></tr>
              ) : filteredExecutives.map(ex => (
                <AgentRow
                  key={ex.id}
                  ex={ex}
                  isAdminOrManager={isAdminOrManager}
                  onEdit={handleOpenModal}
                  onDelete={handleDelete}
                />
              ))}
              {!loading && filteredExecutives.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm">No channel agents found. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top-Level Modal */}
      <AgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        editingExec={editingExec}
        formData={formData}
        setFormData={setFormData}
      />
    </div>
  );
}
