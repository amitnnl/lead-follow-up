import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../lib/axios';
import { 
  TrendingUp, TrendingDown, Scale, IndianRupee, Printer, 
  Download, Plus, Loader2, Save, X, Calendar, ArrowUpRight, 
  ArrowDownRight, ReceiptText, Banknote, Building2, Trash2,
  RefreshCw, Search
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Papa from 'papaparse';
import { EXPENSE_CATEGORIES } from './OfficeExpensesTab';

interface OfficeExpense {
  id: number;
  expense_date: string;
  category: string;
  amount: number;
  remarks: string;
}

interface PnLData {
  period: {
    start_date: string;
    end_date: string;
    is_filtered: boolean;
  };
  income: {
    bank_nbfc_commission: number;
    commission_from_channel: number;
    commission_from_dealer: number;
    interest_from_bank: number;
    other_incomes_by_category: Record<string, number>;
    client_comm_retained: number;
    total_income: number;
  };
  expenses: {
    commission_paid_channel: number;
    standard_heads: Record<string, number>;
    custom_heads: Record<string, number>;
    by_category: Record<string, number>;
    subtotal_office_expenses: number;
    total_expenses: number;
  };
  net_profit: number;
  net_margin_percent: number;
  balancing_total: number;
  taxes: {
    tds_total: number;
    igst_total?: number;
    sgst_total?: number;
    gst_total: number;
    total_tax: number;
  };
}

interface OtherIncomeItem {
  id: number;
  income_date: string;
  category: string;
  amount: number;
  reference_no: string;
  remarks: string;
}

const OTHER_INCOME_CATEGORIES = [
  'Interest From Bank',
  'Commission received from Channel',
  'Commission received from Dealer',
  'File & Documentation Charges',
  'Subvention Income',
  'Other Income'
];

export default function ProfitLossTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = (searchParams.get('view') as 'pnl' | 'expenses' | 'incomes') || 'pnl';
  const setActiveView = (view: 'pnl' | 'expenses' | 'incomes') => {
    setSearchParams({ view });
  };

  const [periodPreset, setPeriodPreset] = useState<string>('FY 2026-27');
  const [startDate, setStartDate] = useState<string>('2026-04-01');
  const [endDate, setEndDate] = useState<string>('2027-03-31');

  const [loading, setLoading] = useState<boolean>(true);
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncomeItem[]>([]);
  const [expenses, setExpenses] = useState<OfficeExpense[]>([]);

  // Filtering states for Expenses Ledger
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');

  // Filtering states for Other Incomes Ledger
  const [incomeSearch, setIncomeSearch] = useState('');
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingIncome, setSavingIncome] = useState(false);

  // New Expense form state
  const [newExpense, setNewExpense] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Tea Expense',
    amount: '',
    remarks: ''
  });

  // New Income form state
  const [newIncome, setNewIncome] = useState({
    income_date: new Date().toISOString().split('T')[0],
    category: 'Interest From Bank',
    amount: '',
    reference_no: '',
    remarks: ''
  });

  // Change preset helper
  const handlePresetChange = (preset: string) => {
    setPeriodPreset(preset);
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, '0');

    if (preset === 'FY 2026-27') {
      setStartDate('2026-04-01');
      setEndDate('2027-03-31');
    } else if (preset === 'FY 2025-26') {
      setStartDate('2025-04-01');
      setEndDate('2026-03-31');
    } else if (preset === 'FY 2024-25') {
      setStartDate('2024-04-01');
      setEndDate('2025-03-31');
    } else if (preset === 'THIS_MONTH') {
      setStartDate(`${y}-${m}-01`);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchPnL = async () => {
    try {
      setLoading(true);
      let pnlUrl = '/profit.php';
      let incomeUrl = '/profit.php?action=other_income_list';
      let expenseUrl = '/expenses.php?action=list';

      if (startDate && endDate) {
        pnlUrl += `?start_date=${startDate}&end_date=${endDate}`;
        incomeUrl += `&start_date=${startDate}&end_date=${endDate}`;
        expenseUrl += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const [pnlRes, incomeRes, expenseRes] = await Promise.all([
        api.get(pnlUrl),
        api.get(incomeUrl),
        api.get(expenseUrl)
      ]);

      if (pnlRes.data && pnlRes.data.income && pnlRes.data.expenses) {
        setPnlData(pnlRes.data);
      } else {
        setPnlData(null);
      }
      if (incomeRes.data && Array.isArray(incomeRes.data.incomes)) {
        setOtherIncomes(incomeRes.data.incomes);
      } else {
        setOtherIncomes([]);
      }
      if (expenseRes.data && Array.isArray(expenseRes.data.expenses)) {
        setExpenses(expenseRes.data.expenses);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error('Failed to fetch P&L data', err);
      setPnlData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPnL();
  }, [startDate, endDate]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingExpense(true);
      await api.post('/expenses.php?action=save', newExpense);
      setIsExpenseModalOpen(false);
      setNewExpense({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Tea Expense',
        amount: '',
        remarks: ''
      });
      fetchPnL();
    } catch (err) {
      console.error(err);
      alert('Failed to save expense');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return;
    try {
      await api.post('/expenses.php?action=delete', { id });
      fetchPnL();
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    }
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingIncome(true);
      await api.post('/profit.php?action=save_other_income', newIncome);
      setIsIncomeModalOpen(false);
      setNewIncome({
        income_date: new Date().toISOString().split('T')[0],
        category: 'Interest From Bank',
        amount: '',
        reference_no: '',
        remarks: ''
      });
      fetchPnL();
    } catch (err) {
      console.error(err);
      alert('Failed to save income');
    } finally {
      setSavingIncome(false);
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    try {
      await api.post('/profit.php?action=delete_other_income', { id });
      fetchPnL();
    } catch (err) {
      console.error(err);
      alert('Failed to delete income');
    }
  };

  // Memos for Expenses filtering
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const q = expenseSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.remarks && e.remarks.toLowerCase().includes(q)) ||
        e.amount.toString().includes(q);
      const matchesCategory = !expenseCategoryFilter || e.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  const totalFilteredExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Memos for Other Incomes filtering
  const filteredOtherIncomes = useMemo(() => {
    return otherIncomes.filter(i => {
      const q = incomeSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.remarks && i.remarks.toLowerCase().includes(q)) ||
        (i.reference_no && i.reference_no.toLowerCase().includes(q)) ||
        i.amount.toString().includes(q);
      const matchesCategory = !incomeCategoryFilter || i.category === incomeCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [otherIncomes, incomeSearch, incomeCategoryFilter]);

  const totalFilteredIncomes = useMemo(() => {
    return filteredOtherIncomes.reduce((sum, i) => sum + i.amount, 0);
  }, [filteredOtherIncomes]);

  // Period formatted display label
  const getPeriodLabel = () => {
    if (!startDate && !endDate) return 'All Recorded Transactions';
    const formatDate = (ds: string) => {
      if (!ds) return '';
      const d = new Date(ds);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  // Export dynamic Excel CSV depending on active view
  const handleExportCSV = () => {
    if (activeView === 'expenses') {
      const rows: any[] = [
        ['Office Expenses Ledger'],
        [`Period: ${getPeriodLabel()}`],
        [''],
        ['Date', 'Category', 'Amount (₹)', 'Remarks'],
        ...filteredExpenses.map(e => [
          e.expense_date,
          e.category,
          e.amount,
          e.remarks || ''
        ]),
        ['', 'Total', totalFilteredExpenses, '']
      ];
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Office_Expenses_${startDate || 'all'}_to_${endDate || 'all'}.csv`;
      link.click();
      return;
    }

    if (activeView === 'incomes') {
      const rows: any[] = [
        ['Other Incomes Ledger'],
        [`Period: ${getPeriodLabel()}`],
        [''],
        ['Date', 'Category', 'Amount (₹)', 'Reference / UTR', 'Remarks'],
        ...filteredOtherIncomes.map(i => [
          i.income_date,
          i.category,
          i.amount,
          i.reference_no || '',
          i.remarks || ''
        ]),
        ['', 'Total', totalFilteredIncomes, '', '']
      ];
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Other_Incomes_${startDate || 'all'}_to_${endDate || 'all'}.csv`;
      link.click();
      return;
    }

    if (!pnlData || !pnlData.income || !pnlData.expenses) return;

    const rows: any[] = [];
    rows.push(['Profit & Loss A/c']);
    rows.push([`For the Period ${getPeriodLabel()}`]);
    rows.push(['']);
    rows.push(['Particulars (Dr. Expenses)', 'Amount (₹)', 'Particulars (Cr. Income)', 'Amount (₹)']);

    // Build left and right arrays
    const left: { name: string; amount: number | string }[] = [
      { name: 'Commission Paid to Channel', amount: pnlData.expenses.commission_paid_channel },
      { name: 'Tea Expense', amount: pnlData.expenses.standard_heads['Tea Expense'] || 0 },
      { name: 'Advertising Expenses', amount: pnlData.expenses.standard_heads['Advertising Expenses'] || 0 },
      { name: 'Bank Charges', amount: pnlData.expenses.standard_heads['Bank Charges'] || 0 },
      { name: 'Courier Charges', amount: pnlData.expenses.standard_heads['Courier Charges'] || 0 },
      { name: 'Office Expenses', amount: pnlData.expenses.standard_heads['Office Expenses'] || 0 },
      { name: 'Office Rent', amount: pnlData.expenses.standard_heads['Office Rent'] || 0 },
      { name: 'Repairs and Maintenance Charges', amount: pnlData.expenses.standard_heads['Repairs and Maintenance Charges'] || 0 },
      { name: 'Salary', amount: pnlData.expenses.standard_heads['Salary'] || 0 },
      { name: 'Water expense', amount: pnlData.expenses.standard_heads['Water expense'] || 0 },
      { name: 'Stationery Exp', amount: pnlData.expenses.standard_heads['Stationery Exp'] || 0 },
      { name: 'Depreciation Exp', amount: pnlData.expenses.standard_heads['Depreciation Exp'] || 0 },
      { name: 'Misc Exp. / Food exp', amount: pnlData.expenses.standard_heads['Misc Exp. / Food exp'] || 0 },
      { name: 'Remuneration', amount: pnlData.expenses.standard_heads['Remuneration'] || 0 },
    ];

    // Add custom heads
    Object.entries(pnlData.expenses.custom_heads || {}).forEach(([cat, amt]) => {
      left.push({ name: cat, amount: amt });
    });

    const right: { name: string; amount: number | string }[] = [
      { name: 'Interest From Bank', amount: pnlData.income.interest_from_bank },
      { name: 'Commission received Bank NBFC', amount: pnlData.income.bank_nbfc_commission },
      { name: 'Commission received from Channel', amount: pnlData.income.commission_from_channel },
      { name: 'Commission received from Dealer', amount: pnlData.income.commission_from_dealer },
    ];

    // Add extra custom other incomes
    const knownIncomes = ['Interest From Bank', 'Commission received from Channel', 'Commission received from Dealer'];
    Object.entries(pnlData.income.other_incomes_by_category || {}).forEach(([cat, amt]) => {
      if (!knownIncomes.includes(cat) && amt > 0) {
        right.push({ name: cat, amount: amt });
      }
    });

    const maxRows = Math.max(left.length, right.length);
    for (let i = 0; i < maxRows; i++) {
      const l = left[i] || { name: '', amount: '' };
      const r = right[i] || { name: '', amount: '' };
      rows.push([
        l.name, 
        l.amount !== '' ? l.amount : '', 
        r.name, 
        r.amount !== '' ? r.amount : ''
      ]);
    }

    rows.push(['---------------------------', '----------', '---------------------------', '----------']);
    rows.push(['Subtotal Expenses', pnlData.expenses.total_expenses, '', '']);
    if (pnlData.net_profit >= 0) {
      rows.push(['Net Profit', pnlData.net_profit, '', '']);
      rows.push(['Total', pnlData.balancing_total, 'Total', pnlData.income.total_income]);
    } else {
      rows.push(['', '', 'Net Loss', Math.abs(pnlData.net_profit)]);
      rows.push(['Total', pnlData.expenses.total_expenses, 'Total', pnlData.balancing_total]);
    }

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Profit_and_Loss_Statement_${startDate || 'all'}_to_${endDate || 'all'}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-2.5 print:space-y-2 print:p-0">
      {/* Top Controls Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2.5 bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xs text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                P&L & Office Expenses
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Financial Hub
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Period: <span className="font-semibold text-slate-700 dark:text-slate-200">{getPeriodLabel()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Presets */}
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {['FY 2026-27', 'FY 2025-26', 'FY 2024-25', 'THIS_MONTH', 'CUSTOM'].map((preset) => {
              const label = preset === 'THIS_MONTH' ? 'This Month' : preset === 'CUSTOM' ? 'Custom' : preset;
              const isSelected = periodPreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetChange(preset)}
                  className={`px-2 py-1 rounded-md transition-all text-xs ${
                    isSelected 
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs font-bold' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <Calendar className="w-3 h-3 text-slate-400" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => { setPeriodPreset('CUSTOM'); setStartDate(e.target.value); }}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => { setPeriodPreset('CUSTOM'); setEndDate(e.target.value); }}
              className="bg-transparent text-slate-700 dark:text-slate-300 focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={fetchPnL}
            title="Refresh"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>

          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Other Income</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Statement</span>
          </button>
        </div>
      </div>

      {/* View Navigation Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveView('pnl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'pnl'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>P&L Statement & Overview</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('expenses')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'expenses'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>Office Expenses Ledger ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('incomes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeView === 'incomes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>Other Incomes Ledger ({otherIncomes.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {activeView === 'expenses' && (
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>+ Log Expense</span>
            </button>
          )}
          {activeView === 'incomes' && (
            <button
              type="button"
              onClick={() => setIsIncomeModalOpen(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shadow-xs"
            >
              <Plus className="w-3 h-3" />
              <span>+ Log Other Income</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= VIEW 1: P&L STATEMENT ================= */}
      {activeView === 'pnl' && (
        <>
          {/* KPI Cards */}
          {pnlData && pnlData.income && pnlData.expenses && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 print:grid-cols-4">
          {/* Total Revenue */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue (Cr.)</p>
                <h3 className="text-xl sm:text-2xl font-mono font-black text-slate-800 dark:text-white mt-0.5">
                  ₹{(pnlData.income.total_income || 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
              <span>NBFC: ₹{(pnlData.income.bank_nbfc_commission || 0).toLocaleString()}</span>
              <span>Other: ₹{((pnlData.income.total_income || 0) - (pnlData.income.bank_nbfc_commission || 0)).toLocaleString()}</span>
            </div>
          </div>

          {/* Total Expenses */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Expenses (Dr.)</p>
                <h3 className="text-xl sm:text-2xl font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                  ₹{(pnlData.expenses.total_expenses || 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
              <span>Channel: ₹{(pnlData.expenses.commission_paid_channel || 0).toLocaleString()}</span>
              <span>Office: ₹{(pnlData.expenses.subtotal_office_expenses || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`rounded-xl p-2.5 sm:p-3 border shadow-xs relative overflow-hidden ${
            (pnlData.net_profit ?? 0) >= 0 
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-rose-950/20 dark:to-amber-950/10 border-rose-200 dark:border-rose-800/60'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    (pnlData.net_profit ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}>
                    {(pnlData.net_profit ?? 0) >= 0 ? 'Net Profit' : 'Net Loss'}
                  </p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    (pnlData.net_profit ?? 0) >= 0 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100' : 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100'
                  }`}>
                    {pnlData.net_margin_percent ?? 0}% Margin
                  </span>
                </div>
                <h3 className={`text-xl sm:text-2xl font-mono font-black mt-0.5 ${
                  (pnlData.net_profit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  ₹{Math.abs(pnlData.net_profit ?? 0).toLocaleString()}
                </h3>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                (pnlData.net_profit ?? 0) >= 0 ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-800/50 text-rose-600 dark:text-rose-300'
              }`}>
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5">
              {(pnlData.net_profit ?? 0) >= 0 ? 'Surplus carried to Capital A/c' : 'Deficit / Loss in period'}
            </div>
          </div>

          {/* Channel Payout Ratio */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Channel Payout Ratio</p>
                <h3 className="text-xl sm:text-2xl font-mono font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {(pnlData.income.total_income || 0) > 0 ? (((pnlData.expenses.commission_paid_channel || 0) / pnlData.income.total_income) * 100).toFixed(1) : 0}%
                </h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
              <span>Paid: ₹{(pnlData.expenses.commission_paid_channel || 0).toLocaleString()}</span>
              <span>Retained: ₹{((pnlData.income.total_income || 0) - (pnlData.expenses.commission_paid_channel || 0)).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Statement Sheet — Exact Excel Match */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs overflow-hidden print:border-black print:shadow-none">
        
        {/* Printable Header */}
        <div className="p-3 sm:p-4 text-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
            Profit & Loss A/c
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
            For the Period: <span className="font-mono text-indigo-600 dark:text-indigo-400">{getPeriodLabel()}</span>
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
            Calculating Profit & Loss Statement...
          </div>
        ) : (!pnlData || !pnlData.income || !pnlData.expenses) ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No financial data found for the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-300 dark:divide-slate-700">
            
            {/* ================= LEFT SIDE: EXPENSES (DR.) ================= */}
            <div className="flex flex-col h-full bg-white dark:bg-slate-800">
              <div className="sticky top-0 z-10 grid grid-cols-12 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-[11px] uppercase px-3 py-2 border-b border-slate-300 dark:border-slate-700 shadow-xs">
                <div className="col-span-8">Particulars (Expenses / Outflows)</div>
                <div className="col-span-4 text-right">Amount (₹)</div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs max-h-[calc(100vh-340px)] min-h-[380px] overflow-y-auto custom-scrollbar">
                
                {/* 1. Commission Paid to Channel */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Commission Paid to Channel
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {pnlData.expenses.commission_paid_channel > 0 
                      ? pnlData.expenses.commission_paid_channel.toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 2. Tea Expense */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Tea Expense</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Tea Expense'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Tea Expense'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 3. Advertising Expenses */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Advertising Expenses</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Advertising Expenses'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Advertising Expenses'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 4. Bank Charges */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Bank Charges</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Bank Charges'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Bank Charges'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 5. Courier Charges */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Courier Charges</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Courier Charges'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Courier Charges'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 6. Office Expenses */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Office Expenses</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Office Expenses'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Office Expenses'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 7. Office Rent */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Office Rent</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Office Rent'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Office Rent'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 8. Repairs and Maintenance Charges */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Repairs and Maintenance Charges</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Repairs and Maintenance Charges'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Repairs and Maintenance Charges'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 9. Salary */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Salary</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Salary'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Salary'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 10. Water expense */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Water expense</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Water expense'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Water expense'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 11. Stationery Exp */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Stationery Exp</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Stationery Exp'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Stationery Exp'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 12. Depreciation Exp */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Depreciation Exp</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Depreciation Exp'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Depreciation Exp'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 13. Misc Exp. / Food exp */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Misc Exp. / Food exp</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Misc Exp. / Food exp'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Misc Exp. / Food exp'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 14. Remuneration */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300">Remuneration</div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {(pnlData.expenses.standard_heads['Remuneration'] || 0) > 0 
                      ? pnlData.expenses.standard_heads['Remuneration'].toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* Any Custom Expense categories */}
                {Object.entries(pnlData.expenses.custom_heads || {}).map(([cat, amt]) => (
                  <div key={cat} className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="col-span-8 text-slate-700 dark:text-slate-300">{cat}</div>
                    <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {amt.toLocaleString()}
                    </div>
                  </div>
                ))}

                {/* Subtotal of Expenses */}
                <div className="grid grid-cols-12 px-3 py-2 bg-slate-50/70 dark:bg-slate-900/30 font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                  <div className="col-span-8">Subtotal (Operating Expenses)</div>
                  <div className="col-span-4 text-right font-mono">
                    ₹{pnlData.expenses.total_expenses.toLocaleString()}
                  </div>
                </div>

                {/* Net Profit (Balancing row on Left if Profit) */}
                {pnlData.net_profit >= 0 && (
                  <div className="grid grid-cols-12 px-3 py-2 bg-emerald-50/60 dark:bg-emerald-950/20 font-bold text-emerald-800 dark:text-emerald-300 border-t border-emerald-200 dark:border-emerald-800">
                    <div className="col-span-8 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      Net Profit (Transferred to Capital)
                    </div>
                    <div className="col-span-4 text-right font-mono text-sm font-black text-emerald-700 dark:text-emerald-300">
                      ₹{pnlData.net_profit.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Total Left Side */}
              <div className="sticky bottom-0 z-10 grid grid-cols-12 px-3 py-2 bg-slate-100 dark:bg-slate-900 font-black text-sm border-t-2 border-b-4 border-slate-800 dark:border-slate-300 shadow-xs">
                <div className="col-span-8 text-slate-900 dark:text-white uppercase tracking-wider">Total</div>
                <div className="col-span-4 text-right font-mono text-slate-900 dark:text-white">
                  ₹{pnlData.balancing_total.toLocaleString()}
                </div>
              </div>
            </div>

            {/* ================= RIGHT SIDE: INCOME (CR.) ================= */}
            <div className="flex flex-col h-full bg-white dark:bg-slate-800">
              <div className="sticky top-0 z-10 grid grid-cols-12 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-[11px] uppercase px-3 py-2 border-b border-slate-300 dark:border-slate-700 shadow-xs">
                <div className="col-span-8">Particulars (Income / Inflows)</div>
                <div className="col-span-4 text-right">Amount (₹)</div>
              </div>

              <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs max-h-[calc(100vh-340px)] min-h-[380px] overflow-y-auto custom-scrollbar">
                
                {/* 1. Interest From Bank */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300 flex items-center justify-between pr-2">
                    <span>Interest From Bank</span>
                    <button 
                      onClick={() => {
                        setNewIncome({ ...newIncome, category: 'Interest From Bank' });
                        setIsIncomeModalOpen(true);
                      }}
                      className="text-[10px] text-indigo-500 hover:underline print:hidden"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {pnlData.income.interest_from_bank > 0 
                      ? pnlData.income.interest_from_bank.toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 2. Commission received Bank NBFC */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Commission received Bank NBFC
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {pnlData.income.bank_nbfc_commission > 0 
                      ? pnlData.income.bank_nbfc_commission.toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 3. Commission received from Channel */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300 flex items-center justify-between pr-2">
                    <span>Commission received from Channel</span>
                    <button 
                      onClick={() => {
                        setNewIncome({ ...newIncome, category: 'Commission received from Channel' });
                        setIsIncomeModalOpen(true);
                      }}
                      className="text-[10px] text-indigo-500 hover:underline print:hidden"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {pnlData.income.commission_from_channel > 0 
                      ? pnlData.income.commission_from_channel.toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* 4. Commission received from Dealer */}
                <div className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <div className="col-span-8 text-slate-700 dark:text-slate-300 flex items-center justify-between pr-2">
                    <span>Commission received from Dealer</span>
                    <button 
                      onClick={() => {
                        setNewIncome({ ...newIncome, category: 'Commission received from Dealer' });
                        setIsIncomeModalOpen(true);
                      }}
                      className="text-[10px] text-indigo-500 hover:underline print:hidden"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {pnlData.income.commission_from_dealer > 0 
                      ? pnlData.income.commission_from_dealer.toLocaleString() 
                      : '—'}
                  </div>
                </div>

                {/* Custom other income heads */}
                {Object.entries(pnlData.income.other_incomes_by_category || {}).map(([cat, amt]) => {
                  if (['Interest From Bank', 'Commission received from Channel', 'Commission received from Dealer'].includes(cat)) {
                    return null;
                  }
                  return (
                    <div key={cat} className="grid grid-cols-12 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="col-span-8 text-slate-700 dark:text-slate-300">{cat}</div>
                      <div className="col-span-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {amt.toLocaleString()}
                      </div>
                    </div>
                  );
                })}

                {/* Net Loss (Balancing row on Right if Loss) */}
                {pnlData.net_profit < 0 && (
                  <div className="grid grid-cols-12 px-3 py-2 bg-rose-50/60 dark:bg-rose-950/20 font-bold text-rose-800 dark:text-rose-300 border-t border-rose-200 dark:border-rose-800">
                    <div className="col-span-8 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                      Net Loss (Deficit)
                    </div>
                    <div className="col-span-4 text-right font-mono text-sm font-black text-rose-700 dark:text-rose-300">
                      ₹{Math.abs(pnlData.net_profit).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Spacer padding to match left column visually */}
                <div className="py-12 hidden lg:block bg-slate-50/20 dark:bg-slate-900/10"></div>
              </div>

              {/* Total Right Side */}
              <div className="sticky bottom-0 z-10 grid grid-cols-12 px-3 py-2 bg-slate-100 dark:bg-slate-900 font-black text-sm border-t-2 border-b-4 border-slate-800 dark:border-slate-300 shadow-xs">
                <div className="col-span-8 text-slate-900 dark:text-white uppercase tracking-wider">Total</div>
                <div className="col-span-4 text-right font-mono text-slate-900 dark:text-white">
                  ₹{pnlData.balancing_total.toLocaleString()}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Footer Note */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Balance Verification: <strong className="text-slate-700 dark:text-slate-300">Net Profit = Total Income − Total Expenses</strong></span>
          </div>
          <div className="mt-1 sm:mt-0 font-mono text-xs font-bold flex flex-wrap items-center gap-2">
            <span className="text-rose-600 dark:text-rose-400">TDS: ₹{(pnlData?.taxes?.tds_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-amber-600 dark:text-amber-400">IGST: ₹{(pnlData?.taxes?.igst_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <span className="text-amber-600 dark:text-amber-400">SGST: ₹{(pnlData?.taxes?.sgst_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ================= VIEW 2: OFFICE EXPENSES LEDGER ================= */}
      {activeView === 'expenses' && (
        <div className="space-y-2.5">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <ReceiptText className="w-4 h-4 text-rose-500" />
                Office Expenses Ledger
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track and manage all operational vouchers for period: <span className="font-semibold text-slate-700 dark:text-slate-300">{getPeriodLabel()}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search remarks, amount..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-rose-500 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">All Categories ({expenses.length})</option>
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Expense</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Filtered Expenses</p>
                <h4 className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                  ₹{totalFilteredExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{filteredExpenses.length} expense voucher{filteredExpenses.length === 1 ? '' : 's'}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <ReceiptText className="w-4 h-4 text-rose-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Average Voucher</p>
                <h4 className="text-xl font-bold font-mono text-slate-800 dark:text-white mt-0.5">
                  ₹{filteredExpenses.length > 0 ? (totalFilteredExpenses / filteredExpenses.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Per recorded voucher</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Scale className="w-4 h-4 text-slate-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">P&L Operating Impact</p>
                <h4 className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  Direct Debit Expense
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Directly deducted in Net Profit</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-auto relative custom-scrollbar max-h-[calc(100vh-270px)] min-h-[400px]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-xs">
                  <tr>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Amount</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 w-full">Remarks / Description</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-rose-500" />
                        Loading expense vouchers...
                      </td>
                    </tr>
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No expenses logged for this filter. Click "+ Add Expense" to record a new voucher.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-2.5 py-1.5 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(e.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50 rounded text-[11px] font-semibold">
                            {e.category}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 max-w-md truncate" title={e.remarks}>
                          {e.remarks || '—'}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            title="Delete expense entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredExpenses.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs">
                    <tr>
                      <td colSpan={2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 uppercase text-[10px] tracking-wider text-slate-500">
                        Total ({filteredExpenses.length} records)
                      </td>
                      <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 text-right font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                        ₹{totalFilteredExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 3: OTHER INCOMES LEDGER ================= */}
      {activeView === 'incomes' && (
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-500" />
                Other Incomes Ledger
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bank interest, dealer commission, documentation charges for: <span className="font-semibold text-slate-700 dark:text-slate-300">{getPeriodLabel()}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search remarks, UTR..."
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <select
                value={incomeCategoryFilter}
                onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="">All Income Types ({otherIncomes.length})</option>
                {OTHER_INCOME_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(true)}
                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Income</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Filtered Other Income</p>
                <h4 className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ₹{totalFilteredIncomes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{filteredOtherIncomes.length} recorded voucher{filteredOtherIncomes.length === 1 ? '' : 's'}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">Credit Operating Head</p>
                <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Added to Total Income
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Increases net profit margin</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
            <div className="overflow-auto relative custom-scrollbar max-h-[calc(100vh-270px)] min-h-[400px]">
              <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-xs">
                  <tr>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">Category</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 text-right">Amount</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">Reference / UTR</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 w-full">Remarks</th>
                    <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-emerald-500" />
                        Loading income entries...
                      </td>
                    </tr>
                  ) : filteredOtherIncomes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                        No other income records match your filters. Click "+ Add Income" to record a new entry.
                      </td>
                    </tr>
                  ) : (
                    filteredOtherIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-2.5 py-1.5 font-mono text-slate-600 dark:text-slate-400">
                          {new Date(inc.income_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/50 rounded text-[11px] font-semibold">
                            {inc.category}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{inc.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-2.5 py-1.5 font-mono text-[11px] text-slate-500">
                          {inc.reference_no || '—'}
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={inc.remarks}>
                          {inc.remarks || '—'}
                        </td>
                        <td className="px-2.5 py-1.5 text-center">
                          <button
                            onClick={() => handleDeleteIncome(inc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            title="Delete income entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredOtherIncomes.length > 0 && (
                  <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs font-bold border-t-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xs">
                    <tr>
                      <td colSpan={2} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 uppercase text-[10px] tracking-wider text-slate-500">
                        Total ({filteredOtherIncomes.length} records)
                      </td>
                      <td className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 text-right font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{totalFilteredIncomes.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={3} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG OTHER INCOME ================= */}
      <Modal 
        isOpen={isIncomeModalOpen} 
        onClose={() => setIsIncomeModalOpen(false)} 
        zClassName="z-[9999]" 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Banknote className="w-4.5 h-4.5 text-emerald-500" /> Log Other Income
          </h3>
          <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input 
              type="date" 
              required 
              value={newIncome.income_date} 
              onChange={(e) => setNewIncome({ ...newIncome, income_date: e.target.value })} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select 
              required 
              value={newIncome.category} 
              onChange={(e) => setNewIncome({ ...newIncome, category: e.target.value })} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
            >
              {OTHER_INCOME_CATEGORIES.map(cat => (
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
              value={newIncome.amount} 
              onChange={(e) => setNewIncome({ ...newIncome, amount: e.target.value })} 
              placeholder="e.g. 2400"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reference / UTR / Cheque No.</label>
            <input 
              type="text" 
              value={newIncome.reference_no} 
              onChange={(e) => setNewIncome({ ...newIncome, reference_no: e.target.value })} 
              placeholder="Optional reference..." 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
            <input 
              type="text" 
              value={newIncome.remarks} 
              onChange={(e) => setNewIncome({ ...newIncome, remarks: e.target.value })} 
              placeholder="Description (e.g. Q1 Bank Savings Interest)..." 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={() => setIsIncomeModalOpen(false)} 
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={savingIncome} 
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-500/30"
            >
              {savingIncome ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Income
            </button>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: LOG EXPENSE ================= */}
      <Modal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        zClassName="z-[9999]" 
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ReceiptText className="w-4.5 h-4.5 text-rose-500" /> Log Office Expense
          </h3>
          <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input 
              type="date" 
              required 
              value={newExpense.expense_date} 
              onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select 
              required 
              value={newExpense.category} 
              onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"
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
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} 
              placeholder="e.g. 10000"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
            <input 
              type="text" 
              value={newExpense.remarks} 
              onChange={(e) => setNewExpense({ ...newExpense, remarks: e.target.value })} 
              placeholder="Expense description..." 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="button" 
              onClick={() => setIsExpenseModalOpen(false)} 
              className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={savingExpense} 
              className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-lg shadow-rose-500/30"
            >
              {savingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
