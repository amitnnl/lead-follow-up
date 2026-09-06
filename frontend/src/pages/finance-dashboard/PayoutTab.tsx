import { useState, useEffect, useRef } from 'react';
import api from '../../lib/axios';
import { Search, Loader2, Upload, Building2, Calendar, TrendingUp, TrendingDown, IndianRupee, Plus, X, Save, Download, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import Modal from '../../components/ui/Modal';

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
  
  // New columns
  disb_date?: string;
  loan_amount?: string;
  loan_account_no?: string;
  irr?: string;
  code_name_no?: string;
  vehicle?: string;
  reg_no?: string;
  financer_branch?: string;
  payout_percent?: string;
  gross_payout_amount?: string;
  tds_amt?: string;
  igst?: string;
  sgst?: string;
  gst_paid?: string;
  net_payout?: string;
  channel_name?: string;
  channel_paid_amt?: string;
  balance_payout?: string;
}

interface ProfitStats {
  total_payouts_received: number;
  client_comm_retained: number;
  gross_income: number;
  total_channel_paid: number;
  total_office_expenses: number;
  tds_total: number;
  gst_total: number;
  expenses_total: number;
  net_profit: number;
}

export default function PayoutTab() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [profitStats, setProfitStats] = useState<ProfitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState({
    disb_date: '',
    customer_name: '',
    reg_no: '',
    vehicle: '',
    loan_amount: '',
    financer_name: '',
    loan_account_no: '',
    irr: '',
    code_name_no: '',
    financer_branch: '',
    payout_percent: '',
    gross_payout_amount: '',
    tds_amt: '',
    igst: '',
    sgst: '',
    gst_paid: '',
    net_payout: '',
    channel_name: '',
    channel_paid_amt: '',
    balance_payout: '',
    payout_received_date: new Date().toISOString().slice(0, 10),
    remarks: '',
    status: ''
  });

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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.post('/payouts.php?action=edit', { ...newEntry, id: editingId });
      } else {
        await api.post('/payouts.php?action=add', newEntry);
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      fetchData();
      setNewEntry({
        disb_date: '', customer_name: '', reg_no: '', vehicle: '', loan_amount: '',
        financer_name: '', loan_account_no: '', irr: '',
        code_name_no: '', financer_branch: '', payout_percent: '', gross_payout_amount: '',
        tds_amt: '', igst: '', sgst: '', gst_paid: '', net_payout: '', channel_name: '',
        channel_paid_amt: '', balance_payout: '', payout_received_date: new Date().toISOString().slice(0, 10),
        remarks: '', status: ''
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
      disb_date: row.disb_date || '',
      customer_name: row.customer_name || '',
      reg_no: row.reg_no || row.lead_code || '',
      vehicle: row.vehicle || '',
      loan_amount: row.loan_amount || '',
      financer_name: row.financer_name || row.display_financer || '',
      loan_account_no: row.loan_account_no || '',
      irr: row.irr || '',
      code_name_no: row.code_name_no || '',
      financer_branch: row.financer_branch || '',
      payout_percent: row.payout_percent || '',
      gross_payout_amount: row.gross_payout_amount || '',
      tds_amt: row.tds_amt || '',
      igst: row.igst || '',
      sgst: row.sgst || '',
      gst_paid: row.gst_paid || '',
      net_payout: row.net_payout || '',
      channel_name: row.channel_name || '',
      channel_paid_amt: row.channel_paid_amt || '',
      balance_payout: row.balance_payout || '',
      payout_received_date: row.payout_received_date ? row.payout_received_date.slice(0, 10) : '',
      remarks: row.remarks || '',
      status: row.status || ''
    });
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payout entry?')) return;
    try {
      const res = await api.post('/payouts.php?action=delete', { id });
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete entry.');
    }
  };

  const exportToCSV = () => {
    if (!payouts.length) {
      const templateHeaders = [
        "Disb Date", "LOAN ACCOUNT NO", "CUSTOMER NAME", "LOAN AMOUNT", "IRR", "CODE NAME & NO",
        "VEHICLE", "REG. NO", "FINANCER", "FINANCER BRANCH", "PAYOUT%", "GROSS PAYOUT AMOUNT",
        "TDS", "IGST", "SGST", "GST PAID", "NET PAYOUT", "CHANNEL NAME", "CHANNEL PAID AMT",
        "Payment Date", "BALANCE PAYOUT", "Status", "Remarks"
      ];
      const csv = Papa.unparse([templateHeaders]);
      downloadCSV(csv, 'payouts_template.csv');
      return;
    }

    const data = payouts.map(row => ({
      "Disb Date": row.disb_date || '',
      "LOAN ACCOUNT NO": row.loan_account_no || '',
      "CUSTOMER NAME": row.customer_name || '',
      "LOAN AMOUNT": row.loan_amount || '0',
      "IRR": row.irr || '',
      "CODE NAME & NO": row.code_name_no || '',
      "VEHICLE": row.vehicle || '',
      "REG. NO": row.reg_no || row.lead_code || '',
      "FINANCER": row.display_financer || '',
      "FINANCER BRANCH": row.financer_branch || '',
      "PAYOUT%": row.payout_percent || '',
      "GROSS PAYOUT AMOUNT": row.gross_payout_amount || row.payout_received_amt || '0',
      "TDS": row.tds_amt || '0',
      "IGST": row.igst || '0',
      "SGST": row.sgst || '0',
      "GST PAID": row.gst_paid || '0',
      "NET PAYOUT": row.net_payout || row.payout_received_amt || '0',
      "CHANNEL NAME": row.channel_name || '',
      "CHANNEL PAID AMT": row.channel_paid_amt || '0',
      "Payment Date": row.payout_received_date ? row.payout_received_date.slice(0, 10) : '',
      "BALANCE PAYOUT": row.balance_payout || '0',
      "Status": row.status || '',
      "Remarks": row.remarks || ''
    }));
    
    const csv = Papa.unparse(data);
    downloadCSV(csv, `payouts_export_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              disb_date: getVal(['Disb Date', 'Disbursed Date']),
              loan_account_no: getVal(['LOAN ACCOUNT NO', 'Loan Account No', 'LOAN ACC']),
              customer_name: getVal(['CUSTOMER NAME', 'Customer Name', 'Customer']),
              loan_amount: getVal(['LOAN AMOUNT', 'Loan Amount', 'LOAN AMO']),
              irr: getVal(['IRR']),
              code_name_no: getVal(['CODE NAME & NO', 'CODE NAM']),
              vehicle: getVal(['VEHICLE', 'Vehicle']),
              reg_no: getVal(['REG. NO', 'Reg No']),
              financer_name: getVal(['FINANCER', 'Financer', 'Financer Name']),
              financer_branch: getVal(['FINANCER BRANCH', 'Financer Branch']),
              payout_percent: getVal(['PAYOUT%', 'PAYOUT %', 'Payout %']),
              gross_payout_amount: getVal(['GROSS PAYOUT AMOUNT', 'Gross Payout', 'Payout Amount', 'Amount']),
              tds_amt: getVal(['TDS']),
              igst: getVal(['IGST']),
              sgst: getVal(['SGST']),
              gst_paid: getVal(['GST PAID', 'GST']),
              net_payout: getVal(['NET PAYOUT', 'Net Payout', 'NET PAYO']),
              channel_name: getVal(['CHANNEL NAME', 'CHANNEL']),
              channel_paid_amt: getVal(['CHANNEL PAID AMT', 'CHANNEL PAID AMIT', 'Channel Paid Amt']),
              payout_received_date: getVal(['Payment Date', 'Date Received', 'Date', 'Payment D']),
              balance_payout: getVal(['BALANCE PAYOUT', 'Balance']),
              status: getVal(['Status']),
              remarks: getVal(['Remarks'])
            };
          });

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

  const filtered = payouts.filter(p => {
    const searchString = Object.values(p).join(' ').toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) return false;
    
    // Use payout_received_date for filtering if available, else fallback to disb_date
    const compareDate = p.payout_received_date || p.disb_date || '';
    if (startDate && compareDate < startDate) return false;
    if (endDate && compareDate > endDate) return false;
    
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-500" /> Financer Payout
          </h2>
          <p className="text-sm text-slate-500">Import and track company earnings from financers</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Payouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
              title="Start Date"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500"
              title="End Date"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingId(null);
                setNewEntry({
                  disb_date: '', customer_name: '', reg_no: '', vehicle: '', loan_amount: '',
                  financer_name: '', loan_account_no: '', irr: '',
                  code_name_no: '', financer_branch: '', payout_percent: '', gross_payout_amount: '',
                  tds_amt: '', igst: '', sgst: '', gst_paid: '', net_payout: '', channel_name: '',
                  channel_paid_amt: '', balance_payout: '', payout_received_date: new Date().toISOString().slice(0, 10),
                  remarks: '', status: ''
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border border-indigo-200 dark:border-indigo-800 shrink-0"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Payout</span>
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 shrink-0"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
            >
              {payouts.length ? <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
              <span className="hidden sm:inline">{payouts.length ? 'Export Data' : 'Download Template'}</span>
            </button>
          </div>
        </div>
      </div>

      {profitStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Gross Company Income</p>
              <h3 className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">₹{(profitStats.gross_income || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">Payouts: ₹{(profitStats.total_payouts_received || 0).toLocaleString()} + Comm: ₹{(profitStats.client_comm_retained || 0).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Net Payout / Channel</p>
              <h3 className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">₹{(profitStats.total_channel_paid || 0).toLocaleString()}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Tax & Expenses</p>
              <h3 className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">₹{(profitStats.total_office_expenses || 0).toLocaleString()}</h3>
              <p className="text-[10px] text-slate-400 mt-1">TDS: ₹{(profitStats.tds_total || 0).toLocaleString()} | GST: ₹{(profitStats.gst_total || 0).toLocaleString()} | Exp: ₹{(profitStats.expenses_total || 0).toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">Net Company Profit</p>
              <h3 className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">₹{(profitStats.net_profit || 0).toLocaleString()}</h3>
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
                <th className="px-4 py-3 font-semibold">Dates (Disb & Pmt)</th>
                <th className="px-4 py-3 font-semibold">CUSTOMER NAME</th>
                <th className="px-4 py-3 font-semibold">Financer & Branch</th>
                <th className="px-4 py-3 font-semibold">Loan A/C & IRR</th>
                <th className="px-4 py-3 font-semibold text-right">Gross Payout</th>
                <th className="px-4 py-3 font-semibold text-right">TDS / GST</th>
                <th className="px-4 py-3 font-semibold text-right">Net Payout / Channel</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading payouts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-500">No financer payouts found.</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    No payouts found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                          <span className="w-8">Disb:</span>
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3 h-3" />
                            {p.disb_date || 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                          <span className="w-8">Pmt:</span>
                          <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Calendar className="w-3 h-3" />
                            {p.payout_received_date ? new Date(p.payout_received_date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-white">{p.customer_name || '—'}</span>
                        {p.lead_code && <span className="text-xs text-slate-500 dark:text-slate-400">ID: {p.lead_code}</span>}
                        {p.reg_no && p.reg_no !== p.lead_code && <span className="text-xs text-slate-500">Reg: {p.reg_no}</span>}
                        {p.vehicle && <span className="text-xs text-slate-500 dark:text-slate-400">Veh: {p.vehicle}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-300 font-bold">{p.display_financer || 'Unknown'}</div>
                      {p.financer_branch && <div className="text-xs text-slate-500 mt-0.5">Br: {p.financer_branch}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="font-mono text-xs">{p.loan_account_no || 'N/A'}</div>
                      {(p.irr || p.payout_percent) && (
                        <div className="text-xs mt-0.5">
                          {p.irr ? `IRR: ${p.irr}` : ''} {p.payout_percent ? `| ${p.payout_percent}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      ₹{parseFloat(p.gross_payout_amount || p.payout_received_amt || '0').toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      <div className="text-rose-500">TDS: ₹{parseFloat(p.tds_amt || '0').toLocaleString()}</div>
                      <div className="text-amber-500">GST: ₹{parseFloat(p.gst_paid || '0').toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 text-right bg-emerald-50/30 dark:bg-emerald-900/10">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ₹{parseFloat(p.net_payout || p.payout_received_amt || '0').toLocaleString()}
                      </div>
                      <div className="mt-1 pt-1 border-t border-emerald-200/50 dark:border-emerald-800/50 flex flex-col items-end">
                        <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                          {p.channel_name || p.code_name_no || 'Direct'}
                        </span>
                        {p.channel_paid_amt && p.channel_paid_amt !== '0' && p.channel_paid_amt !== '0.00' && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            Paid: ₹{parseFloat(p.channel_paid_amt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 text-right">
                      ₹{parseFloat(p.balance_payout || '0').toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[150px] truncate" title={p.remarks}>
                      {p.remarks || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEditClick(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors">
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

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
            {editingId ? 'Edit Payout' : 'Add Manual Payout'}
          </h3>
          <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAddSubmit} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Disb Date</label>
              <input type="date" value={newEntry.disb_date} onChange={e => setNewEntry({...newEntry, disb_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Loan Account No</label>
              <input type="text" value={newEntry.loan_account_no} onChange={e => setNewEntry({...newEntry, loan_account_no: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Customer Name</label>
              <input type="text" required value={newEntry.customer_name} onChange={e => setNewEntry({...newEntry, customer_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Loan Amount</label>
              <input type="number" step="0.01" value={newEntry.loan_amount} onChange={e => setNewEntry({...newEntry, loan_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">IRR</label>
              <input type="text" value={newEntry.irr} onChange={e => setNewEntry({...newEntry, irr: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Code Name & No</label>
              <input type="text" value={newEntry.code_name_no} onChange={e => setNewEntry({...newEntry, code_name_no: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Vehicle</label>
              <input type="text" value={newEntry.vehicle} onChange={e => setNewEntry({...newEntry, vehicle: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reg No / Lead Code</label>
              <input type="text" required value={newEntry.reg_no} onChange={e => setNewEntry({...newEntry, reg_no: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Financer</label>
              <input type="text" required value={newEntry.financer_name} onChange={e => setNewEntry({...newEntry, financer_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Financer Branch</label>
              <input type="text" value={newEntry.financer_branch} onChange={e => setNewEntry({...newEntry, financer_branch: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payout %</label>
              <input type="text" value={newEntry.payout_percent} onChange={e => setNewEntry({...newEntry, payout_percent: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Gross Payout Amount</label>
              <input type="number" step="0.01" value={newEntry.gross_payout_amount} onChange={e => setNewEntry({...newEntry, gross_payout_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">TDS Amount</label>
              <input type="number" step="0.01" value={newEntry.tds_amt} onChange={e => setNewEntry({...newEntry, tds_amt: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">IGST</label>
              <input type="number" step="0.01" value={newEntry.igst} onChange={e => setNewEntry({...newEntry, igst: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SGST</label>
              <input type="number" step="0.01" value={newEntry.sgst} onChange={e => setNewEntry({...newEntry, sgst: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">GST Paid</label>
              <input type="number" step="0.01" value={newEntry.gst_paid} onChange={e => setNewEntry({...newEntry, gst_paid: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Net Payout</label>
              <input type="number" step="0.01" value={newEntry.net_payout} onChange={e => setNewEntry({...newEntry, net_payout: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Channel Name</label>
              <input type="text" value={newEntry.channel_name} onChange={e => setNewEntry({...newEntry, channel_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Channel Paid Amt</label>
              <input type="number" step="0.01" value={newEntry.channel_paid_amt} onChange={e => setNewEntry({...newEntry, channel_paid_amt: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Date</label>
              <input type="date" required value={newEntry.payout_received_date} onChange={e => setNewEntry({...newEntry, payout_received_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Balance Payout</label>
              <input type="number" step="0.01" value={newEntry.balance_payout} onChange={e => setNewEntry({...newEntry, balance_payout: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Status</label>
              <select value={newEntry.status} onChange={e => setNewEntry({...newEntry, status: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="">Blank / Unpaid</option>
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Remarks</label>
              <textarea value={newEntry.remarks} onChange={e => setNewEntry({...newEntry, remarks: e.target.value})} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"></textarea>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/30 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
