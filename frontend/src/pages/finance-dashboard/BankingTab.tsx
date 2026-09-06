import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Loader2, Plus, X, Save, Download, Pencil, Trash2, Search } from 'lucide-react';
import Papa from 'papaparse';
import api from '../../lib/axios';
import Modal from '../../components/ui/Modal';

export default function BankingTab() {
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState({
    post_date: new Date().toISOString().slice(0, 10),
    customer_name: '',
    reg_no: '',
    loan_amount: '',
    status: 'Clear',
    account_description: '',
    utr_number: '',
    transaction_type: 'OTHER',
    debit_amount: '',
    credit_amount: '',
    pending_amount: '',
    remarks: '',
    bank_name: ''
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
          const rows = results.data.map((row: any) => {
            const getVal = (searchKeys: string[]) => {
              const exactMatch = searchKeys.find(k => row[k] !== undefined);
              if (exactMatch) return row[exactMatch];
              
              for (const key of Object.keys(row)) {
                const cleanKey = key.trim().toLowerCase();
                if (searchKeys.some(k => cleanKey.includes(k.toLowerCase()))) {
                  return row[key];
                }
              }
              return '';
            };

            return {
              date: getVal(['Transaction Date', 'Transaction', 'Date']),
              customer_name: getVal(['Customer Name', 'Customer', 'Name']),
              reg_no: getVal(['Reg. No.', 'Reg No', 'Registration']),
              loan_amount: getVal(['Loan Amt', 'Loan Amount']),
              status: 'Clear', // Defaulting since it's removed from UI
              account_description: getVal(['Description', 'Descriptic', 'Narration']),
              utr_number: getVal(['Cheque/Ref. No.', 'Cheque/Reference No.', 'Cheque/', 'Cheque', 'Reference', 'UTR']),
              debit_amount: getVal(['Debit (₹)', 'Debit (?)', 'Debit']),
              credit_amount: getVal(['Credit (₹)', 'Credit (?)', 'Credit']),
              pending_amount: getVal(['Pending Payment', 'Pending P', 'Pending']),
              remarks: getVal(['Remarks']),
              bank_name: getVal(['Financer', 'Bank Name'])
            };
          });

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
      if (editingId) {
        await api.post('/banking.php?action=edit', { ...newEntry, id: editingId });
      } else {
        await api.post('/banking.php?action=add', newEntry);
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      fetchBanking();
      setNewEntry({
        post_date: new Date().toISOString().slice(0, 10),
        customer_name: '',
        reg_no: '',
        loan_amount: '',
        status: 'Clear',
        account_description: '',
        utr_number: '',
        transaction_type: 'OTHER',
        debit_amount: '',
        credit_amount: '',
        pending_amount: '',
        remarks: '',
        bank_name: ''
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingId(row.id);
    setNewEntry({
      post_date: row.post_date ? row.post_date.slice(0, 10) : '',
      customer_name: row.customer_name || '',
      reg_no: row.reg_no || '',
      loan_amount: row.loan_amount || '',
      status: row.status || 'Clear',
      account_description: row.account_description || '',
      utr_number: row.utr_number || '',
      transaction_type: row.transaction_type || 'OTHER',
      debit_amount: row.debit_amount || '',
      credit_amount: row.credit_amount || '',
      pending_amount: row.pending_amount || '',
      remarks: row.remarks || '',
      bank_name: row.bank_name || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry? This will affect the running balance of subsequent entries.')) return;
    
    try {
      const res = await api.post('/banking.php?action=delete', { id });
      if (res.data.success) {
        fetchBanking();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete entry.');
    }
  };

  const exportToCSV = () => {
    const templateHeaders = [
      "Transaction Date", "Customer", "Reg. No.", "Loan Amt",
      "Description", "Cheque/Ref. No.", "Debit (₹)", "Credit (₹)",
      "Balance (₹)", "Pending Payment", "Remarks", "Financer"
    ];

    if (!entries.length) {
      const csvContent = "data:text/csv;charset=utf-8," + templateHeaders.join(",") + "\n";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "banking_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    const headers = templateHeaders;
    
    const rows = entries.map(row => [
      row.post_date ? new Date(row.post_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '') : '',
      `"${(row.customer_name || '').replace(/"/g, '""')}"`,
      `"${(row.reg_no || '').replace(/"/g, '""')}"`,
      row.loan_amount || 0,
      `"${(row.account_description || '').replace(/"/g, '""')}"`,
      `"${(row.utr_number || '').replace(/"/g, '""')}"`,
      row.debit_amount || 0,
      row.credit_amount || 0,
      row.running_balance || 0,
      row.pending_amount || 0,
      `"${(row.remarks || '').replace(/"/g, '""')}"`,
      `"${(row.bank_name || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `banking_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Ledger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              title="Start Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              title="End Date"
            />
          </div>
          
          <button
            onClick={() => {
              setEditingId(null);
              setNewEntry({
                post_date: new Date().toISOString().slice(0, 10),
                customer_name: '',
                reg_no: '',
                loan_amount: '',
                status: 'Clear',
                account_description: '',
                utr_number: '',
                transaction_type: 'OTHER',
                debit_amount: '',
                credit_amount: '',
                pending_amount: '',
                remarks: '',
                bank_name: ''
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-primary-200 dark:border-primary-800"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <Download className="w-4 h-4" /> 
            {entries.length ? 'Export CSV' : 'Export Template'}
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

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer Name</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reg. No.</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Loan Amt</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cheque/Ref. No.</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Debit (₹)</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Credit (₹)</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Balance (₹)</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Pending Payment</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remarks</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financer</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading banking data...
                  </td>
                </tr>
              ) : entries.filter(e => {
                const searchString = Object.values(e).join(' ').toLowerCase();
                if (search && !searchString.includes(search.toLowerCase())) return false;
                if (startDate && e.post_date < startDate) return false;
                if (endDate && e.post_date > endDate) return false;
                return true;
              }).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No entries found matching filters.
                  </td>
                </tr>
              ) : (
                entries.filter(e => {
                  const searchString = Object.values(e).join(' ').toLowerCase();
                  if (search && !searchString.includes(search.toLowerCase())) return false;
                  if (startDate && e.post_date < startDate) return false;
                  if (endDate && e.post_date > endDate) return false;
                  return true;
                }).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {new Date(row.post_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">
                      {row.customer_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      {row.reg_no || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                      {parseFloat(row.loan_amount) > 0 ? `₹${parseFloat(row.loan_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={row.account_description}>
                      {row.account_description || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono">
                      {row.utr_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 text-right">
                      {parseFloat(row.debit_amount) > 0 ? `₹${parseFloat(row.debit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {parseFloat(row.credit_amount) > 0 ? `₹${parseFloat(row.credit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-300 text-right">
                      ₹{parseFloat(row.running_balance).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 text-right">
                      {parseFloat(row.pending_amount) > 0 ? `₹${parseFloat(row.pending_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={row.remarks}>
                      {row.remarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {row.bank_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(row)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
                {editingId ? 'Edit Entry' : 'Add Manual Entry'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Transaction Date</label>
                  <input type="date" required value={newEntry.post_date} onChange={e => setNewEntry({...newEntry, post_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Customer Name</label>
                  <input type="text" value={newEntry.customer_name} onChange={e => setNewEntry({...newEntry, customer_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Reg. No.</label>
                  <input type="text" value={newEntry.reg_no} onChange={e => setNewEntry({...newEntry, reg_no: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Loan Amt</label>
                  <input type="number" step="0.01" value={newEntry.loan_amount} onChange={e => setNewEntry({...newEntry, loan_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Cheque/Ref No.</label>
                  <input type="text" value={newEntry.utr_number} onChange={e => setNewEntry({...newEntry, utr_number: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Debit (₹)</label>
                  <input type="number" step="0.01" value={newEntry.debit_amount} onChange={e => setNewEntry({...newEntry, debit_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Credit (₹)</label>
                  <input type="number" step="0.01" value={newEntry.credit_amount} onChange={e => setNewEntry({...newEntry, credit_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Pending Payment</label>
                  <input type="number" step="0.01" value={newEntry.pending_amount} onChange={e => setNewEntry({...newEntry, pending_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Financer</label>
                  <input type="text" value={newEntry.bank_name} onChange={e => setNewEntry({...newEntry, bank_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Description/Narration</label>
                <input type="text" required value={newEntry.account_description} onChange={e => setNewEntry({...newEntry, account_description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Remarks</label>
                <input type="text" value={newEntry.remarks} onChange={e => setNewEntry({...newEntry, remarks: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500" />
              </div>
              
              <div className="pt-2 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </form>
      </Modal>
    </div>
  );
}
