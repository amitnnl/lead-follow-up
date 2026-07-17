import { useState } from 'react';
import { 
  Wallet, DollarSign, ShieldCheck, 
  Clock, CheckCircle, Award, Eye, EyeOff, RefreshCw
} from 'lucide-react';

export default function FintechWalletDemo() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'all' | 'unlocked' | 'pipeline'>('all');

  const ledgerItems = [
    { id: 1, type: 'unlocked', title: 'Disbursed #LF-9402 (Tata Safari)', customer: 'Rakesh Sharma', loanAmt: 1450000, commission: 14500, split90: 13050, org10: 1450, date: '10 mins ago', status: 'Available in Wallet' },
    { id: 2, type: 'pipeline', title: 'Sanction Approved #LF-8812 (Mahindra Thar)', customer: 'Anjali Verma', loanAmt: 1800000, commission: 18000, split90: 16200, org10: 1800, date: '2 hours ago', status: 'Locked in Pipeline' },
    { id: 3, type: 'unlocked', title: 'Disbursed #LF-7703 (Hyundai Creta)', customer: 'Vikram Singh', loanAmt: 1200000, commission: 12000, split90: 10800, org10: 1200, date: 'Yesterday', status: 'Available in Wallet' },
    { id: 4, type: 'pipeline', title: 'Pending Bank KYC #LF-9921 (Toyota Fortuner)', customer: 'Suresh Patel', loanAmt: 3500000, commission: 35000, split90: 31500, org10: 3500, date: 'Oct 14', status: 'Locked in Pipeline' }
  ];

  const filteredLedger = activeLedgerTab === 'all' 
    ? ledgerItems 
    : ledgerItems.filter(i => i.type === activeLedgerTab);

  return (
    <div className="space-y-3 select-none">
      {/* Demo Widget Toggle Banner */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-xl border border-indigo-500/30 text-white shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Wallet className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">UI/UX Concept Demo #2:</span>
              <span className="text-xs font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/20">DSA Fintech Wallet Portal</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Live Revolut-style wallet simulation illustrating automated 90/10 commission splits and real-time pipeline earnings.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer shrink-0"
        >
          {isOpen ? <EyeOff className="w-3.5 h-3.5 text-indigo-300" /> : <Eye className="w-3.5 h-3.5 text-indigo-300" />}
          {isOpen ? 'Minimize Wallet Demo' : 'Inspect Wallet UI'}
        </button>
      </div>

      {isOpen && (
        <div className="card overflow-hidden border border-indigo-500/30 shadow-xl animate-in fade-in slide-in-from-top-2">
          {/* Top Wallet Balance Gradient Card */}
          <div className="bg-gradient-to-br from-slate-900 via-[#162238] to-slate-950 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>
            <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mb-20"></div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
              
              {/* Left: Main Balance */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Agent / DSA Earned Balance (90% Split)</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-extrabold tracking-tight font-mono text-white">₹1,45,200</span>
                  <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Disbursed & Unlocked
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Calculated automatically from all closed/disbursed loan applications on the backend.
                </p>
              </div>

              {/* Right: Pipeline Potential & Org Cut */}
              <div className="grid grid-cols-2 gap-4 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 min-w-[180px] backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" /> Pipeline Potential
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">₹62,500</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Unlocks upon loan disbursal</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 min-w-[160px] backdrop-blur-sm">
                  <div className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                    <Award className="w-3 h-3 text-indigo-400" /> Org Retained (10%)
                  </div>
                  <div className="text-xl font-bold font-mono text-indigo-300 mt-1">₹16,133</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Organization overhead cut</div>
                </div>
              </div>
            </div>

            {/* Quick Action Strip inside Wallet */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Ledger View:</span>
                {(['all', 'unlocked', 'pipeline'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveLedgerTab(tab)}
                    className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                      activeLedgerTab === tab 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {tab === 'all' ? 'All Transactions' : tab === 'unlocked' ? '✓ Unlocked Balance' : '⌛ Locked Pipeline'}
                  </button>
                ))}
              </div>
              <div className="text-emerald-400 font-medium flex items-center gap-1 text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                <RefreshCw className="w-3 h-3 animate-spin" /> Live Commission Sync Engine Active
              </div>
            </div>
          </div>

          {/* Bottom Ledger Ticker */}
          <div className="bg-slate-50 dark:bg-slate-900/90 p-4 divide-y divide-slate-200/60 dark:divide-slate-800/80">
            {filteredLedger.map(item => (
              <div key={item.id} className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 font-bold flex items-center justify-center ${
                    item.type === 'unlocked' 
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300/50' 
                      : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/50'
                  }`}>
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>{item.title}</span>
                      <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">({item.customer})</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 flex items-center gap-3 font-mono">
                      <span>Loan: ₹{item.loanAmt.toLocaleString()}</span>
                      <span>• Total Comm: ₹{item.commission.toLocaleString()}</span>
                      <span>• {item.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 font-mono">
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+₹{item.split90.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400">Agent 90% Split</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.type === 'unlocked' 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-400/30' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-400/30'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
