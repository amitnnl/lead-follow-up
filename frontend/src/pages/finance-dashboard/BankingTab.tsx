import { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileSpreadsheet, Loader2, Plus, X, Save, Download, Pencil, Trash2, Search, 
  Landmark, CheckCircle2, Check
} from 'lucide-react';
import Papa from 'papaparse';
import api from '../../lib/axios';
import Modal from '../../components/ui/Modal';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';

interface BankAccount {
  id: number;
  account_name: string;
  entity_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: 'current' | 'savings' | 'od_cc';
  opening_balance: number;
  opening_date: string;
  current_balance: number;
  total_credits: number;
  total_debits: number;
  transaction_count: number;
  is_default: boolean;
  is_active: boolean;
}

const COMMON_BANKS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India (SBI)',
  'Kotak Mahindra Bank',
  'Axis Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Canara Bank',
  'IndusInd Bank',
  'Yes Bank',
  'IDFC First Bank',
  'Union Bank of India'
];

export default function BankingTab() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Accounts state
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all');
  const [accountsSummary, setAccountsSummary] = useState({
    total_liquidity: 0,
    total_credits: 0,
    total_debits: 0,
    total_accounts: 0
  });

  // Transactions state
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [finalBalance, setFinalBalance] = useState(0);

  // Account Modal (Add / Edit)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({
    account_name: '',
    entity_name: '',
    bank_name: 'HDFC Bank',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: 'current' as 'current' | 'savings' | 'od_cc',
    opening_balance: '0',
    opening_date: new Date().toISOString().slice(0, 10),
    is_default: false
  });

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importTargetAccountId, setImportTargetAccountId] = useState<number | ''>('');
  const [importing, setImporting] = useState(false);
  const [parsedPreviewRows, setParsedPreviewRows] = useState<any[]>([]);
  const [parsedFileName, setParsedFileName] = useState('');
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Transaction Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newEntry, setNewEntry] = useState({
    bank_account_id: '' as number | string,
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

  // Fetch all company bank accounts
  const fetchAccounts = async () => {
    try {
      const res = await api.get('/banking.php?action=accounts');
      setAccounts(res.data.accounts || []);
      setAccountsSummary(res.data.summary || {
        total_liquidity: 0,
        total_credits: 0,
        total_debits: 0,
        total_accounts: 0
      });
      // Set default target for import if not yet set
      const defaultAcc = res.data.accounts?.find((a: BankAccount) => a.is_default) || res.data.accounts?.[0];
      if (defaultAcc && !importTargetAccountId) {
        setImportTargetAccountId(defaultAcc.id);
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  // Fetch transactions for selected bank account (or all)
  const fetchBanking = async (accId = selectedAccountId) => {
    setLoadingEntries(true);
    try {
      const accParam = accId === 'all' ? 'all' : accId;
      const res = await api.get(`/banking.php?action=list&bank_account_id=${accParam}`);
      setEntries(res.data.entries || []);
      setFinalBalance(res.data.final_balance || 0);
    } catch (err) {
      console.error('Failed to fetch banking entries', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchBanking('all');
  }, []);

  const handleSelectAccount = (accId: number | 'all') => {
    setSelectedAccountId(accId);
    if (accId !== 'all') {
      setImportTargetAccountId(accId);
    }
    fetchBanking(accId);
  };

  // =========================================================================
  // Bank Account Modal Handlers
  // =========================================================================
  const openAddAccountModal = () => {
    setEditingAccount(null);
    setAccountForm({
      account_name: '',
      entity_name: '',
      bank_name: 'HDFC Bank',
      account_number: '',
      ifsc_code: '',
      branch_name: '',
      account_type: 'current',
      opening_balance: '0',
      opening_date: new Date().toISOString().slice(0, 10),
      is_default: accounts.length === 0
    });
    setIsAccountModalOpen(true);
  };

  // Automatically open Add Account modal when linked from sidebar dropdown (?action=add_account)
  useEffect(() => {
    if (searchParams.get('action') === 'add_account') {
      openAddAccountModal();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const openEditAccountModal = (acc: BankAccount, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingAccount(acc);
    setAccountForm({
      account_name: acc.account_name,
      entity_name: acc.entity_name || '',
      bank_name: acc.bank_name,
      account_number: acc.account_number,
      ifsc_code: acc.ifsc_code || '',
      branch_name: acc.branch_name || '',
      account_type: acc.account_type || 'current',
      opening_balance: acc.opening_balance.toString(),
      opening_date: acc.opening_date ? acc.opening_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      is_default: acc.is_default
    });
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    try {
      if (editingAccount) {
        await api.post('/banking.php?action=edit_account', {
          id: editingAccount.id,
          ...accountForm
        });
      } else {
        await api.post('/banking.php?action=add_account', accountForm);
      }
      setIsAccountModalOpen(false);
      await fetchAccounts();
      fetchBanking(selectedAccountId);
    } catch (err: any) {
      console.error('Failed to save account', err);
      alert(err.response?.data?.error || 'Failed to save bank account');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDeleteAccount = async (accId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to remove or deactivate this bank account?')) return;
    try {
      await api.post('/banking.php?action=delete_account', { id: accId });
      if (selectedAccountId === accId) {
        setSelectedAccountId('all');
      }
      await fetchAccounts();
      fetchBanking('all');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete account');
    }
  };

  // =========================================================================
  // Smart File Parser (Handles HDFC, ICICI, SBI, Kotak, Axis & Standard CSVs)
  // =========================================================================
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsedFileName(file.name);
    setImportResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.map((row: any) => {
          const getVal = (searchKeys: string[]) => {
            const exactMatch = searchKeys.find(k => row[k] !== undefined);
            if (exactMatch && row[exactMatch] !== undefined) return String(row[exactMatch]).trim();
            
            for (const key of Object.keys(row)) {
              const cleanKey = key.trim().toLowerCase();
              if (searchKeys.some(k => cleanKey.includes(k.toLowerCase()))) {
                return String(row[key]).trim();
              }
            }
            return '';
          };

          const rawDesc = getVal(['Description', 'Descriptic', 'Narration', 'Transaction Remarks', 'Particulars', 'Details']);
          let rawRegNo = getVal(['Reg. No.', 'Reg No', 'Registration', 'Vehicle No']);
          let rawUtr = getVal(['Cheque/Ref. No.', 'Cheque/Reference No.', 'Cheque/', 'Cheque', 'Reference', 'UTR', 'Chq./Ref.No.', 'Txn ID', 'Transaction ID']);
          let rawCust = getVal(['Customer Name', 'Customer', 'Name', 'Beneficiary']);

          // Smart regex extraction from Narration if explicit columns missing
          if (!rawRegNo && rawDesc) {
            const regMatch = rawDesc.match(/[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}/i);
            if (regMatch) rawRegNo = regMatch[0].toUpperCase();
          }

          if (!rawUtr && rawDesc) {
            const utrMatch = rawDesc.match(/(?:IMPS|RTGS|NEFT|CMS|UPI|REF)?[\/:\-\s]?([A-Z0-9]{10,22})/i);
            if (utrMatch && utrMatch[1]) rawUtr = utrMatch[1];
          }

          return {
            date: getVal(['Transaction Date', 'Txn Date', 'Value Dt', 'Value Date', 'Date']),
            customer_name: rawCust,
            reg_no: rawRegNo,
            loan_amount: getVal(['Loan Amt', 'Loan Amount']),
            status: 'Clear',
            account_description: rawDesc,
            utr_number: rawUtr,
            debit_amount: getVal(['Debit (₹)', 'Debit (?)', 'Debit', 'Withdrawal Amt.', 'Withdrawal Amount (INR )', 'Withdrawal (Dr)', 'Dr']),
            credit_amount: getVal(['Credit (₹)', 'Credit (?)', 'Credit', 'Deposit Amt.', 'Deposit Amount (INR )', 'Deposit (Cr)', 'Cr']),
            pending_amount: getVal(['Pending Payment', 'Pending P', 'Pending']),
            remarks: getVal(['Remarks', 'Notes']),
            bank_name: getVal(['Financer', 'Bank Name'])
          };
        }).filter(r => r.customer_name || r.utr_number || r.reg_no || r.account_description || parseFloat(r.debit_amount) > 0 || parseFloat(r.credit_amount) > 0);

        setParsedPreviewRows(rows);
      }
    });
  };

  const handleConfirmImport = async () => {
    if (!importTargetAccountId) {
      alert('Please select the Target Bank Account.');
      return;
    }
    if (parsedPreviewRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/banking.php?action=upload', {
        bank_account_id: importTargetAccountId,
        rows: parsedPreviewRows
      });

      if (res.data.success) {
        setImportResult({
          inserted: res.data.inserted,
          skipped: res.data.skipped || 0
        });
        await fetchAccounts();
        fetchBanking(selectedAccountId);
        setTimeout(() => {
          setIsImportModalOpen(false);
          setParsedPreviewRows([]);
          setParsedFileName('');
          setImportResult(null);
        }, 1800);
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      alert(err.response?.data?.error || 'Failed to upload banking statement.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // =========================================================================
  // Manual Entry Handlers
  // =========================================================================
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEntry(true);
    try {
      if (editingId) {
        await api.post('/banking.php?action=edit', { ...newEntry, id: editingId });
      } else {
        await api.post('/banking.php?action=add', newEntry);
      }
      setIsAddModalOpen(false);
      setEditingId(null);
      await fetchAccounts();
      fetchBanking(selectedAccountId);
      setNewEntry({
        bank_account_id: selectedAccountId !== 'all' ? selectedAccountId : '',
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
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to save entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleEditClick = (row: any) => {
    setEditingId(row.id);
    setNewEntry({
      bank_account_id: row.bank_account_id || '',
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
    if (!confirm('Are you sure you want to delete this entry? This will update the running balance of subsequent entries.')) return;
    try {
      const res = await api.post('/banking.php?action=delete', { id });
      if (res.data.success) {
        await fetchAccounts();
        fetchBanking(selectedAccountId);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to delete entry.');
    }
  };

  const exportToCSV = () => {
    const templateHeaders = [
      "Transaction Date", "Account Name", "Customer", "Reg. No.", "Loan Amt",
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
    
    const rows = entries.map(row => [
      row.post_date ? new Date(row.post_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/,/g, '') : '',
      `"${(row.company_account_name || 'Primary').replace(/"/g, '""')}"`,
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
      [templateHeaders.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const accLabel = selectedAccountId === 'all' ? 'consolidated' : `acc_${selectedAccountId}`;
    link.setAttribute("download", `banking_export_${accLabel}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter(e => {
    const searchString = Object.values(e).join(' ').toLowerCase();
    if (search && !searchString.includes(search.toLowerCase())) return false;
    if (startDate && e.post_date < startDate) return false;
    if (endDate && e.post_date > endDate) return false;
    return true;
  });

  const totals = filteredEntries.reduce((acc, row) => {
    acc.loan += parseFloat(row.loan_amount) || 0;
    acc.debit += parseFloat(row.debit_amount) || 0;
    acc.credit += parseFloat(row.credit_amount) || 0;
    acc.pending += parseFloat(row.pending_amount) || 0;
    return acc;
  }, { loan: 0, debit: 0, credit: 0, pending: 0 });

  const activeAccountObj = selectedAccountId !== 'all' 
    ? accounts.find(a => a.id === selectedAccountId) 
    : null;

  return (
    <div className="space-y-3.5">
      {/* ========================================================================= */}
      {/* 1. FILTER & ACTION TOOLBAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="bank-account-selector" className="sr-only">Bank Account</label>
              <select
                id="bank-account-selector"
                value={selectedAccountId}
                onChange={(e) => handleSelectAccount(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="text-sm font-bold text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs max-w-[280px] sm:max-w-xs truncate"
              >
                <option value="all">
                  All Accounts (Consolidated)
                </option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.account_name} — {acc.bank_name} {acc.account_number ? `(••••${acc.account_number.slice(-4)})` : ''}
                  </option>
                ))}
              </select>

              {selectedAccountId !== 'all' && activeAccountObj && (
                <button
                  type="button"
                  onClick={(e) => openEditAccountModal(activeAccountObj, e)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                  title="Edit Account Details"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}

              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                ₹{(selectedAccountId === 'all' 
                  ? accountsSummary.total_liquidity 
                  : (activeAccountObj?.current_balance ?? 0)
                ).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              {selectedAccountId === 'all' 
                ? `Showing entries across all bank accounts (${accounts.length} registered account${accounts.length === 1 ? '' : 's'}).` 
                : `${activeAccountObj?.entity_name ? activeAccountObj.entity_name + ' • ' : ''}${activeAccountObj?.bank_name} (A/C ${activeAccountObj?.account_number || '—'}) • Opening: ₹${(activeAccountObj?.opening_balance || 0).toLocaleString()}`}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          <div className="relative flex-1 sm:w-52 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in statement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500"
              title="End Date"
            />
          </div>
          
          <button
            onClick={() => {
              setEditingId(null);
              setNewEntry({
                bank_account_id: selectedAccountId !== 'all' ? selectedAccountId : (accounts[0]?.id || ''),
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
                bank_name: activeAccountObj?.bank_name || ''
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-primary-200 dark:border-primary-800"
          >
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
          
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          
          <button
            onClick={() => {
              if (selectedAccountId !== 'all') {
                setImportTargetAccountId(selectedAccountId);
              }
              setParsedPreviewRows([]);
              setParsedFileName('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-primary-600 dark:hover:bg-primary-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" /> Import Statement
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LEDGER TRANSACTIONS TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-auto relative custom-scrollbar max-h-[calc(100vh-320px)] min-h-[420px]">
          <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date</th>
                {selectedAccountId === 'all' && (
                  <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bank Account</th>
                )}
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Customer / Vehicle</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Loan Amt</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Description / Narration</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ref / UTR</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Debit (₹)</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Credit (₹)</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Balance (₹)</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Remarks</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingEntries ? (
                <tr>
                  <td colSpan={selectedAccountId === 'all' ? 11 : 10} className="px-3 py-12 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading statement transactions...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={selectedAccountId === 'all' ? 11 : 10} className="px-3 py-12 text-center text-slate-500 italic">
                    No transactions found for this period. Click "Import Statement" or "Add Entry" to get started.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {row.post_date ? new Date(row.post_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    {selectedAccountId === 'all' && (
                      <td className="px-2.5 py-1.5 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full text-[10px]">
                          <Landmark className="w-2.5 h-2.5" />
                          {row.company_account_name || row.bank_name || 'Primary'}
                        </span>
                      </td>
                    )}
                    <td className="px-2.5 py-1.5 text-xs">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{row.customer_name || '—'}</div>
                      {row.reg_no && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-mono font-semibold">
                          {row.reg_no}
                        </span>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 text-right font-mono">
                      {parseFloat(row.loan_amount) > 0 ? `₹${parseFloat(row.loan_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 max-w-xs truncate" title={row.account_description}>
                      {row.account_description || '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      {row.utr_number || '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 text-right font-mono">
                      {parseFloat(row.debit_amount) > 0 ? `- ₹${parseFloat(row.debit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 text-right font-mono">
                      {parseFloat(row.credit_amount) > 0 ? `+ ₹${parseFloat(row.credit_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className={clsx("px-2.5 py-1.5 text-xs font-black text-right font-mono", row.running_balance >= 0 ? "text-slate-800 dark:text-slate-200" : "text-rose-600")}>
                      ₹{parseFloat(row.running_balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 max-w-[150px] truncate" title={row.remarks}>
                      {row.remarks || '—'}
                    </td>
                    <td className="px-2.5 py-1.5 text-xs text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEditClick(row)} className="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded transition-colors" title="Edit Entry">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors" title="Delete Entry">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredEntries.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs">
                <tr>
                  <td colSpan={selectedAccountId === 'all' ? 3 : 2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-2 uppercase text-[11px] tracking-wider text-slate-500">
                    Total ({filteredEntries.length} records)
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-2 text-right font-mono text-xs">
                    {totals.loan > 0 ? `₹${totals.loan.toLocaleString()}` : '—'}
                  </td>
                  <td colSpan={2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95"></td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-2 text-right font-mono text-xs text-rose-600 dark:text-rose-400">
                    {totals.debit > 0 ? `- ₹${totals.debit.toLocaleString()}` : '—'}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-2 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400">
                    {totals.credit > 0 ? `+ ₹${totals.credit.toLocaleString()}` : '—'}
                  </td>
                  <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-2 text-right font-mono text-xs font-black">
                    ₹{finalBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL: IMPORT BANK STATEMENT WITH TARGET ACCOUNT SELECTOR */}
      {/* ========================================================================= */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Import Bank Statement / Ledger</h3>
              <p className="text-[11px] text-slate-500">Auto-detects HDFC, ICICI, SBI, Kotak, Axis and standard CSV formats.</p>
            </div>
          </div>
          <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Bank Account Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Select Bank Account To Import Into <span className="text-rose-500">*</span>
            </label>
            <select
              value={importTargetAccountId}
              onChange={(e) => setImportTargetAccountId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-semibold text-slate-800 dark:text-white"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.account_name} — {acc.bank_name} ({acc.account_number}) | Balance: ₹{acc.current_balance.toLocaleString()}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              All transactions in this statement will be added directly to this account's passbook.
            </p>
          </div>

          {/* File Picker Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
              Statement CSV File
            </label>
            <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-primary-500 hover:bg-primary-50/20 dark:hover:bg-primary-950/20 cursor-pointer transition-all"
            >
              <FileSpreadsheet className="w-8 h-8 text-primary-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {parsedFileName ? `Selected: ${parsedFileName}` : 'Click to Browse or Drag Bank Statement CSV here'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Supports UTF-8 CSV exports from your online netbanking portal.</p>
            </div>
          </div>

          {/* Preview & Status */}
          {parsedPreviewRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Ready to Import {parsedPreviewRows.length} transactions
                </span>
                <span className="text-slate-500 text-[11px]">Previewing first 3 rows</span>
              </div>
              
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs max-h-36 overflow-y-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Ref/UTR</th>
                      <th className="p-2 text-right">Debit</th>
                      <th className="p-2 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {parsedPreviewRows.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        <td className="p-2">{r.date}</td>
                        <td className="p-2 truncate max-w-xs">{r.account_description}</td>
                        <td className="p-2">{r.utr_number || '—'}</td>
                        <td className="p-2 text-right text-rose-500">{r.debit_amount || '—'}</td>
                        <td className="p-2 text-right text-emerald-500">{r.credit_amount || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importResult && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              Successfully imported {importResult.inserted} transactions ({importResult.skipped} duplicate entries skipped).
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={exportToCSV}
            className="text-xs text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Download Standard Template
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={importing || parsedPreviewRows.length === 0}
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Import {parsedPreviewRows.length > 0 ? `${parsedPreviewRows.length} Rows` : 'Statement'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. MODAL: ADD / EDIT BANK ACCOUNT */}
      {/* ========================================================================= */}
      <Modal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Landmark className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">
              {editingAccount ? 'Edit Bank Account' : 'Register New Bank Account'}
            </h3>
          </div>
          <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAccountSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Account Label / Nickname <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Bank - Main Operating A/C"
              value={accountForm.account_name}
              onChange={e => setAccountForm({ ...accountForm, account_name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Firm / Entity Name
              </label>
              <input
                type="text"
                placeholder="e.g. M/S Divine Finvest Pvt Ltd"
                value={accountForm.entity_name}
                onChange={e => setAccountForm({ ...accountForm, entity_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                list="bankSuggestions"
                placeholder="e.g. HDFC Bank"
                value={accountForm.bank_name}
                onChange={e => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
              <datalist id="bankSuggestions">
                {COMMON_BANKS.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50200012345678"
                value={accountForm.account_number}
                onChange={e => setAccountForm({ ...accountForm, account_number: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                value={accountForm.ifsc_code}
                onChange={e => setAccountForm({ ...accountForm, ifsc_code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Account Type
              </label>
              <select
                value={accountForm.account_type}
                onChange={e => setAccountForm({ ...accountForm, account_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              >
                <option value="current">Current</option>
                <option value="savings">Savings</option>
                <option value="od_cc">OD / CC</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={accountForm.opening_balance}
                onChange={e => setAccountForm({ ...accountForm, opening_balance: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Opening Date
              </label>
              <input
                type="date"
                value={accountForm.opening_date}
                onChange={e => setAccountForm({ ...accountForm, opening_date: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_default_checkbox"
              checked={accountForm.is_default}
              onChange={e => setAccountForm({ ...accountForm, is_default: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_default_checkbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Set as Default Company Bank Account for Payouts & Settlements
            </label>
          </div>

          <div className="pt-3 flex justify-between items-center">
            {editingAccount && (
              <button
                type="button"
                onClick={() => handleDeleteAccount(editingAccount.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Deactivate Account
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAccount}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs"
              >
                {savingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingAccount ? 'Update Account' : 'Save Account'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 6. MODAL: ADD / EDIT MANUAL TRANSACTION */}
      {/* ========================================================================= */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} zClassName="z-[9999]" className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide flex items-center gap-2">
            {editingId ? 'Edit Transaction' : 'Add Manual Transaction'}
          </h3>
          <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Bank Account <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={newEntry.bank_account_id}
              onChange={e => setNewEntry({ ...newEntry, bank_account_id: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs font-semibold"
            >
              <option value="">-- Select Bank Account --</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_name} ({a.bank_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date <span className="text-rose-500">*</span></label>
              <input type="date" required value={newEntry.post_date} onChange={e => setNewEntry({...newEntry, post_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Customer Name</label>
              <input type="text" value={newEntry.customer_name} onChange={e => setNewEntry({...newEntry, customer_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Reg. No.</label>
              <input type="text" value={newEntry.reg_no} onChange={e => setNewEntry({...newEntry, reg_no: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs uppercase" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Loan Amt</label>
              <input type="number" step="0.01" value={newEntry.loan_amount} onChange={e => setNewEntry({...newEntry, loan_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cheque/Ref/UTR No.</label>
              <input type="text" value={newEntry.utr_number} onChange={e => setNewEntry({...newEntry, utr_number: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs font-mono" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Financer / Institution</label>
              <input type="text" value={newEntry.bank_name} onChange={e => setNewEntry({...newEntry, bank_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs" />
            </div>
            <div>
              <label className="block text-xs font-bold text-rose-500 uppercase tracking-wide mb-1">Debit (₹ Out)</label>
              <input type="number" step="0.01" value={newEntry.debit_amount} onChange={e => setNewEntry({...newEntry, debit_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs font-mono font-bold text-rose-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-500 uppercase tracking-wide mb-1">Credit (₹ In)</label>
              <input type="number" step="0.01" value={newEntry.credit_amount} onChange={e => setNewEntry({...newEntry, credit_amount: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono font-bold text-emerald-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description / Narration <span className="text-rose-500">*</span></label>
            <input type="text" required value={newEntry.account_description} onChange={e => setNewEntry({...newEntry, account_description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Remarks</label>
            <input type="text" value={newEntry.remarks} onChange={e => setNewEntry({...newEntry, remarks: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs" />
          </div>
          
          <div className="pt-2 flex justify-end gap-2 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={savingEntry} className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
              {savingEntry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
