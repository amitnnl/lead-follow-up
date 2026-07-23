import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { Landmark, Search, Plus, Edit, Trash2, X, Filter, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

interface Financer {
  id: number;
  name: string;
  mobile: string;
  notes: string;
  is_active: number;
  dsa_code?: string;
  email?: string;
  agents_count?: number;
  leads_count?: number;
  disbursed?: number;
  total_loan?: number;
}

// ── Top-Level Helper Components ───────────────────────────────────────
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
      active 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ActionButtons({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} disabled={disabled} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors cursor-pointer" title="Edit">
        <Edit className="w-4 h-4" />
      </button>
      <button onClick={onDelete} disabled={disabled} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer" title="Delete">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function FinancerRow({ financer, onEdit, onDelete, isAdmin }: { financer: Financer; onEdit: () => void; onDelete: () => void; isAdmin: boolean }) {
  return (
    <tr className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate max-w-[250px]">{financer.name}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
              {financer.mobile && <span><a href={`tel:${financer.mobile}`} className="hover:text-indigo-500">{financer.mobile}</a></span>}
              {financer.email && <span>• <a href={`mailto:${financer.email}`} className="hover:text-indigo-500">{financer.email}</a></span>}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">{financer.dsa_code || '—'}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{financer.agents_count || 0}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="font-extrabold text-slate-800 dark:text-slate-200">{financer.leads_count || 0}</span>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{financer.disbursed || 0}</span>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono whitespace-nowrap">
          {financer.total_loan ? `₹${Number(financer.total_loan).toLocaleString('en-IN')}` : '—'}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate" title={financer.notes}>{financer.notes || '—'}</div>
      </td>
      <td className="px-4 py-4 text-center">
        <StatusBadge active={financer.is_active === 1} />
      </td>
      <td className="px-4 py-4 text-right">
        {isAdmin && <ActionButtons onEdit={onEdit} onDelete={onDelete} />}
      </td>
    </tr>
  );
}

function FinancerModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingFin, 
  formData, 
  setFormData,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (e: React.FormEvent) => void; 
  editingFin: Financer | null; 
  formData: any; 
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-indigo-500" />
            {editingFin ? 'Edit Financer' : 'Add Financer'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Financer Name *</label>
              <input 
                required 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white" 
                placeholder="e.g. HDFC Bank, Bajaj Finance" 
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">DSA Code</label>
                <input 
                  type="text" 
                  value={formData.dsa_code} 
                  onChange={e => setFormData({...formData, dsa_code: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-sm" 
                  placeholder="DSA Code assigned by financer" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                <input 
                  type="text" 
                  value={formData.mobile} 
                  onChange={e => setFormData({...formData, mobile: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 font-mono text-slate-800 dark:text-white text-sm" 
                  placeholder="10 digits" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-sm" 
                  placeholder="Email" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                <select 
                  value={formData.is_active} 
                  onChange={e => setFormData({...formData, is_active: parseInt(e.target.value)})} 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-sm text-slate-800 dark:text-white"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes / Terms</label>
              <textarea 
                rows={2}
                value={formData.notes} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-white text-sm" 
                placeholder="Any important notes about payouts, SLAs, etc." 
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer">
              {editingFin ? 'Save Changes' : 'Add Financer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Financers() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  // ── State ──────────────────────────────────────────────────────────────
  const [financers, setFinancers] = useState<Financer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFin, setEditingFin] = useState<Financer | null>(null);
  const [formData, setFormData] = useState({
    name: '', dsa_code: '', mobile: '', email: '', notes: '', is_active: 1
  });

  // ── API & Handlers ────────────────────────────────────────────────────
  const fetchFinancers = async () => {
    try {
      const res = await api.get('/setup/financers');
      setFinancers(res.data.financers || []);
    } catch (error) {
      console.error('Failed to fetch financers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFinancers(); }, []);

  const handleOpenModal = (fin?: Financer) => {
    if (fin) {
      setEditingFin(fin);
      setFormData({
        name: fin.name || '',
        dsa_code: fin.dsa_code || '',
        mobile: fin.mobile || '',
        email: fin.email || '',
        notes: fin.notes || '',
        is_active: fin.is_active
      });
    } else {
      setEditingFin(null);
      setFormData({ name: '', dsa_code: '', mobile: '', email: '', notes: '', is_active: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFin) {
        await api.put('/setup/financers', { id: editingFin.id, ...formData });
      } else {
        await api.post('/setup/financers', formData);
      }
      setIsModalOpen(false);
      fetchFinancers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save financer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this financer?')) return;
    try {
      await api.delete(`/setup/financers?id=${id}`);
      fetchFinancers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete financer');
    }
  };

  const filteredFinancers = useMemo(() => 
    financers.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && f.is_active === 1) || (filterStatus === 'inactive' && f.is_active === 0);
      return matchesSearch && matchesStatus;
    }), [financers, search, filterStatus]
  );

  const stats = useMemo(() => ({
    total: financers.length,
    active: financers.filter(f => f.is_active === 1).length,
    inactive: financers.filter(f => f.is_active === 0).length
  }), [financers]);

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Financers & Banks
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage lending partners and branch details.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer',
              showFilters 
                ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters <ChevronDown className={clsx('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-indigo-500/25 cursor-pointer hover:shadow-md hover:shadow-indigo-500/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Financer
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Financers</div>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-slate-500 dark:text-slate-400">{stats.inactive}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inactive</div>
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
                placeholder="Search financers..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
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
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white">
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-400 to-teal-400" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Financer / Bank</th>
                <th className="px-4 py-3 font-medium">DSA Code</th>
                <th className="px-4 py-3 font-medium text-center">Agents</th>
                <th className="px-4 py-3 font-medium text-center">Leads</th>
                <th className="px-4 py-3 font-medium text-center">Disbursed</th>
                <th className="px-4 py-3 font-medium">Total Loan</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Loading financers…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredFinancers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Landmark className="w-6 h-6 text-slate-300 dark:text-slate-650" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">No financers found</h3>
                      <p className="text-xs text-slate-400">
                        {search || filterStatus !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first financer to get started.'}
                      </p>
                      {(!search && filterStatus === 'all') && (
                        <button onClick={() => handleOpenModal()} className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                          Add your first financer →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFinancers.map(f => (
                  <FinancerRow key={f.id} financer={f} onEdit={() => handleOpenModal(f)} onDelete={() => handleDelete(f.id)} isAdmin={isAdminOrManager} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <FinancerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSubmit}
        editingFin={editingFin}
        formData={formData}
        setFormData={setFormData}
      />
    </div>
  );
}