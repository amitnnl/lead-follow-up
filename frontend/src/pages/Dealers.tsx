import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { User, Search, Plus, Edit, Trash2, X, Filter, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

// ── Top-Level Helper Components (Extracted outside to prevent re-render focus loss) ──
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

function DealerRow({ dealer, onEdit, onDelete, isAdminOrManager }: { dealer: any; onEdit: () => void; onDelete: () => void; isAdminOrManager?: boolean }) {
  return (
    <tr className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors group">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate max-w-[250px]">{dealer.name}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-slate-600 dark:text-slate-300">{dealer.mobile}</td>
      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{dealer.email || '—'}</td>
      <td className="px-4 py-4 font-mono uppercase text-slate-600 dark:text-slate-300">{dealer.pan_number || '—'}</td>
      <td className="px-4 py-4">
        <StatusBadge active={dealer.is_active === 1} />
      </td>
      <td className="px-4 py-4 text-right">
        {isAdminOrManager && <ActionButtons onEdit={onEdit} onDelete={onDelete} />}
      </td>
    </tr>
  );
}

function DealerModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingDealer, 
  formData, 
  setFormData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (e: React.FormEvent) => void; 
  editingDealer: any | null; 
  formData: any; 
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            {editingDealer ? 'Edit Dealer (DSA)' : 'Add Dealer (DSA)'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dealer (DSA) Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white" placeholder="e.g. Maruti Motors / Rajesh" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number *</label>
                <input required type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white font-mono" placeholder="10 digits" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">PAN Number</label>
                <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white uppercase font-mono" placeholder="ABCDE1234F" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white" placeholder="dealer@example.com" />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input type="checkbox" id="is_active" checked={formData.is_active === 1} onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} className="rounded text-indigo-600 focus:ring-indigo-600 cursor-pointer" />
              <label htmlFor="is_active" className="font-medium text-sm text-slate-600 dark:text-slate-300 cursor-pointer">Active Status</label>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer">
              {editingDealer ? 'Save Changes' : 'Add Dealer (DSA)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dealers() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';

  // ── State ──────────────────────────────────────────────────────────────
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', pan_number: '', is_active: 1
  });

  // ── API & Handlers ────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const res = await api.get('/setup/agents');
      setDealers(res.data.agents || []);
    } catch (error) {
      console.error('Failed to fetch dealers', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (dealer?: any) => {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        name: dealer.name || '',
        mobile: dealer.mobile || '',
        email: dealer.email || '',
        pan_number: dealer.pan_number || '',
        is_active: dealer.is_active
      });
    } else {
      setEditingDealer(null);
      setFormData({ name: '', mobile: '', email: '', pan_number: '', is_active: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDealer) {
        await api.put('/setup/agents', { id: editingDealer.id, ...formData });
      } else {
        await api.post('/setup/agents', formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save dealer');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dealer?')) return;
    try {
      await api.delete(`/setup/agents?id=${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete dealer');
    }
  };

  const filteredDealers = useMemo(() => 
    dealers.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.mobile.includes(search);
      const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && d.is_active === 1) || (filterStatus === 'inactive' && d.is_active === 0);
      return matchesSearch && matchesStatus;
    }), [dealers, search, filterStatus]
  );

  const stats = useMemo(() => ({
    total: dealers.length,
    active: dealers.filter(d => d.is_active === 1).length,
    inactive: dealers.filter(d => d.is_active === 0).length
  }), [dealers]);

  // ── Main Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            Dealers (DSA)
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Manage individual vehicle dealers (DSA) and sourcing partners.</p>
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
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Dealer (DSA)
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 animate-fade-in" style={{ animationDelay: '50ms' }}>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Dealers</div>
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
                placeholder="Search dealers by name or mobile..." 
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
                <th className="px-4 py-3 font-medium">Dealer Name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">PAN Number</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="relative w-8 h-8">
                        <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Loading dealers…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-300 dark:text-slate-650" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">No dealers found</h3>
                      <p className="text-xs text-slate-400">
                        {search || filterStatus !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first dealer to get started.'}
                      </p>
                      {(!search && filterStatus === 'all') && (
                        <button onClick={() => handleOpenModal()} className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                          Add your first dealer →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDealers.map(d => (
                  <DealerRow key={d.id} dealer={d} onEdit={() => handleOpenModal(d)} onDelete={() => handleDelete(d.id)} isAdminOrManager={isAdminOrManager} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <DealerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleSubmit}
        editingDealer={editingDealer}
        formData={formData}
        setFormData={setFormData}
      />
    </div>
  );
}