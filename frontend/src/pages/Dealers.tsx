import React, { useEffect, useState, useMemo } from 'react';
import api from '../lib/axios';
import { User, Search, Plus, Edit, Trash2, X, Filter, ChevronDown } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

// ── Top-Level Helper Components (Extracted outside to prevent re-render focus loss) ──
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
      active 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
        : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
    )}>
      <span className={clsx('w-1 h-1 rounded-full', active ? 'bg-emerald-500' : 'bg-slate-400')} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ActionButtons({ onEdit, onDelete, disabled }: { onEdit: () => void; onDelete: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button onClick={onEdit} disabled={disabled} className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded transition-colors cursor-pointer" title="Edit">
        <Edit className="w-3.5 h-3.5" />
      </button>
      <button onClick={onDelete} disabled={disabled} className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded transition-colors cursor-pointer" title="Delete">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DealerRow({ dealer, onEdit, onDelete, isAdminOrManager }: { dealer: any; onEdit: () => void; onDelete: () => void; isAdminOrManager?: boolean }) {
  return (
    <tr className="hover:bg-primary-50/20 dark:hover:bg-primary-500/5 transition-colors group">
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-white text-xs truncate max-w-[200px]">{dealer.name}</div>
          </div>
        </div>
      </td>
      <td className="px-2 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">{dealer.mobile}</td>
      <td className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">{dealer.email || '—'}</td>
      <td className="px-2 py-1.5 font-mono uppercase text-xs text-slate-600 dark:text-slate-300">{dealer.pan_number || '—'}</td>
      <td className="px-2 py-1.5">
        <StatusBadge active={dealer.is_active === 1} />
      </td>
      <td className="px-2 py-1.5 text-right">
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} zClassName="z-[9999]" className="bg-white dark:bg-[#0F1420] rounded-xl shadow-2xl w-full max-w-lg max-h-[96vh] overflow-hidden flex flex-col my-auto border border-slate-200 dark:border-slate-800">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 flex items-center justify-center text-primary-500">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {editingDealer ? 'Edit Dealer Network Profile' : 'Add Dealer Network Partner'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure dealer contact, PAN, and active status</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-3 sm:p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dealer Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full h-[34px] px-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white" placeholder="e.g. Maruti Motors / Rajesh" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number *</label>
                  <input required type="text" value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} className="w-full h-[34px] px-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white font-mono" placeholder="10 digits" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PAN Number</label>
                  <input type="text" value={formData.pan_number} onChange={e => setFormData({...formData, pan_number: e.target.value})} className="w-full h-[34px] px-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white uppercase font-mono" placeholder="ABCDE1234F" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full h-[34px] px-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white" placeholder="dealer@example.com" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="is_active" checked={formData.is_active === 1} onChange={e => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} className="rounded text-primary-600 focus:ring-primary-600 cursor-pointer" />
                <label htmlFor="is_active" className="font-medium text-xs text-slate-600 dark:text-slate-300 cursor-pointer">Active Status</label>
              </div>
            </div>
          </div>
          <div className="px-4 py-2.5 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
            <button type="button" onClick={onClose} className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">Cancel</button>
            <button type="submit" className="px-3.5 py-1.5 text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm transition-colors cursor-pointer">{editingDealer ? 'Save Changes' : 'Create Dealer'}</button>
          </div>
        </form>
      </Modal>
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
    <div className="space-y-2.5 select-none">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-500/15 flex items-center justify-center">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            Dealer's
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Manage individual vehicle dealers and sourcing partners.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              showFilters 
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters <ChevronDown className={clsx('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-primary-500/25 cursor-pointer hover:shadow-md hover:shadow-primary-500/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Dealer
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-2" style={{ animationDelay: '50ms' }}>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-slate-800 dark:text-white">{stats.total}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Dealer's</div>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
          <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Active</div>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 text-center">
          <div className="text-xl font-black text-slate-500 dark:text-slate-400">{stats.inactive}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Inactive</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card overflow-hidden">
        <div className="p-2 sm:p-2.5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="relative max-w-sm w-full sm:w-auto flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search dealers by name or mobile..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="h-[32px] px-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-slate-800 dark:text-white">
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
        <div className="h-0.5 bg-gradient-to-r from-primary-500 via-primary-400 to-teal-400" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-2 py-1.5 font-medium">Dealer Name</th>
                <th className="px-2 py-1.5 font-medium">Mobile</th>
                <th className="px-2 py-1.5 font-medium">Email</th>
                <th className="px-2 py-1.5 font-medium">PAN Number</th>
                <th className="px-2 py-1.5 font-medium">Status</th>
                <th className="px-2 py-1.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="relative w-6 h-6">
                        <div className="absolute inset-0 rounded-full border-2 border-primary-100 dark:border-primary-500/20" />
                        <div className="absolute inset-0 rounded-full border-2 border-t-primary-600 animate-spin" />
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Loading dealers…</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDealers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-300 dark:text-slate-650" />
                      </div>
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">No dealers found</h3>
                      <p className="text-[11px] text-slate-400">
                        {search || filterStatus !== 'all' ? 'Try adjusting your search or filters.' : 'Create your first dealer to get started.'}
                      </p>
                      {(!search && filterStatus === 'all') && (
                        <button onClick={() => handleOpenModal()} className="mt-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline cursor-pointer">
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