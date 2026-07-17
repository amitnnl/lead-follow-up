import { useEffect, useState } from 'react';
import { PhoneCall, Calendar, ChevronRight, MessageSquareDashed } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import clsx from 'clsx';

interface FollowupRecord {
  lead_real_id: number;
  lead_id: string;
  customer_name: string;
  followup_status?: string;
  lead_status?: string;
  followup_date?: string;
  next_followup_date?: string;
  remarks?: string;
}

const STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500', pending: 'bg-amber-500', approved: 'bg-emerald-500',
  disbursed: 'bg-teal-500', on_hold: 'bg-purple-500', rejected: 'bg-rose-500',
};
const STATUS_LABEL: Record<string, string> = {
  new: 'New', pending: 'Pending', approved: 'Approved',
  disbursed: 'Disbursed', on_hold: 'On Hold', rejected: 'Rejected',
};

export default function Followups() {
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFollowups = async () => {
      setLoading(true);
      try {
        const response = await api.get('/followups');
        setFollowups(response.data.followups || []);
      } catch (error) {
        console.error('Failed to fetch followups', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFollowups();
  }, []);

  return (
    <div className="space-y-4 select-none animate-fade-in">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
          <PhoneCall className="text-indigo-500 w-5 h-5"/> Follow-up Status Register
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Overview of the last recorded follow-up remarks and next action dates across all active leads.
        </p>
      </div>

      {/* ── Table Container ── */}
      <div className="card overflow-hidden">
        {/* Accent top line */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-400 to-teal-400" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                <th className="px-4 py-3">Follow-up Date</th>
                <th className="px-4 py-3">Lead ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="relative w-8 h-8 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-500/20" />
                      <div className="absolute inset-0 rounded-full border-2 border-t-indigo-600 animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2.5">
                    <MessageSquareDashed className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                    <span className="italic">No follow-ups recorded yet.</span>
                  </td>
                </tr>
              ) : (
                followups.map((f, i) => {
                  const status = f.followup_status || f.lead_status || 'pending';
                  const dot = STATUS_DOT[status] || 'bg-slate-400';
                  const label = STATUS_LABEL[status] || status;
                  const sbClass = `sb-${status}`;

                  return (
                    <tr 
                      key={f.lead_real_id || i} 
                      className={clsx(
                        'hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors',
                        i % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : ''
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                          {f.followup_date || f.next_followup_date || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-650 dark:text-indigo-400">
                        {f.lead_id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-white text-[13px]">
                        {f.customer_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border capitalize', sbClass || 'sb-default')}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate italic">
                        "{f.remarks || '—'}"
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => navigate(`/leads/${f.lead_real_id}`)} 
                          className="inline-flex items-center gap-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Open File <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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
