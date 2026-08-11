import { useState, useEffect, useRef } from 'react';
import api from '../../lib/axios';
import { Search, Loader2, Upload, Building2, Calendar, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import Papa from 'papaparse';

interface Payout {
  id: number;
  lead_id: number;
  lead_code: string;
  customer_name: string;
  display_financer: string;
  payout_received_amt: string;
  payout_received_date: string;
  status: string;
  remarks: string;
}

interface ProfitStats {
  total_payouts_received: number;
  client_comm_retained: number;
  gross_income: number;
  total_office_expenses: number;
  net_profit: number;
}

export default function PayoutTab() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payoutRes, profitRes] = await Promise.all([
        api.get('/payouts.php?action=list'),
        api.get('/profit.php')
      ]);
      if (payoutRes.data.payouts) {
        setPayouts(payoutRes.data.payouts);
      }
      if (profitRes.data && !profitRes.data.error) {
        setProfitStats(profitRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
            lead_code: row['Lead'] || row['Lead Code'] || '',
            customer_name: row['Customer'] || row['Customer Name'] || '',
            financer_name: row['Financer'] || row['Financer Name'] || '',
            payout_received_amt: row['Payout Amount'] || row['Amount'] || 0,
            payout_received_date: row['Date Received'] || row['Date'] || '',
            remarks: row['Remarks'] || ''
          }));

          const res = await api.post('/payouts.php?action=upload', { rows });
          if (res.data.success) {
            alert(`Imported ${res.data.inserted} financer payouts.`);
            fetchData();
          }
        } catch (err) {
          console.error('Upload failed', err);
          alert('Failed to upload payout data.');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    });
  };

  const filtered = payouts.filter(p => 
    p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.lead_code?.toLowerCase().includes(search.toLowerCase()) ||
    p.display_financer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Financer Payout
          </h2>
          <p className="text-sm text-slate-500">Import and track company earnings from financers</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 shrink-0"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="hidden sm:inline">Import CSV</span>
          </button>
        </div>
      </div>

      {profitStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Gross Company Income</p>
              <h3 className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">₹{profitStats.gross_income.toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Payouts: ₹{profitStats.total_payouts_received.toLocaleString()} + Comm: ₹{profitStats.client_comm_retained.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Office Expenses</p>
              <h3 className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">₹{profitStats.total_office_expenses.toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Net Company Profit</p>
              <h3 className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{profitStats.net_profit.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-emerald-600 dark:text-emerald-300" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Lead Details</th>
                <th className="px-6 py-4 font-semibold">Financer</th>
                <th className="px-6 py-4 font-semibold text-right">Amount Received</th>
                <th className="px-6 py-4 font-semibold">Date Received</th>
                <th className="px-6 py-4 font-semibold">Remarks</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading payouts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No financer payouts found.</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.customer_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{p.lead_code || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {p.display_financer || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{parseFloat(p.payout_received_amt || '0').toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">
                        <Calendar className="w-3.5 h-3.5" />
                        {p.payout_received_date ? new Date(p.payout_received_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs max-w-[200px] truncate" title={p.remarks}>
                      {p.remarks || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
