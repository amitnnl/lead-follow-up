import { useState, useEffect } from 'react';
import api from '../../lib/axios';
import { Search, Loader2, Save, Plus, X, ReceiptText, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';

interface OfficeExpense {
  id: number;
  expense_date: string;
  category: string;
  amount: number;
  remarks: string;
}

export const EXPENSE_CATEGORIES = [
  'Office Rent',
  'Salary',
  'Tea Expense',
  'Water expense',
  'Advertising Expenses',
  'Bank Charges',
  'Courier Charges',
  'Office Expenses',
  'Repairs and Maintenance Charges',
  'Stationery Exp',
  'Depreciation Exp',
  'Misc Exp. / Food exp',
  'Remuneration',
  'General'
];

export default function OfficeExpensesTab() {
  const [expenses, setExpenses] = useState<OfficeExpense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Tea Expense',
    amount: '',
    remarks: ''
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      let url = '/expenses.php?action=list';
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      const res = await api.get(url);
      if (res.data.expenses) {
        setExpenses(res.data.expenses);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [startDate, endDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/expenses.php?action=save', newExpense);
      setIsAdding(false);
      setNewExpense({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Tea Expense',
        amount: '',
        remarks: ''
      });
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await api.post('/expenses.php?action=delete', { id });
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    }
  };

  const filtered = expenses.filter(s => {
    const searchString = Object.values(s).join(' ').toLowerCase();
    return !search || searchString.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4 text-rose-500" /> Office Expenses
          </h2>
          <p className="text-xs text-slate-500">Track and categorize all operational and office expenses</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              title="Filter from date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              title="Filter to date"
            />
          </div>
          
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-xs text-slate-500 mb-0.5">Total Period Expenses</div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">₹{total.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-2.5 py-1.5 font-semibold">Date</th>
                <th className="px-2.5 py-1.5 font-semibold">Category</th>
                <th className="px-2.5 py-1.5 font-semibold text-right">Amount</th>
                <th className="px-2.5 py-1.5 font-semibold w-full">Remarks</th>
                <th className="px-2.5 py-1.5 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-rose-500" />
                    Loading expenses...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-slate-500">No expenses logged for this period.</td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(e.expense_date).toLocaleDateString()}
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      ₹{e.amount.toLocaleString()}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 truncate max-w-md">
                      {e.remarks || '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-sm sm:text-base">
            <ReceiptText className="w-4 h-4 text-rose-500" /> Log Office Expense
          </h3>
          <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-3 sm:p-4 space-y-2.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input 
              type="date" 
              required 
              value={newExpense.expense_date} 
              onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})} 
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select 
              required 
              value={newExpense.category} 
              onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} 
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (₹)</label>
            <input 
              type="number" 
              min="1" 
              step="0.01" 
              required 
              value={newExpense.amount} 
              onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})} 
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500" 
              placeholder="e.g. 5000"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
            <input 
              type="text" 
              value={newExpense.remarks} 
              onChange={(e) => setNewExpense({...newExpense, remarks: e.target.value})} 
              placeholder="Expense description..." 
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-rose-500" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
