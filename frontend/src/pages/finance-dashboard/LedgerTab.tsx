import { useState, useEffect } from 'react';
import { Search, BookOpen, Loader2, Filter, Landmark } from 'lucide-react';
import api from '../../lib/axios';
import clsx from 'clsx';

export default function LedgerTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalBalance, setFinalBalance] = useState(0);

  const fetchLedger = async (leadId?: number) => {
    setLoading(true);
    try {
      const url = leadId ? `/banking.php?action=list&lead_id=${leadId}` : `/banking.php?action=list`;
      const res = await api.get(url);
      setEntries(res.data.entries || []);
      setFinalBalance(res.data.final_balance || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(); // Initial fetch (recent global ledger)
  }, []);

  useEffect(() => {
    if (searchTerm.length < 3) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/finance.php?action=get_leads_for_payout&q=${encodeURIComponent(searchTerm)}`);
        setLeads(res.data.leads || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const selectLead = (lead: any) => {
    setSelectedLead(lead);
    setSearchTerm('');
    setLeads([]);
    fetchLedger(lead.id);
  };

  const clearSelection = () => {
    setSelectedLead(null);
    fetchLedger();
  };

  return (
    <div className="space-y-2.5 max-w-5xl mx-auto">
      {/* Search Header */}
      <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-3 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" /> General Ledger
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Read-only transaction history</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by Lead ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
          />
          {searching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 animate-spin" />}
          
          {leads.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {leads.map(lead => (
                <div 
                  key={lead.id}
                  onClick={() => selectLead(lead)}
                  className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer text-xs"
                >
                  <div className="font-bold text-slate-800 dark:text-white">{lead.customer_name}</div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400">{lead.lead_code}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLead && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-100">Showing ledger for <strong className="font-extrabold">{selectedLead.customer_name}</strong> ({selectedLead.lead_code})</span>
          </div>
          <button onClick={clearSelection} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Clear Filter</button>
        </div>
      )}

      {/* Ledger Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="overflow-auto relative custom-scrollbar max-h-[calc(100vh-270px)] min-h-[400px]">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Date</th>
                {!selectedLead && <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Lead</th>}
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider w-full">Description</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Credit</th>
                <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Debit</th>
                {selectedLead && <th className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">Balance</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={selectedLead ? 5 : 5} className="px-3 py-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-indigo-500" />
                    Loading ledger...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={selectedLead ? 5 : 5} className="px-3 py-8 text-center text-slate-500 italic">No ledger entries found.</td>
                </tr>
              ) : (
                entries.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300 font-mono text-[11px]">{new Date(row.post_date).toLocaleDateString()}</td>
                    {!selectedLead && (
                      <td className="px-2.5 py-1.5 font-semibold text-slate-800 dark:text-white">
                        {row.lead_customer_name || row.customer_name || '—'} <br/> <span className="text-[10px] text-indigo-500 font-mono">{row.lead_code || row.reg_no}</span>
                      </td>
                    )}
                    <td className="px-2.5 py-1.5 text-slate-700 dark:text-slate-200 max-w-xs">
                      <div className="truncate font-medium" title={row.account_description}>{row.account_description || '—'}</div>
                      {row.company_account_name && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Landmark className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          <span>{row.company_account_name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-1.5 font-bold text-emerald-600 dark:text-emerald-400 text-right">
                      {parseFloat(row.credit_amount) > 0 ? `+ ₹${parseFloat(row.credit_amount).toLocaleString()}` : ''}
                    </td>
                    <td className="px-2.5 py-1.5 font-bold text-rose-600 dark:text-rose-400 text-right">
                      {parseFloat(row.debit_amount) > 0 ? `- ₹${parseFloat(row.debit_amount).toLocaleString()}` : ''}
                    </td>
                    {selectedLead && (
                      <td className={clsx("px-2.5 py-1.5 font-black text-right", row.running_balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400')}>
                        ₹{parseFloat(row.running_balance).toLocaleString()}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            {selectedLead && !loading && entries.length > 0 && (
              <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs border-t-2 border-slate-200 dark:border-slate-700 shadow-xs">
                <tr>
                  <td colSpan={4} className="sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 text-xs font-extrabold text-slate-800 dark:text-white text-right uppercase tracking-wider">Final Balance</td>
                  <td className={clsx("sticky bottom-0 bg-slate-100/95 dark:bg-slate-900/95 px-2.5 py-1.5 text-sm font-black text-right", finalBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400')}>
                    ₹{finalBalance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
