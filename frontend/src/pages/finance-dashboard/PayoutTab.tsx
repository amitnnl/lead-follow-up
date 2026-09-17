import { useState, useEffect, useRef, useMemo } from 'react';
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
  agent_commission?: string;
  balance_payout?: string;
}

interface ProfitStats {
  total_payouts_received: number;
  client_comm_retained: number;
  gross_income: number;
  total_channel_paid: number;
  total_office_expenses: number;
  tds_total: number;
  igst_total?: number;
  sgst_total?: number;
  gst_total: number;
  total_tax?: number;
  payout_taxes?: number;
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
      let profitUrl = '/profit.php';
      if (startDate && endDate) {
        profitUrl += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const [payoutRes, profitRes] = await Promise.all([
        api.get('/payouts.php?action=list'),
        api.get(profitUrl)
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
  }, [startDate, endDate]);

  const updateGrossOrTax = (field: string, value: string) => {
    const updated = { ...newEntry, [field]: value };
    const gross = parseFloat(field === 'gross_payout_amount' ? value : updated.gross_payout_amount) || 0;
    const tds = parseFloat(field === 'tds_amt' ? value : updated.tds_amt) || 0;
    const igst = parseFloat(field === 'igst' ? value : updated.igst) || 0;
    const sgst = parseFloat(field === 'sgst' ? value : updated.sgst) || 0;
    const channelPaid = parseFloat(field === 'channel_paid_amt' ? value : updated.channel_paid_amt) || 0;

    const totalTax = tds + igst + sgst;
    const netPayout = gross > 0 ? (gross - totalTax).toFixed(2) : updated.net_payout;
    const netNum = parseFloat(netPayout) || 0;
    const balancePayout = netNum > 0 ? (netNum - channelPaid).toFixed(2) : updated.balance_payout;

    updated.gst_paid = (igst + sgst).toFixed(2);
    updated.net_payout = netPayout;
    updated.balance_payout = balancePayout;
    setNewEntry(updated);
  };

  const updateChannelPaid = (val: string) => {
    const channelPaid = parseFloat(val) || 0;
    const net = parseFloat(newEntry.net_payout) || 0;
    const bal = net > 0 ? (net - channelPaid).toFixed(2) : newEntry.balance_payout;
    setNewEntry({ ...newEntry, channel_paid_amt: val, balance_payout: bal });
  };

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
      channel_paid_amt: row.channel_paid_amt || row.agent_commission || '',
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
      "CHANNEL PAID AMT": row.channel_paid_amt || row.agent_commission || '0',
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

  const summary = useMemo(() => {
    let gross = 0;
    let tds = 0;
    let igst = 0;
    let sgst = 0;
    let net = 0;
    let channel = 0;
    let balance = 0;

    filtered.forEach(p => {
      const g = parseFloat(p.gross_payout_amount || p.payout_received_amt || '0') || 0;
      const t = parseFloat(p.tds_amt || '0') || 0;
      let i = parseFloat(p.igst || '0') || 0;
      let s = parseFloat(p.sgst || '0') || 0;
      const gstPaid = parseFloat(p.gst_paid || '0') || 0;
      if (i === 0 && s === 0 && gstPaid > 0) {
        i = gstPaid / 2;
        s = gstPaid / 2;
      }
      const n = parseFloat(p.net_payout || '0') || (g - t - i - s);
      const c = parseFloat(p.channel_paid_amt || p.agent_commission || '0') || 0;
      const b = parseFloat(p.balance_payout || '0') || (n - c);

      gross += g;
      tds += t;
      igst += i;
      sgst += s;
      net += n;
      channel += c;
      balance += b;
    });

    const totalGst = igst + sgst;
    const totalTax = tds + totalGst;
    const netProfit = net - channel;

    return {
      gross,
      tds,
      igst,
      sgst,
      totalGst,
      totalTax,
      net,
      channel,
      balance,
      netProfit
    };
  }, [filtered]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" /> Financer Payout
          </h2>
          <p className="text-xs text-slate-500">Import and track company earnings from financers</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Payouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500"
              title="End Date"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5">
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
              className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-800 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Payout</span>
            </button>
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50 shrink-0"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0"
            >
              {payouts.length ? <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{payouts.length ? 'Export Data' : 'Download Template'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Gross Financer Payout</p>
            <h3 className="text-lg sm:text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              ₹{(summary.gross || profitStats?.gross_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Total gross earnings from financers
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase">Channel Paid Amt</p>
            <h3 className="text-lg sm:text-xl font-mono font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              ₹{(summary.channel || profitStats?.total_channel_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Total channel / agent payouts</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payout Taxes (TDS, IGST & SGST)</p>
              <h3 className="text-lg sm:text-xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                ₹{(summary.totalTax || profitStats?.total_tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
            <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 flex flex-wrap items-center gap-1">
              <span className="text-rose-600 dark:text-rose-400">
                TDS: ₹{(summary.tds || profitStats?.tds_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
              <span className="text-amber-600 dark:text-amber-400">
                IGST: ₹{(summary.igst || profitStats?.igst_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
              <span className="text-amber-600 dark:text-amber-400">
                SGST: ₹{(summary.sgst || profitStats?.sgst_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 sm:p-3 border border-emerald-200 dark:border-emerald-800/50 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Net Company Profit</p>
            <h3 className="text-xl sm:text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{(summary.netProfit || profitStats?.net_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
              Net retained earnings from payouts
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-auto relative custom-scrollbar max-h-[calc(100vh-270px)] min-h-[420px]">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-xs">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Dates (Disb & Pmt)</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">CUSTOMER NAME</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Financer & Branch</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Loan A/C & IRR</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-slate-700 dark:text-slate-300">Gross Payout</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-rose-600 dark:text-rose-400">TDS</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-amber-600 dark:text-amber-400">IGST</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-amber-600 dark:text-amber-400">SGST</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-emerald-600 dark:text-emerald-400">Net Payout</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-slate-700 dark:text-slate-300">Channel & Paid Amt</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-slate-700 dark:text-slate-300">Balance</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Remarks</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">Status</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-right text-slate-700 dark:text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading payouts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-500">
                    No payouts found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const grossVal = parseFloat(p.gross_payout_amount || p.payout_received_amt || '0') || 0;
                  const tdsVal = parseFloat(p.tds_amt || '0') || 0;
                  let igstVal = parseFloat(p.igst || '0') || 0;
                  let sgstVal = parseFloat(p.sgst || '0') || 0;
                  const gstPaidVal = parseFloat(p.gst_paid || '0') || 0;
                  if (igstVal === 0 && sgstVal === 0 && gstPaidVal > 0) {
                    igstVal = gstPaidVal / 2;
                    sgstVal = gstPaidVal / 2;
                  }
                  const netVal = parseFloat(p.net_payout || '0') || (grossVal - tdsVal - igstVal - sgstVal);
                  const balVal = parseFloat(p.balance_payout || '0') || (netVal - (parseFloat(p.channel_paid_amt || p.agent_commission || '0') || 0));

                  return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                            <span className="w-7">Disb:</span>
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              <Calendar className="w-3 h-3" />
                              {p.disb_date || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase">
                            <span className="w-7">Pmt:</span>
                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-1 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300">
                              <Calendar className="w-3 h-3" />
                              {p.payout_received_date ? new Date(p.payout_received_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 dark:text-white">{p.customer_name || '—'}</span>
                          {p.lead_code && <span className="text-[10px] text-slate-500 dark:text-slate-400">ID: {p.lead_code}</span>}
                          {p.reg_no && p.reg_no !== p.lead_code && <span className="text-[10px] text-slate-500">Reg: {p.reg_no}</span>}
                          {p.vehicle && <span className="text-[10px] text-slate-500 dark:text-slate-400">Veh: {p.vehicle}</span>}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        <div className="text-slate-700 dark:text-slate-300 font-bold">{p.display_financer || 'Unknown'}</div>
                        {p.financer_branch && <div className="text-[10px] text-slate-500 mt-0.5">Br: {p.financer_branch}</div>}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400 text-xs">
                        <div className="font-mono text-xs">{p.loan_account_no || 'N/A'}</div>
                        {(p.irr || p.payout_percent) && (
                          <div className="text-[10px] mt-0.5">
                            {p.irr ? `IRR: ${p.irr}` : ''} {p.payout_percent ? `| ${p.payout_percent}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                        ₹{grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs text-rose-500 font-semibold">
                        ₹{tdsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs text-amber-500 font-semibold">
                        ₹{igstVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-xs text-amber-500 font-semibold">
                        ₹{sgstVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-right bg-emerald-50/30 dark:bg-emerald-900/10">
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ₹{netVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Channel Name & Channel Paid Amt Grouped */}
                      <td className="px-2 py-1.5 text-right">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[140px] ml-auto" title={p.channel_name || p.code_name_no || 'Direct'}>
                          {p.channel_name || p.code_name_no || 'Direct'}
                        </div>
                        <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                          {p.channel_paid_amt && p.channel_paid_amt !== '0' && p.channel_paid_amt !== '0.00' ? (
                            `Paid: ₹${parseFloat(p.channel_paid_amt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : p.agent_commission && p.agent_commission !== '0' && p.agent_commission !== '0.00' ? (
                            `Paid: ₹${parseFloat(p.agent_commission).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-400 font-normal">Paid: ₹0.00</span>
                          )}
                        </div>
                      </td>

                      {/* Balance Payout */}
                      <td className="px-2 py-1.5 font-medium text-slate-800 dark:text-slate-200 text-right font-mono text-xs">
                        ₹{balVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs max-w-[140px] truncate" title={p.remarks}>
                        {p.remarks || '—'}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditClick(p)} className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors" title="Edit Payout">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors" title="Delete Payout">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs">
                <tr>
                  <td colSpan={4} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 uppercase text-[11px] tracking-wider text-slate-500">
                    Total ({filtered.length} records)
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs">
                    ₹{summary.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs font-bold text-rose-600 dark:text-rose-400">
                    ₹{summary.tds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                    ₹{summary.igst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                    ₹{summary.sgst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-emerald-50/90 dark:bg-emerald-900/40 px-2 py-1.5 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    ₹{summary.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs text-amber-600 dark:text-amber-400">
                    ₹{summary.channel.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2 py-1.5 text-right font-mono text-xs">
                    ₹{summary.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95"></td>
                </tr>
              </tfoot>
            )}
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
              <input type="number" step="0.01" value={newEntry.gross_payout_amount} onChange={e => updateGrossOrTax('gross_payout_amount', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">TDS Amount</label>
              <input type="number" step="0.01" value={newEntry.tds_amt} onChange={e => updateGrossOrTax('tds_amt', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-rose-600 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">IGST</label>
              <input type="number" step="0.01" value={newEntry.igst} onChange={e => updateGrossOrTax('igst', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-amber-600 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">SGST</label>
              <input type="number" step="0.01" value={newEntry.sgst} onChange={e => updateGrossOrTax('sgst', e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-amber-600 font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Total GST (IGST + SGST)</label>
              <input type="number" step="0.01" value={newEntry.gst_paid} readOnly className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 text-sm cursor-not-allowed" title="Auto-calculated from IGST + SGST" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Net Payout (Gross - Taxes)</label>
              <input type="number" step="0.01" value={newEntry.net_payout} onChange={e => setNewEntry({...newEntry, net_payout: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-emerald-600" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Channel Name</label>
              <input type="text" value={newEntry.channel_name} onChange={e => setNewEntry({...newEntry, channel_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Channel Paid Amt</label>
              <input type="number" step="0.01" value={newEntry.channel_paid_amt} onChange={e => updateChannelPaid(e.target.value)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Payment Date</label>
              <input type="date" required value={newEntry.payout_received_date} onChange={e => setNewEntry({...newEntry, payout_received_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Balance Payout (Net - Channel Paid)</label>
              <input type="number" step="0.01" value={newEntry.balance_payout} onChange={e => setNewEntry({...newEntry, balance_payout: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
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
