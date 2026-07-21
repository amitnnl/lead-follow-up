import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator, Download, Printer, Copy, Check,
  TrendingUp, FilePlus, User, Car
} from 'lucide-react';
import api from '../lib/axios';

export interface IrrCalculatorProps {
  initialLoanAmount?: number;
  initialCustomerName?: string;
  initialVehicle?: string;
  leadId?: number | string;
  onSaveToLeadNotes?: (quotationSummary: string) => void;
  isCompact?: boolean;
  isReadOnly?: boolean;
}

interface ScheduleRow {
  month: number;
  openingBalance: number;
  emi: number;
  principal: number;
  interest: number;
  closingBalance: number;
}

export default function IrrCalculatorComponent({
  initialLoanAmount = 500000,
  initialCustomerName = '',
  initialVehicle = '',
  leadId,
  onSaveToLeadNotes,
  isCompact = false,
  isReadOnly = false
}: IrrCalculatorProps) {
  // Modes: 'reducing'
  const calcMode = 'reducing';

  // Basic Inputs
  const [vehiclePrice, setVehiclePrice] = useState<number>(Math.round(initialLoanAmount * 1.25) || 650000);
  const [downPayment, setDownPayment] = useState<number>(Math.round((initialLoanAmount * 1.25) - initialLoanAmount) || 150000);
  const [loanAmount, setLoanAmount] = useState<number>(initialLoanAmount || 500000);
  const [tenureMonths, setTenureMonths] = useState<number>(36);

  // Mode inputs
  const [reducingRate, setReducingRate] = useState<number>(10.50); // % p.a.
  const flatRate = 5.75; // % p.a.
  const customEmi = 16500; // ₹

  // Upfront Deductions / Fees removed

  // Leads Dropdown state (for importing)
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedToNote, setSavedToNote] = useState<boolean>(false);

  useEffect(() => {
    if (initialLoanAmount && initialLoanAmount > 0) {
      setLoanAmount(initialLoanAmount);
    }
  }, [initialLoanAmount]);

  // Fetch leads list if not compact or if lead importer is enabled
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await api.get('/leads');
        setLeadsList(response.data.leads || []);
      } catch (err) {
        console.error('Failed to load leads for calculator', err);
      }
    };
    if (!leadId) {
      fetchLeads();
    }
  }, [leadId]);

  const handleSelectLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedLeadId(val);
    if (!val) return;
    const found = leadsList.find(l => l.id.toString() === val || l.lead_id === val);
    if (found) {
      if (found.loan_amount) setLoanAmount(Number(found.loan_amount));
    }
  };

  // Helper: Solve for monthly reducing rate (r) using bisection
  const solveMonthlyRateFromEmi = (principal: number, emiVal: number, n: number): number => {
    if (principal <= 0 || emiVal <= 0 || n <= 0) return 0;
    if (emiVal * n <= principal) return 0; // 0% interest or invalid

    let low = 0.0;
    let high = 1.0; // 1200% p.a. max
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      const calcEmi = principal * (mid * Math.pow(1 + mid, n)) / (Math.pow(1 + mid, n) - 1);
      if (calcEmi > emiVal) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return (low + high) / 2;
  };



  // Main calculations memoized
  const calculations = useMemo(() => {
    const p = Math.max(0, Number(loanAmount) || 0);
    const n = Math.max(1, Number(tenureMonths) || 12);

    let emiResult = 0;
    let monthlyReducingRate = 0;

    if (calcMode === 'reducing') {
      const annualRate = Math.max(0, Number(reducingRate) || 0);
      monthlyReducingRate = annualRate / 1200;
      if (monthlyReducingRate === 0) {
        emiResult = p / n;
      } else {
        emiResult = p * (monthlyReducingRate * Math.pow(1 + monthlyReducingRate, n)) / (Math.pow(1 + monthlyReducingRate, n) - 1);
      }
    } else if (calcMode === 'flat') {
      const flatPcnt = Math.max(0, Number(flatRate) || 0);
      const totalInterestFlat = p * (flatPcnt / 100) * (n / 12);
      emiResult = (p + totalInterestFlat) / n;
      monthlyReducingRate = solveMonthlyRateFromEmi(p, emiResult, n);
    } else {
      // custom_emi mode
      emiResult = Math.max(0, Number(customEmi) || 0);
      monthlyReducingRate = solveMonthlyRateFromEmi(p, emiResult, n);
    }

    // Upfront fees & Net IRR calculations removed as per request
    const netDisbursed = 0;
    const netAnnualIrr = 0;

    // Standard Nominal Annual Reducing Rate
    const nominalAnnualIrr = monthlyReducingRate * 12 * 100;

    // Total Payments & Interest
    const totalPayable = emiResult * n;
    const totalInterest = Math.max(0, totalPayable - p);

    // Equivalent Flat Rate % p.a.
    const flatRateEquivalent = p > 0 ? ((totalInterest / p) / (n / 12)) * 100 : 0;

    // Generate Amortization Schedule
    const schedule: ScheduleRow[] = [];
    let currentBalance = p;

    for (let m = 1; m <= n; m++) {
      const interestForMonth = currentBalance * monthlyReducingRate;
      let principalForMonth = emiResult - interestForMonth;

      if (m === n || principalForMonth > currentBalance) {
        principalForMonth = currentBalance;
      }

      const closeBal = Math.max(0, currentBalance - principalForMonth);

      schedule.push({
        month: m,
        openingBalance: currentBalance,
        emi: interestForMonth + principalForMonth,
        principal: principalForMonth,
        interest: interestForMonth,
        closingBalance: closeBal
      });

      currentBalance = closeBal;
      if (currentBalance <= 0) break;
    }

    return {
      principal: p,
      tenure: n,
      emi: Math.round(emiResult),
      nominalAnnualIrr: Number(nominalAnnualIrr.toFixed(2)),
      netAnnualIrr: Number(netAnnualIrr.toFixed(2)),
      flatRateEquivalent: Number(flatRateEquivalent.toFixed(2)),
      processingFeeAmount: 0,
      docChargesAmount: 0,
      advanceEmiCount: 0,
      advanceEmiAmount: 0,
      netDisbursed: Math.round(netDisbursed),
      totalPayable: Math.round(totalPayable),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  }, [loanAmount, tenureMonths, calcMode, reducingRate, flatRate, customEmi]);

  // Quotation text formatter
  const generateQuotationText = (): string => {
    const vehicleName = initialVehicle || (leadsList.find(l => l.id.toString() === selectedLeadId)?.vehicle_make_model) || 'Specified Vehicle';
    return `*VEHICLE LOAN QUOTATION & IRR BREAKDOWN*
----------------------------------------
*Customer Name:* ${initialCustomerName || (leadsList.find(l => l.id.toString() === selectedLeadId)?.customer_name) || 'Valued Customer'}
*Vehicle Model:* ${vehicleName}
*Vehicle Price:* ₹${vehiclePrice.toLocaleString()} | *Down Payment:* ₹${downPayment.toLocaleString()}
*Loan Amount:* ₹${calculations.principal.toLocaleString()}
*Tenure:* ${calculations.tenure} Months

*Key Financials:*
• *Monthly EMI:* ₹${calculations.emi.toLocaleString()}
• *Nominal Reducing Rate:* ${calculations.nominalAnnualIrr}% p.a.
• *Equivalent Flat Rate:* ${calculations.flatRateEquivalent}% p.a.
----------------------------------------
Generated via Vehicle Finance Lead Portal`;
  };

  const handleCopyQuote = () => {
    const text = generateQuotationText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCsv = () => {
    let csv = 'Month,Opening Balance,EMI Payment,Principal Component,Interest Component,Closing Balance\n';
    calculations.schedule.forEach(row => {
      csv += `${row.month},${row.openingBalance.toFixed(2)},${row.emi.toFixed(2)},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.closingBalance.toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Loan_Schedule_INR_${calculations.principal}_${calculations.tenure}M.csv`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveNote = async () => {
    const text = generateQuotationText();
    if (onSaveToLeadNotes) {
      onSaveToLeadNotes(text);
      setSavedToNote(true);
      setTimeout(() => setSavedToNote(false), 2500);
    } else if (leadId) {
      try {
        await api.post('/followups/add', {
          lead_id: leadId,
          status: 'pending',
          next_followup_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
          remarks: `[LOAN QUOTATION CALCULATED]\n${text}`
        });
        setSavedToNote(true);
        setTimeout(() => setSavedToNote(false), 2500);
      } catch (err) {
        alert('Failed to save quote to lead notes');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Top Header Section */}
      {!isCompact && (
        <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 text-primary-600 dark:text-primary-400 rounded-xl border border-blue-100 dark:border-blue-500/20">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 dark:text-white">IRR Calculator</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                Compute Reducing Rate (IRR), Flat Rate equivalent, Net Disbursed Cash Flow & Amortization Schedule
              </p>
            </div>
          </div>

          {/* Lead Importer */}
          {!leadId && leadsList.length > 0 && (
            <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm">
              <User className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
              <select
                value={selectedLeadId}
                onChange={handleSelectLead}
                disabled={isReadOnly}
                className="bg-transparent text-slate-800 dark:text-slate-100 font-medium focus:outline-none cursor-pointer max-w-[200px] disabled:opacity-50"
              >
                <option value="" className="text-slate-800 dark:text-slate-200">-- Import from Active Lead --</option>
                {leadsList.map(l => (
                  <option key={l.id} value={l.id} className="text-slate-800 dark:text-slate-200">
                    {l.customer_name} (₹{Number(l.loan_amount || 0).toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Inputs vs Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Calculation Controls */}
        <div className="no-print lg:col-span-2">
          <fieldset disabled={isReadOnly} className="card p-6 border-slate-200/80 dark:border-slate-800 shadow-sm disabled:opacity-85 h-full flex flex-col justify-between">
            
            <div className="space-y-8">
              {/* Vehicle Price & Down Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-blue-500" /> Vehicle Price
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₹</div>
                    <input
                      type="number"
                      step="5000"
                      value={vehiclePrice}
                      onChange={(e) => {
                        const vp = Number(e.target.value);
                        setVehiclePrice(vp);
                        if (vp > downPayment) setLoanAmount(Math.max(0, vp - downPayment));
                      }}
                      className="input pl-8 font-semibold text-base py-2.5"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Down Payment
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₹</div>
                    <input
                      type="number"
                      step="5000"
                      value={downPayment}
                      onChange={(e) => {
                        const dp = Number(e.target.value);
                        setDownPayment(dp);
                        if (vehiclePrice > dp) setLoanAmount(Math.max(0, vehiclePrice - dp));
                      }}
                      className="input pl-8 font-semibold text-base py-2.5"
                    />
                  </div>
                </div>
              </div>

              {/* Loan Principal Amount */}
              <div>
                <label className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Principal Loan Amount</span>
                  <span className="text-xl font-extrabold text-primary-600 dark:text-primary-400">₹{loanAmount.toLocaleString()}</span>
                </label>
                <input
                  type="range"
                  min="50000"
                  max="5000000"
                  step="25000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 dark:bg-slate-700"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1.5 px-1">
                  <span>₹50K</span>
                  <span>₹25L</span>
                  <span>₹50L</span>
                </div>
              </div>

              {/* Tenure & Interest Rate */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Tenure */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Loan Tenure (Months)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[12, 24, 36, 48, 60, 72, 84].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTenureMonths(t)}
                        className={`py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                          tenureMonths === t
                            ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-700 dark:text-primary-400 shadow-sm'
                            : 'border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Nominal Reducing Rate
                  </label>
                  <div className="relative max-w-[200px]">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="50"
                      value={reducingRate}
                      onChange={(e) => setReducingRate(Number(e.target.value))}
                      className="input font-extrabold text-2xl py-3 pr-8 text-slate-800 dark:text-white"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 font-bold text-lg">%</div>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>

        {/* Right Column: Output Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-950 text-white p-8 border-0 shadow-xl relative overflow-hidden h-full flex flex-col justify-center min-h-[300px]">
            {/* Background decoration */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Monthly EMI</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black tracking-tighter">₹{calculations.emi.toLocaleString()}</span>
                <span className="text-lg font-medium text-slate-400">/mo</span>
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Nominal IRR</span>
                  <span className="text-lg font-bold">{calculations.nominalAnnualIrr}% p.a.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400 font-medium">Flat Rate Equiv.</span>
                  <span className="text-lg font-bold text-amber-400">{calculations.flatRateEquivalent}% p.a.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="no-print flex flex-wrap gap-3 items-center justify-between card p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyQuote}
            className="flex-1 md:flex-none btn bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm py-2 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-xl font-semibold"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="flex-1 md:flex-none btn bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm py-2 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-xl font-semibold"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 md:flex-none btn bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm py-2 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer rounded-xl font-semibold"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        {(leadId || onSaveToLeadNotes) && !isReadOnly && (
          <button
            type="button"
            onClick={handleSaveNote}
            className="w-full md:w-auto btn bg-primary-600 hover:bg-primary-700 text-white text-sm py-2 px-6 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer rounded-xl font-bold"
          >
            {savedToNote ? <Check className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
            {savedToNote ? 'Saved!' : 'Save to Lead Notes'}
          </button>
        )}
      </div>

      {/* Monthly Amortization Schedule Table */}
      <div className="card p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary-500" /> Complete Amortization Schedule ({calculations.tenure} Months)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Exact month-by-month cash flow breakdown between principal repayment and interest charges.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-800/90 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Month #</th>
                <th className="px-4 py-3">Opening Balance</th>
                <th className="px-4 py-3">Monthly Installment (EMI)</th>
                <th className="px-4 py-3 text-primary-600 dark:text-primary-400">Principal Repaid</th>
                <th className="px-4 py-3 text-amber-600 dark:text-amber-400">Interest Charged</th>
                <th className="px-4 py-3">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {calculations.schedule.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-bold font-mono text-slate-600 dark:text-slate-300">
                    Month {row.month}
                  </td>
                  <td className="px-4 py-2.5 font-mono">₹{Math.round(row.openingBalance).toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                    ₹{Math.round(row.emi).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-primary-600 dark:text-primary-400">
                    ₹{Math.round(row.principal).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-amber-600 dark:text-amber-400">
                    ₹{Math.round(row.interest).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                    ₹{Math.round(row.closingBalance).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100 dark:bg-slate-800/90 text-xs font-bold sticky bottom-0 border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="px-4 py-3 uppercase">Total Summary</td>
                <td className="px-4 py-3 font-mono">—</td>
                <td className="px-4 py-3 font-mono text-slate-900 dark:text-white">₹{calculations.totalPayable.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-primary-600 dark:text-primary-400">₹{calculations.principal.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-amber-600 dark:text-amber-400">₹{calculations.totalInterest.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono">₹0</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
