import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, Download, Printer, Copy, Check, ShieldCheck, 
  TrendingUp, FilePlus, ChevronDown, User, Car
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
  // Modes: 'reducing' | 'flat' | 'custom_emi'
  const [calcMode, setCalcMode] = useState<'reducing' | 'flat' | 'custom_emi'>('reducing');

  // Basic Inputs
  const [vehiclePrice, setVehiclePrice] = useState<number>(Math.round(initialLoanAmount * 1.25) || 650000);
  const [downPayment, setDownPayment] = useState<number>(Math.round((initialLoanAmount * 1.25) - initialLoanAmount) || 150000);
  const [loanAmount, setLoanAmount] = useState<number>(initialLoanAmount || 500000);
  const [tenureMonths, setTenureMonths] = useState<number>(36);

  // Mode inputs
  const [reducingRate, setReducingRate] = useState<number>(10.50); // % p.a.
  const [flatRate, setFlatRate] = useState<number>(5.75); // % p.a.
  const [customEmi, setCustomEmi] = useState<number>(16500); // ₹

  // Upfront Deductions / Fees
  const [showAdvanced, setShowAdvanced] = useState<boolean>(true);
  const [processingFeeType, setProcessingFeeType] = useState<'percent' | 'fixed'>('percent');
  const [processingFeeValue, setProcessingFeeValue] = useState<number>(1.0); // 1% or ₹5000
  const [docCharges, setDocCharges] = useState<number>(1500);
  const [advanceEmis, setAdvanceEmis] = useState<number>(0); // 0, 1, or 2

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

  // Helper: Solve Net Monthly IRR given net disbursement C0 and subsequent remaining EMIs
  const solveNetMonthlyIrr = (c0: number, emiVal: number, remainingMonths: number): number => {
    if (c0 <= 0 || emiVal <= 0 || remainingMonths <= 0) return 0;
    if (emiVal * remainingMonths <= c0) return 0;

    let low = 0.0;
    let high = 1.0;
    for (let iter = 0; iter < 50; iter++) {
      const mid = (low + high) / 2;
      // NPV = C0 - EMI * (1 - (1+mid)^(-remainingMonths)) / mid
      let pvEmis = 0;
      if (mid === 0) {
        pvEmis = emiVal * remainingMonths;
      } else {
        pvEmis = emiVal * ((1 - Math.pow(1 + mid, -remainingMonths)) / mid);
      }
      if (pvEmis < c0) {
        // Discount rate mid is too high -> lowers PV of future EMIs below C0
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
    const k = Math.min(n - 1, Math.max(0, Number(advanceEmis) || 0));

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

    // Upfront fees
    const pfVal = processingFeeType === 'percent' 
      ? p * ((Number(processingFeeValue) || 0) / 100)
      : (Number(processingFeeValue) || 0);
    const docVal = Number(docCharges) || 0;
    const advanceEmiTotal = emiResult * k;

    // Net Disbursement to customer/dealer
    const netDisbursed = Math.max(0, p - pfVal - docVal - advanceEmiTotal);
    const remainingInstallments = n - k;

    // Net Monthly IRR & Annualized Net IRR (XIRR)
    const netMonthlyRate = solveNetMonthlyIrr(netDisbursed, emiResult, remainingInstallments);
    const netAnnualIrr = netMonthlyRate * 12 * 100;

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
      processingFeeAmount: Math.round(pfVal),
      docChargesAmount: Math.round(docVal),
      advanceEmiCount: k,
      advanceEmiAmount: Math.round(advanceEmiTotal),
      netDisbursed: Math.round(netDisbursed),
      totalPayable: Math.round(totalPayable),
      totalInterest: Math.round(totalInterest),
      schedule
    };
  }, [loanAmount, tenureMonths, calcMode, reducingRate, flatRate, customEmi, processingFeeType, processingFeeValue, docCharges, advanceEmis]);

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
• *Total Interest Payable:* ₹${calculations.totalInterest.toLocaleString()}
• *Total Amount Payable:* ₹${calculations.totalPayable.toLocaleString()}

