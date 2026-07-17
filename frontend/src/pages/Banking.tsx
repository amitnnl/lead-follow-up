import { useEffect, useState, useRef } from 'react';
import { PiggyBank, Download, Plus, Upload, Search, X, AlertCircle, CheckCircle, ShieldAlert, Check, Ban } from 'lucide-react';
import api from '../lib/axios';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Banking() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';
  // Tabs: 'settlements', 'payouts', or 'ledger'
  const [activeTab, setActiveTab] = useState<'settlements' | 'payouts' | 'ledger'>('settlements');
  
  // Tab 1: Settlements Data
  const [bankingData, setBankingData] = useState<any[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(true);

  // Tab 2: Payouts Data (Multi-Party Split & Approvals)
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  // Tab 3: Ledger Data
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Modals & Upload Statuses
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Update Settlement Modal State
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [activeSettlementLead, setActiveSettlementLead] = useState<any>(null);
  const [settlementForm, setSettlementForm] = useState({
    received_amount: '',
    received_date: new Date().toISOString().slice(0, 10),
    rc_charges: '',
    insurance_charges: '',
    rto_charges: '',
    other_charges: '',
    banking_notes: ''
  });
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);
  
  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Ledger Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formLoanAmount, setFormLoanAmount] = useState('');
  const [formDeduction, setFormDeduction] = useState('');
  const [formStatus, setFormStatus] = useState('Clear');
  const [formAccountDesc, setFormAccountDesc] = useState('');
  const [formDebit, setFormDebit] = useState('');
  const [formCredit, setFormCredit] = useState('');
  const [formPending, setFormPending] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Fetch Settlements
  const fetchSettlements = async () => {
    setLoadingSettlements(true);
    try {
      const response = await api.get('/banking');
      setBankingData(response.data.grouped || []);
    } catch (error) {
      console.error('Failed to fetch banking settlements', error);
    } finally {
      setLoadingSettlements(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await api.get('/banking/transactions');
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch banking transactions', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Fetch Ledger
  const fetchLedger = async () => {
    setLoadingLedger(true);
    try {
      const response = await api.get('/banking/ledger');
      setLedgerEntries(response.data.entries || []);
      setCurrentBalance(response.data.current_balance || 0);
    } catch (error) {
      console.error('Failed to fetch ledger entries', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
    fetchTransactions();
    fetchLedger();
  }, []);

  const handleTxApproval = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.post('/banking/transactions/approve', {
        id,
        status,
        rejection_reason: status === 'rejected' ? 'Rejected by Checker review' : ''
      });
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update approval status.');
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  // Handle Form Submit
  const handleAddEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/banking/ledger', {
        post_date: formDate,
        customer_name: formCustomerName,
        reg_no: formRegNo,
        loan_amount: parseFloat(formLoanAmount) || 0,
        deduction_info: parseFloat(formDeduction) || 0,
        status: formStatus,
        account_description: formAccountDesc,
        debit_amount: parseFloat(formDebit) || 0,
        credit_amount: parseFloat(formCredit) || 0,
        pending_amount: parseFloat(formPending) || 0,
        remarks: formRemarks
      });
      
      // Reset & Reload
      setIsAddModalOpen(false);
      resetAddForm();
      fetchLedger();
      fetchSettlements(); // Recalculate settlements since status might have changed
    } catch (error) {
      console.error('Failed to add manual entry', error);
      alert('Failed to add ledger entry. Please try again.');
    }
  };

  const handleSettlementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSettlementLead) return;
    setIsSavingSettlement(true);
    try {
      await api.post('/banking/settle', {
        lead_id: activeSettlementLead.id,
        received_amount: parseFloat(settlementForm.received_amount) || 0,
        received_date: settlementForm.received_date,
        rc_charges: parseFloat(settlementForm.rc_charges) || 0,
        insurance_charges: parseFloat(settlementForm.insurance_charges) || 0,
        rto_charges: parseFloat(settlementForm.rto_charges) || 0,
        other_charges: parseFloat(settlementForm.other_charges) || 0,
        banking_notes: settlementForm.banking_notes
      });
      setSettlementModalOpen(false);
      fetchSettlements();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save settlement');
    } finally {
      setIsSavingSettlement(false);
    }
  };

  const openSettlementModal = (row: any) => {
    setActiveSettlementLead(row);
    setSettlementForm({
      received_amount: row.received_amount || '',
      received_date: new Date().toISOString().slice(0, 10),
      rc_charges: '', 
      insurance_charges: '',
      rto_charges: '',
      other_charges: '',
      banking_notes: ''
    });
    setSettlementModalOpen(true);
  };

  const resetAddForm = () => {
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormCustomerName('');
    setFormRegNo('');
    setFormLoanAmount('');
    setFormDeduction('');
    setFormStatus('Clear');
    setFormAccountDesc('');
    setFormDebit('');
    setFormCredit('');
    setFormPending('');
    setFormRemarks('');
  };

  // Handle Import File
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsImporting(true);
    setImportMessage(null);

    try {
      const res = await api.post('/banking/ledger/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportMessage({
        type: 'success',
        text: res.data.message || `Successfully imported statements.`
      });
      fetchLedger();
      fetchSettlements();
    } catch (error: any) {
      console.error('Failed to import Excel file', error);
      setImportMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to import Excel file. Check format.'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportLedgerToCSV = () => {
    if (ledgerEntries.length === 0) return;
    const headers = ["Post Date", "Customer Name", "Reg. No.", "Loan Amt.", "deduction", "Status", "Account Description", "Debit", "Credit", "Balance", "Pending", "Remarks"];
    const rows = ledgerEntries.map(l => [
      l.post_date,
      `"${(l.customer_name || '').replace(/"/g, '""')}"`,
      l.reg_no || '',
      l.loan_amount || 0,
      l.deduction_info || 0,
      l.status || '',
      `"${(l.account_description || '').replace(/"/g, '""')}"`,
      l.debit_amount || 0,
      l.credit_amount || 0,
      l.running_balance || 0,
      l.pending_amount || 0,
      `"${(l.remarks || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bank_Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Ledger Entries
  const filteredLedgerEntries = ledgerEntries.filter(entry => {
    const term = ledgerSearch.toLowerCase();
    return (
      (entry.customer_name || '').toLowerCase().includes(term) ||
      (entry.reg_no || '').toLowerCase().includes(term) ||
      (entry.account_description || '').toLowerCase().includes(term) ||
      (entry.remarks || '').toLowerCase().includes(term) ||
      (entry.status || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <PiggyBank className="text-emerald-500 w-5 h-5" /> Banking & Accounts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage bank statement logs, settlements, and customer payouts.</p>
        </div>
        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          {activeTab === 'ledger' && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportFileChange} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="card card-hover px-3.5 py-2 rounded text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer disabled:opacity-60 transition-colors"
                title="Import Statement Excel"
              >
                <Upload className="w-4 h-4 text-primary-600" /> 
                {isImporting ? 'Importing...' : 'Import statement (.xlsx)'}
              </button>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Add Entry
              </button>
            </>
          )}
          {isAdminOrManager && activeTab === 'settlements' && (
            <button className="card card-hover px-4 py-2 rounded text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4 text-emerald-600" /> Export Report
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-850 overflow-x-auto">
        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'settlements' ? 'border-primary-600 text-primary-700 dark:text-primary-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
        >
          Financer Settlements
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'payouts' ? 'border-primary-600 text-primary-700 dark:text-primary-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-500"/> Payouts & Approvals
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'ledger' ? 'border-primary-600 text-primary-700 dark:text-primary-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}
        >
          Bank Ledger (Statement)
        </button>
      </div>

      {/* Alert message for Import status */}
      {importMessage && (
        <div className={`card p-4 flex items-start gap-3 border-l-4 ${importMessage.type === 'success' ? 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10' : 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-950/10'}`}>
          <AlertCircle className={`w-5 h-5 shrink-0 ${importMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`} />
          <div className="flex-1 text-sm font-medium">
            {importMessage.text}
          </div>
          <button onClick={() => setImportMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab 1: Financer Settlements */}
      {activeTab === 'settlements' && (
        loadingSettlements ? (
          <div className="text-center py-12 text-slate-400 text-sm">Loading banking records...</div>
        ) : bankingData.length === 0 ? (
          <div className="card p-12 text-center">
            <PiggyBank className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-700 dark:text-white">No Disbursed Leads Found</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">There are currently no disbursed leads to display banking records for.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {bankingData.map((group, idx) => (
              <div key={idx} className="card overflow-hidden">
                {/* Group Header */}
                <div className="bg-slate-50/50 dark:bg-[#192736] border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {group.client}
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-850 px-2 py-0.5 rounded ml-2">
                      {group.records.length} Leads
                    </span>
                  </h3>

                  <div className="flex flex-wrap items-center gap-5 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Received</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(group.stats.received)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deductions</span>
                      <span className="font-semibold text-rose-500">{formatCurrency(group.stats.deductions)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Payable</span>
                      <span className="font-bold text-slate-700 dark:text-white">{formatCurrency(group.stats.payable)}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Balance Due</span>
                      <span className={`font-bold ${group.stats.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {formatCurrency(group.stats.balance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Lead ID</th>
                        <th className="px-4 py-2.5 font-medium">Customer Name</th>
                        <th className="px-4 py-2.5 font-medium">Loan Amount</th>
                        <th className="px-4 py-2.5 font-medium">Received</th>
                        <th className="px-4 py-2.5 font-medium">Deductions</th>
                        <th className="px-4 py-2.5 font-medium">Payable</th>
                        <th className="px-4 py-2.5 font-medium">Total Paid</th>
                        <th className="px-4 py-2.5 font-medium">Balance</th>
                        <th className="px-4 py-2.5 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {group.records.map((row: any) => {
                        const received = parseFloat(row.received_amount || 0);
                        const deductions = parseFloat(row.total_deductions || 0);
                        const payable = received - deductions;
                        const paid = parseFloat(row.total_paid || 0);
                        const balance = payable - paid;

                        return (
                          <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <Link to={`/leads/${row.id}`} className="text-primary-600 dark:text-primary-400 font-mono text-xs font-semibold hover:underline">
                                {row.lead_id}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800 dark:text-white">{row.customer_name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{row.vehicle_make_model || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-350">{formatCurrency(row.loan_amount || 0)}</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(received)}</td>
                            <td className="px-4 py-3 text-rose-500 font-semibold">-{formatCurrency(deductions)}</td>
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-white">{formatCurrency(payable)}</td>
                            <td className="px-4 py-3 text-primary-600 dark:text-primary-400 font-semibold">{formatCurrency(paid)}</td>
                            <td className="px-4 py-3">
                              {balance > 0 ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 px-2.5 py-1 rounded font-semibold text-[11px]">{formatCurrency(balance)}</span>
                              ) : balance < 0 ? (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 px-2.5 py-1 rounded font-semibold text-[11px]">{formatCurrency(balance)}</span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 px-2.5 py-1 rounded font-semibold text-[11px]">Cleared</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {isAdminOrManager && (
                                <button
                                  onClick={() => openSettlementModal(row)}
                                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mr-3"
                                >
                                  Settle
                                </button>
                              )}
                              <Link to={`/leads/${row.id}`} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
                                Manage
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab 2: Payouts & Approvals */}
      {activeTab === 'payouts' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">Multi-Party Payouts & Dual Approvals</h3>
              <p className="text-xs text-slate-500 mt-0.5">Review and authorize client, dealer, or commission fund transfers.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead & Customer</th>
                  <th className="px-4 py-3">Split Type & Beneficiary</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Date & Mode</th>
                  <th className="px-4 py-3">Maker Status</th>
                  <th className="px-4 py-3 text-right">Checker Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {loadingTransactions ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading payout transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400 text-sm">No recorded payout transactions found.</td></tr>
                ) : (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-white">{t.customer_name}</div>
                        <div className="text-xs font-mono text-primary-600 mt-0.5">{t.lead_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.payout_type === 'dealer' ? 'bg-purple-100 text-purple-800' :
                            t.payout_type === 'org_retained' ? 'bg-blue-100 text-blue-800' :
                            t.payout_type === 'commission' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.payout_type || 'customer'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{t.beneficiary_name || t.notes || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">
                        ₹{Number(t.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{t.payment_date}</div>
                        <div className="text-slate-400 uppercase text-[10px]">{t.payment_mode || 'Bank Transfer'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {t.approval_status === 'pending_approval' ? (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><ShieldAlert className="w-3 h-3"/> Pending Checker</span>
                        ) : t.approval_status === 'rejected' ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Rejected</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><CheckCircle className="w-3 h-3"/> Approved</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.approval_status === 'pending_approval' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleTxApproval(Number(t.id), 'approved')} className="bg-emerald-600 text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"><Check className="w-3.5 h-3.5"/> Approve</button>
                            <button onClick={() => handleTxApproval(Number(t.id), 'rejected')} className="bg-rose-600 text-white px-2.5 py-1 rounded text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 cursor-pointer"><Ban className="w-3.5 h-3.5"/> Reject</button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No action required</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Bank Statement Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex flex-col justify-between h-[84px] border-l-4 border-l-primary-500">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Current Bank Balance</span>
              <span className={`text-2xl font-black ${currentBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
            <div className="card p-4 flex flex-col justify-between h-[84px] border-l-4 border-l-emerald-500">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Credit (Inflows)</span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatCurrency(ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.credit_amount) || 0), 0))}
              </span>
            </div>
            <div className="card p-4 flex flex-col justify-between h-[84px] border-l-4 border-l-rose-500">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Debit (Outflows)</span>
              <span className="text-2xl font-bold text-rose-500">
                {formatCurrency(ledgerEntries.reduce((sum, e) => sum + (parseFloat(e.debit_amount) || 0), 0))}
              </span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="card p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger statement by customer, reg no, details..."
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdminOrManager && (
              <button 
                onClick={exportLedgerToCSV}
                disabled={ledgerEntries.length === 0}
                className="card card-hover px-4 py-2.5 rounded text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all shrink-0"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Export CSV
              </button>
            )}
          </div>

          {/* Ledger Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Post Date</th>
                    <th className="px-4 py-2.5 font-medium">Customer Name</th>
                    <th className="px-4 py-2.5 font-medium">Reg. No.</th>
                    <th className="px-4 py-2.5 font-medium text-right">Loan Amt.</th>
                    <th className="px-4 py-2.5 font-medium text-right">Deduction</th>
                    <th className="px-4 py-2.5 font-medium text-center">Status</th>
                    <th className="px-4 py-2.5 font-medium">Account Description</th>
                    <th className="px-4 py-2.5 font-medium text-right">Debit (Out)</th>
                    <th className="px-4 py-2.5 font-medium text-right">Credit (In)</th>
                    <th className="px-4 py-2.5 font-medium text-right">Running Balance</th>
                    <th className="px-4 py-2.5 font-medium text-right">Pending</th>
                    <th className="px-4 py-2.5 font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {loadingLedger ? (
                    <tr><td colSpan={12} className="py-8 text-center text-slate-400">Loading bank statement ledger...</td></tr>
                  ) : filteredLedgerEntries.length === 0 ? (
                    <tr><td colSpan={12} className="py-8 text-center text-slate-400">No statement records found. Try uploading a statement.</td></tr>
                  ) : (
                    filteredLedgerEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          {row.post_date ? new Date(row.post_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{row.customer_name || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.reg_no || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                          {row.loan_amount > 0 ? formatCurrency(row.loan_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-rose-500 font-semibold font-mono">
                          {row.deduction_info > 0 ? `-${formatCurrency(row.deduction_info)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                            row.status === 'Clear' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30' 
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={row.account_description}>
                          {row.account_description || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600 dark:text-rose-400 font-mono">
                          {row.debit_amount > 0 ? formatCurrency(row.debit_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {row.credit_amount > 0 ? formatCurrency(row.credit_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-700 dark:text-white font-mono bg-slate-50/40 dark:bg-slate-900/10">
                          {formatCurrency(row.running_balance)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-amber-500 font-mono">
                          {row.pending_amount > 0 ? formatCurrency(row.pending_amount) : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={row.remarks}>
                          {row.remarks || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1e293b] rounded-lg max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-scale-in">
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Add Bank Ledger Entry</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddEntrySubmit}>
              <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Post Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formDate} 
                      onChange={e => setFormDate(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Status</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                      <option value="Clear">Clear</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Customer Name / Entity</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mohit Kumar, Rent" 
                      value={formCustomerName}
                      onChange={e => setFormCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Reg. No.</label>
                    <input 
                      type="text" 
                      placeholder="e.g. HR26FA9560" 
                      value={formRegNo}
                      onChange={e => setFormRegNo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Loan Amt.</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formLoanAmount}
                      onChange={e => setFormLoanAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Deduction</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formDeduction}
                      onChange={e => setFormDeduction(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Pending Amt.</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formPending}
                      onChange={e => setFormPending(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Debit (Out) ₹</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formDebit}
                      onChange={e => setFormDebit(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Credit (In) ₹</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={formCredit}
                      onChange={e => setFormCredit(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Account Description *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. BY TRANSFER/RTGS CHOLAMANDALAM..." 
                    value={formAccountDesc}
                    onChange={e => setFormAccountDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">Remarks</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Paid to RTO agent" 
                    value={formRemarks}
                    onChange={e => setFormRemarks(e.target.value)}
                  />
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-[#111827] border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Settlement Modal */}
      {settlementModalOpen && activeSettlementLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-emerald-500" />
                Update Bank Settlement
              </h2>
              <button onClick={() => setSettlementModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Lead Details</div>
                <div className="font-semibold text-slate-800 dark:text-white">{activeSettlementLead.customer_name}</div>
                <div className="text-sm text-slate-500 mt-0.5">{activeSettlementLead.lead_id} • Loan: {formatCurrency(activeSettlementLead.loan_amount || 0)}</div>
              </div>

              <form id="settlementForm" onSubmit={handleSettlementSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Received Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                      <input 
                        type="number" step="0.01" required
                        value={settlementForm.received_amount}
                        onChange={(e) => setSettlementForm({...settlementForm, received_amount: e.target.value})}
                        className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Received Date</label>
                    <input 
                      type="date" required
                      value={settlementForm.received_date}
                      onChange={(e) => setSettlementForm({...settlementForm, received_date: e.target.value})}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Deductions & Charges</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">RC Charges</label>
                      <input 
                        type="number" step="0.01"
                        value={settlementForm.rc_charges}
                        onChange={(e) => setSettlementForm({...settlementForm, rc_charges: e.target.value})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Insurance Charges</label>
                      <input 
                        type="number" step="0.01"
                        value={settlementForm.insurance_charges}
                        onChange={(e) => setSettlementForm({...settlementForm, insurance_charges: e.target.value})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">RTO Charges</label>
                      <input 
                        type="number" step="0.01"
                        value={settlementForm.rto_charges}
                        onChange={(e) => setSettlementForm({...settlementForm, rto_charges: e.target.value})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Other Charges</label>
                      <input 
                        type="number" step="0.01"
                        value={settlementForm.other_charges}
                        onChange={(e) => setSettlementForm({...settlementForm, other_charges: e.target.value})}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Banking Notes (Optional)</label>
                  <textarea 
                    value={settlementForm.banking_notes}
                    onChange={(e) => setSettlementForm({...settlementForm, banking_notes: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all dark:text-white min-h-[80px]"
                    placeholder="Enter any notes about this settlement..."
                  ></textarea>
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                type="button" 
                onClick={() => setSettlementModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="settlementForm"
                disabled={isSavingSettlement}
                className="px-4 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm shadow-emerald-500/20"
              >
                {isSavingSettlement ? 'Saving...' : 'Save Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
