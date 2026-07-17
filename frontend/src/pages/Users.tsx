import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { ShieldCheck, Search, Plus, Edit, Trash2, X, AlertCircle, ChevronDown, UserCheck, Users as UsersIcon, UserCog, Filter } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: number;
  created_at: string;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  admin: { label: 'Admin', icon: UserCog, color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/40' },
  manager: { label: 'Manager', icon: UserCheck, color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40' },
  finance_manager: { label: 'Manager', icon: UserCheck, color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40' },
  staff: { label: 'Staff', icon: UsersIcon, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-50 dark:bg-slate-800' },
  executive: { label: 'Field Exec', icon: UserCheck, color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/40' },
  agent: { label: 'DSA Agent', icon: UsersIcon, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-50 dark:bg-slate-800' },
  channel_agent: { label: 'Channel Agent', icon: UsersIcon, color: 'text-indigo-700 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-950/40' },
  rto_desk: { label: 'RTO Desk', icon: UserCog, color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-50 dark:bg-rose-950/40' },
  insurance_desk: { label: 'Insurance Desk', icon: UserCog, color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40' },
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
      active 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-rose-500')} />
      {active ? 'Active' : 'Locked'}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] || { label: role, icon: UsersIcon, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-50 dark:bg-slate-800' };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border', cfg.bgColor, 'dark:bg-opacity-40', cfg.color, 'border-current/20')}>
      <cfg.icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function ActionButtons({ onEdit, onDelete, disabled, isController }: { onEdit: () => void; onDelete: () => void; disabled?: boolean; isController: boolean }) {
  if (isController) {
    return (
      <span className="px-2.5 py-1 bg-purple-50/50 text-purple-600 dark:bg-purple-950/20 dark:border-purple-900 dark:text-purple-400 rounded-lg text-xs font-semibold border border-purple-100 dark:border-purple-900">Controller</span>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} disabled={disabled} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer" title="Edit"><Edit className="w-4 h-4" /></button>
      <button onClick={onDelete} disabled={disabled} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

function UserModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingUser, 
  formData, 
  setFormData, 
  currentUser 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (e: React.FormEvent) => void; 
  editingUser: User | null; 
  formData: any; 
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  currentUser?: any;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-500" />
            {editingUser ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-slate-800 dark:text-white" />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address (Login ID)</label>
            <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-slate-800 dark:text-white" />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Password {editingUser && <span className="text-slate-400 normal-case font-normal">(Leave blank to keep unchanged)</span>}
            </label>
            <input 
              type="text" 
              required={!editingUser} 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder={editingUser ? "••••••••" : ""}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-slate-850 dark:text-white" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Role</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-sm text-slate-800 dark:text-white">
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="channel_agent">Channel Agent</option>
                <option value="agent">DSA Agent</option>
                <option value="executive">Field Executive</option>
                <option value="admin">Admin</option>
                <option value="rto_desk">RTO Desk</option>
                <option value="insurance_desk">Insurance Desk</option>
              </select>
            </div>
            
            {editingUser && editingUser.id !== currentUser?.id && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Account Status</label>
                <select value={formData.is_active} onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-rose-500 text-sm text-slate-800 dark:text-white">
                  <option value={1}>Active</option>
                  <option value={0}>Locked / Inactive</option>
                </select>
              </div>
            )}
          </div>

          {formData.role === 'executive' && (
            <div className="flex items-start gap-2 mt-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 p-3 rounded-lg border border-amber-200 dark:border-amber-900/30 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>When creating an Executive, you must also add them to the <strong>Sales Force</strong> list mapped to this user account for them to receive leads.</p>
            </div>
          )}
          {formData.role === 'channel_agent' && (
            <div className="flex items-start gap-2 mt-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/30 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>When creating a Channel Agent user account, remember to link this login account under <strong>Setup → Channel Agents</strong> so their self-created leads are tracked properly.</p>
            </div>
          )}

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer">{editingUser ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'staff', is_active: 1
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/setup/users');
      setUsers(res.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        role: user.role === 'finance_manager' ? 'manager' : (user.role || 'staff'),
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'staff', is_active: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put('/setup/users', { id: editingUser.id, ...formData });
      } else {
        await api.post('/setup/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUser?.id) { alert('You cannot delete your own account.'); return; }
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await api.delete(`/setup/users?id=${id}`);
      fetchUsers();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to delete user'); }
  };

  const filteredUsers = useMemo(() => 
    users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && u.is_active === 1) || (filterStatus === 'inactive' && u.is_active === 0);
      const matchesRole = filterRole === 'all' || u.role === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    }), [users, search, filterStatus, filterRole]
  );

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active === 1).length,
    inactive: users.filter(u => u.is_active === 0).length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager' || u.role === 'finance_manager').length,
    executives: users.filter(u => u.role === 'executive').length,
    agents: users.filter(u => u.role === 'agent' || u.role === 'channel_agent').length,
  }), [users]);

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            User Management
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage system access, roles, and administrative privileges.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              showFilters 
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters <ChevronDown className={clsx('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-rose-500/25 cursor-pointer hover:shadow-md hover:shadow-rose-500/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add User
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Users</div>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-slate-500 dark:text-slate-400">{stats.inactive}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Locked</div>
        </div>
        <div className="bg-purple-50/50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.admins}</div>
          <div className="text-[10px] font-bold text-purple-500 dark:text-purple-400 uppercase tracking-wider">Admins</div>
        </div>
        <div className="bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.agents}</div>
          <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Agents</div>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.executives}</div>
          <div className="text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider">Executives</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card overflow-hidden">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full sm:w-auto flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by name, email, role..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-white">
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Locked Only</option>
                </select>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Role:</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-slate-800 dark:text-white">
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="finance_manager">Finance Manager</option>
                  <option value="staff">Staff</option>
                  <option value="executive">Executive</option>
                  <option value="agent">DSA Agent</option>
                  <option value="channel_agent">Channel Agent</option>
                  <option value="rto_desk">RTO Desk</option>
                  <option value="insurance_desk">Insurance Desk</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-rose-500 via-rose-400 to-purple-500" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email (Login)</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full border-2 border-rose-100 dark:border-rose-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-rose-600 animate-spin" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-slate-300 dark:text-slate-650" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">No users found</h3>
                      <p className="text-xs text-slate-400">
                        {search || filterStatus !== 'all' || filterRole !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first user to get started.'}
                      </p>
                      {(!search && filterStatus === 'all' && filterRole === 'all') && (
                        <button onClick={() => handleOpenModal()} className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
                          Add your first user \u2192
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-rose-50/20 dark:hover:bg-rose-500/5 transition-colors group">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-850 dark:text-slate-200 flex items-center gap-2">
                        {u.name}
                        {currentUser?.id === u.id && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full uppercase font-bold">You</span>}
                      </div>
                    </td>
                      <td className="px-4 py-4 font-mono text-slate-600 dark:text-slate-300 text-[11px]">{u.email}</td>
                      <td className="px-4 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge active={u.is_active === 1} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionButtons 
                          onEdit={() => handleOpenModal(u)} 
                          onDelete={() => handleDelete(u.id)} 
                          isController={u.role === 'admin'}
                        />
                      </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSubmit}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        currentUser={currentUser}
      />
    </div>
  );
}