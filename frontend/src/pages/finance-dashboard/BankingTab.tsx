import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, Plus, X, Save } from 'lucide-react';
import Papa from 'papaparse';
import api from '../../lib/axios';

export default function BankingTab() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    post_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    reg_no: '',
    account_description: '',
    transaction_type: 'OTHER',
    debit_amount: '',
    credit_amount: '',
    remarks: ''
  });

  const fetchBanking = async () => {
    setLoading(true);
    try {
      const res = await api.get('/banking.php?action=list');
      setEntries(res.data.entries || []);
    } catch (err) {
      console.error('Failed to fetch banking entries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanking();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data.map((row: any) => ({
            date: row['Transaction Date'] || row['Date'] || row['date'],
            lead_code: row['Lead'] || row['Lead Code'] || '',
            customer_name: row['Customer Name'] || row['Name'] || '',
            loan_amount_received: row['Loan Amount Received'] || row['Amount'] || 0,
            bank_name: row['Bank Name'] || row['Bank'] || '',
            utr_number: row['UTR / Reference Number'] || row['UTR'] || row['Reference Number'] || '',
            status: row['Status'] || 'Clear'
          }));

          const res = await api.post('/banking.php?action=upload', { rows });
          if (res.data.success) {
            alert(`Imported ${res.data.inserted} entries.`);
            fetchBanking();
          }
        } catch (err) {
          console.error('Upload failed', err);
          alert('Failed to upload banking data.');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/banking.php?action=add', newEntry);
      setIsAddModalOpen(false);
      fetchBanking();
      setNewEntry({
        post_date: new Date().toISOString().slice(0, 10),
        customer_name: '',
        reg_no: '',
        account_description: '',
        transaction_type: 'OTHER',
        debit_amount: '',
        credit_amount: '',
        remarks: ''
      });
    } catch (err) {
      console.error(err);
      alert('Failed to add entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Bank Ledger
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Import your bank statements or manually add entries.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-primary-200 dark:border-primary-800"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload}
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer / Details</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Debit (Out)</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Credit (In)</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading banking data...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">No bank statements imported yet.</td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {new Date(row.post_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {row.customer_name || '—'}
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.reg_no}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={row.account_description}>{row.account_description || '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 text-right">
                      {parseFloat(row.debit_amount) > 0 ? `₹${parseFloat(row.debit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {parseFloat(row.credit_amount) > 0 ? `₹${parseFloat(row.credit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">
                      ₹{parseFloat(row.running_balance).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 dark:bg-black/40 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
                Add Manual Entry
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                <input 
                  type="date"
                  required
                  value={newEntry.post_date}
                  onChange={e => setNewEntry({...newEntry, post_date: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Debit (Out)</label>
                  <input 
                    type="number" step="0.01"
                    value={newEntry.debit_amount}
                    onChange={e => setNewEntry({...newEntry, debit_amount: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Credit (In)</label>
                  <input 
                    type="number" step="0.01"
                    value={newEntry.credit_amount}
                    onChange={e => setNewEntry({...newEntry, credit_amount: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
                <input 
                  type="text" required
                  value={newEntry.account_description}
                  onChange={e => setNewEntry({...newEntry, account_description: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