*Upfront Deductions & Net Cash Flow:*
• *Processing Fee:* ₹${calculations.processingFeeAmount.toLocaleString()}
• *Documentation / File Charges:* ₹${calculations.docChargesAmount.toLocaleString()}
• *Advance EMIs Collected:* ${calculations.advanceEmiCount} (₹${calculations.advanceEmiAmount.toLocaleString()})
• *Net Disbursement Amount:* ₹${calculations.netDisbursed.toLocaleString()}
• *Effective Net Annual IRR:* ${calculations.netAnnualIrr}% p.a.
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Calculation Controls (5 Cols) */}
        <div className="no-print lg:col-span-5 space-y-6">
          <fieldset disabled={isReadOnly} className="card p-6 border-slate-200/80 dark:border-slate-800 shadow-lg space-y-5 disabled:opacity-85">
            
            {/* Mode Selection Tabs */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Calculation Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCalcMode('reducing')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === 'reducing'
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Reducing (IRR)
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('flat')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === 'flat'
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Flat Rate
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('custom_emi')}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    calcMode === 'custom_emi'
                      ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Target EMI
                </button>
              </div>
            </div>

            {/* Vehicle Price & Down Payment */}
            <div className="grid grid-cols-2 gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-blue-500" /> Vehicle Price (₹)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={vehiclePrice}
                  onChange={(e) => {
                    const vp = Number(e.target.value);
                    setVehiclePrice(vp);
                    if (vp > downPayment) setLoanAmount(Math.max(0, vp - downPayment));
                  }}
                  className="input text-xs py-1.5 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Down Payment (₹)
                </label>
                <input
                  type="number"
                  step="5000"
                  value={downPayment}
                  onChange={(e) => {
                    const dp = Number(e.target.value);
                    setDownPayment(dp);
                    if (vehiclePrice > dp) setLoanAmount(Math.max(0, vehiclePrice - dp));
                  }}
                  className="input text-xs py-1.5 font-semibold"
                />
              </div>
            </div>

            {/* Loan Principal Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Principal Loan Amount (₹)</span>
                <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">₹{loanAmount.toLocaleString()}</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">₹</div>
                <input
                  type="number"
                  step="1000"
                  min="10000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Math.max(0, Number(e.target.value)))}
                  className="input pl-8 font-semibold text-base"
                />
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="25000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full mt-2 accent-primary-600 cursor-pointer"
              />
            </div>

            {/* Tenure (Months) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
                <span>Loan Tenure (Months)</span>
                <span className="font-mono text-primary-600 dark:text-primary-400 font-bold">{tenureMonths} Months ({((tenureMonths)/12).toFixed(1)} Yrs)</span>
              </label>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[12, 24, 36, 48, 60, 72, 84].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTenureMonths(t)}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      tenureMonths === t
                        ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-500 text-primary-700 dark:text-primary-400'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t}M
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Rate Input based on Mode */}
            {calcMode === 'reducing' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Nominal Reducing Rate (IRR % p.a.)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{reducingRate}%</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    value={reducingRate}
                    onChange={(e) => setReducingRate(Number(e.target.value))}
                    className="input font-semibold text-base"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold">%</div>
                </div>
              </div>
            )}

            {calcMode === 'flat' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Flat Interest Rate (% p.a.)</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">{flatRate}%</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="35"
                    value={flatRate}
                    onChange={(e) => setFlatRate(Number(e.target.value))}
                    className="input font-semibold text-base"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 font-bold">%</div>
                </div>
              </div>
            )}

            {calcMode === 'custom_emi' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Proposed Monthly EMI (₹)</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">₹{customEmi.toLocaleString()}</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">₹</div>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    value={customEmi}
                    onChange={(e) => setCustomEmi(Number(e.target.value))}
                    className="input pl-8 font-semibold text-base"
                  />
                </div>
              </div>
            )}

            {/* Upfront Fees & Subvention Section (Collapsible) */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 uppercase tracking-wider cursor-pointer"
              >
                <span>Upfront Deductions & Net Cash Flow</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3.5 space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                  {/* Processing Fee */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Processing Fee Type</label>
                      <select
                        value={processingFeeType}
                        onChange={(e: any) => setProcessingFeeType(e.target.value)}
                        className="input text-xs py-1.5"
                      >
                        <option value="percent">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Fee Value ({processingFeeType === 'percent' ? '%' : '₹'})
                      </label>
                      <input
                        type="number"
                        step={processingFeeType === 'percent' ? '0.25' : '500'}
                        value={processingFeeValue}
                        onChange={(e) => setProcessingFeeValue(Number(e.target.value))}
                        className="input text-xs py-1.5 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Doc Charges & Advance EMIs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Doc / Stamp Charges (₹)</label>
                      <input
                        type="number"
                        step="250"
                        value={docCharges}
                        onChange={(e) => setDocCharges(Number(e.target.value))}
                        className="input text-xs py-1.5 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Advance EMIs Upfront</label>
                      <select
                        value={advanceEmis}
                        onChange={(e) => setAdvanceEmis(Number(e.target.value))}
                        className="input text-xs py-1.5 font-semibold"
                      >
                        <option value="0">0 (Standard Arrears)</option>
                        <option value="1">1 Advance EMI</option>
                        <option value="2">2 Advance EMIs</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </fieldset>
        </div>

        {/* Right Column: Key Financial KPI Cards & Summary (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Highlight Card: Monthly EMI & Effective IRR */}
          <div className="card p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calculated Monthly EMI</p>
                <div className="text-3xl md:text-4xl font-extrabold mt-1 tracking-tight text-slate-900 dark:text-white">
                  ₹{calculations.emi.toLocaleString()} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Over {calculations.tenure} equal monthly installments
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Nominal Reducing Rate (IRR):</span>
                  <span className="font-bold text-base text-slate-900 dark:text-white">{calculations.nominalAnnualIrr}% p.a.</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700/60 pb-2">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Equivalent Flat Rate:</span>
                  <span className="font-bold text-base text-amber-600 dark:text-amber-400">{calculations.flatRateEquivalent}% p.a.</span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    Net Effective IRR (XIRR):
                  </span>
                  <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">{calculations.netAnnualIrr}% p.a.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Estimator Widget */}
          <div className="card p-5 border border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-br from-indigo-50/40 to-slate-50/20 dark:from-indigo-950/10 dark:to-slate-900/10">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Payout & Commission split (DSA)
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Estimated Comm. (1.5%)</span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">₹{Math.round(loanAmount * 0.015).toLocaleString()}</p>
              </div>
              <div className="bg-indigo-500/5 dark:bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase">Agent Payout (90%)</span>
                <p className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">₹{Math.round(loanAmount * 0.015 * 0.90).toLocaleString()}</p>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Org Share (10%)</span>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">₹{Math.round(loanAmount * 0.015 * 0.10).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Breakdown KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            <div className="card p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Disbursed Cash Flow</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">₹{calculations.netDisbursed.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">After fee & advance EMI deductions</p>
            </div>

            <div className="card p-4 bg-slate-50/50 dark:bg-slate-800/50">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Interest Payable</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">₹{calculations.totalInterest.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {((calculations.totalInterest / calculations.totalPayable)*100 || 0).toFixed(1)}% of total payout
              </p>
            </div>

            <div className="card p-4 bg-slate-50/50 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Amount Payable</p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">₹{calculations.totalPayable.toLocaleString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Principal + Interest</p>
            </div>
          </div>

          {/* Visual Progress Bar Breakdown */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cash Flow & Payment Structure Breakdown
            </h3>
            
            {(() => {
              const totalAmount = calculations.principal + calculations.totalInterest;
              const principalPcnt = totalAmount > 0 ? (calculations.principal / totalAmount) * 100 : 100;
              const interestPcnt = totalAmount > 0 ? (calculations.totalInterest / totalAmount) * 100 : 0;
              return (
                <div>
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      style={{ width: `${principalPcnt}%` }} 
                      className="bg-primary-600 transition-all duration-500" 
                      title={`Principal: ${principalPcnt.toFixed(1)}%`}
                    />
                    <div 
                      style={{ width: `${interestPcnt}%` }} 
                      className="bg-amber-500 transition-all duration-500" 
                      title={`Interest: ${interestPcnt.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2 font-medium">
                    <div className="flex items-center gap-1.5 text-primary-700 dark:text-primary-400">
                      <span className="w-3 h-3 rounded-full bg-primary-600 inline-block" />
                      <span>Principal: ₹{calculations.principal.toLocaleString()} ({principalPcnt.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                      <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                      <span>Interest: ₹{calculations.totalInterest.toLocaleString()} ({interestPcnt.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Actions Bar */}
          <div className="no-print flex flex-wrap gap-2.5 items-center justify-between card p-4 bg-slate-50/80 dark:bg-slate-800/80">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyQuote}
                className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied Summary!' : 'Copy Quotation Summary'}
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export CSV Schedule
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Quotation
              </button>
            </div>

            {(leadId || onSaveToLeadNotes) && !isReadOnly && (
              <button
                type="button"
                onClick={handleSaveNote}
                className="btn btn-primary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {savedToNote ? <Check className="w-4 h-4" /> : <FilePlus className="w-4 h-4" />}
                {savedToNote ? 'Saved to Lead Notes!' : 'Save Quote to Lead Notes'}
              </button>
            )}
          </div>

        </div>
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
