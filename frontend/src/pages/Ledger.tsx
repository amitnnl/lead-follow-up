import { useEffect, useState } from 'react';
import api from '../lib/axios';
import { BookOpen, Download, FilterX, Landmark, BadgePercent, ShieldAlert, Award } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

export default function Ledger() {
  const { user } = useAuthStore();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager' || user?.role === 'finance_manager';
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [agentId, setAgentId] = useState('');
  const [financerId, setFinancerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdowns
  const [agents, setAgents] = useState<any[]>([]);
  const [financers, setFinancers] = useState<any[]>([]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [aRes, fRes] = await Promise.all([
          api.get('/setup/agents'),
          api.get('/setup/financers')
        ]);
        setAgents(aRes.data.agents || []);
        setFinancers(fRes.data.financers || []);
      } catch (err) {
        console.error("Failed to load dropdowns.");
      }
    };
    fetchDropdowns();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (agentId) params.append('agent_id', agentId);
      if (financerId) params.append('financer_id', financerId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      // General Ledger should only display disbursed leads
      params.append('status', 'disbursed');
      
      const res = await api.get(`/reports?${params.toString()}`);
      setRecords(res.data.records || []);
    } catch (err) {
      console.error("Failed to fetch ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [agentId, financerId, startDate, endDate]);

  const totalLoanAmount = records.reduce((sum, r) => sum + (parseFloat(r.loan_amount) || 0), 0);
  const totalCommission = records.reduce((sum, r) => sum + (parseFloat(r.commission_amount) || 0), 0);
  const totalPaid = records.reduce((sum, r) => sum + (parseFloat(r.paid_amount) || 0), 0);
  const totalBalance = totalCommission - totalPaid;

  const handleClearFilters = () => {
    setAgentId('');
    setFinancerId('');
    setStartDate('');
    setEndDate('');
  };

  const exportToCSV = () => {
    if (records.length === 0) return;
    const headers = ["Date", "Lead ID", "Customer Name", "Financer", "Agent (DSA)", "Loan Amount", "Commission Amount", "Paid Amount", "Outstanding Balance"];
    const rows = records.map(r => {
      const comm = parseFloat(r.commission_amount) || 0;
      const paid = parseFloat(r.paid_amount) || 0;
      const bal = comm - paid;
      return [
        r.lead_date,
        r.lead_id,
        `"${(r.customer_name || '').replace(/"/g, '""')}"`,
        `"${(r.financer_name || '—').replace(/"/g, '""')}"`,
        `"${(r.agent_name || 'Direct').replace(/"/g, '""')}"`,
        r.loan_amount || 0,
        comm,
        paid,
        bal
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `General_Ledger_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inputClass = "w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white transition-all";

  return (
    <div className="space-y-4 animate-fade-in select-none">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <BookOpen className="text-indigo-500 w-5 h-5" /> General Ledger
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Agent and Financer account statements, commission payouts, and outstanding balances.
          </p>
        </div>
        {isAdminOrManager && records.length > 0 && (
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Ledger
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Filter by Agent (DSA)</label>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} className={inputClass}>
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Filter by Financer</label>
          <select value={financerId} onChange={e => setFinancerId(e.target.value)} className={inputClass}>
            <option value="">All Financers</option>
            {financers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
        </div>
        {(agentId || financerId || startDate || endDate) && (
          <button 
            onClick={handleClearFilters} 
            className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer border border-rose-200 dark:border-rose-500/20" 
            title="Clear Filters"
          >
            <FilterX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <Landmark className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Loan Book</div>
            <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
              ₹{totalLoanAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <BadgePercent className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Commission</div>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
              ₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Out</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 border-l-4 border-l-rose-500">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Outstanding</div>
            <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{totalBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Table ── */}
      <div className="card overflow-hidden">
        {/* Accent top line */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-400 to-teal-400" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lead / Customer</th>
                <th className="px-4 py-3">Financer Bank</th>
                <th className="px-4 py-3">Agent (DSA)</th>
                <th className="px-4 py-3 text-right">Loan Amount</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="relative w-8 h-8 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs italic">
                    No ledger records match the selected parameters.
                  </td>
                </tr>
              ) : (
                records.map((r, i) => {
                  const comm = parseFloat(r.commission_amount) || 0;
                  const paid = parseFloat(r.paid_amount) || 0;
                  const bal = comm - paid;
                  
                  return (
                    <tr 
                      key={r.id} 
                      className={clsx(
                        'hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors',
                        i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : ''
                      )}
                    >
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {new Date(r.lead_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-white text-[13px]">{r.customer_name}</div>
                        <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">{r.lead_id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-medium">{r.financer_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-medium">{r.agent_name || 'Direct'}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 dark:text-slate-300 text-xs font-semibold">
                        ₹{Number(r.loan_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600 dark:text-blue-400 text-xs font-semibold">
                        ₹{comm.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        ₹{paid.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                        ₹{bal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
