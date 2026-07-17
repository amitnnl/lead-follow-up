import { useEffect, useState } from 'react';
import { Activity, Search, ShieldCheck, ShieldAlert, Monitor, Filter, Calendar, Info } from 'lucide-react';
import api from '../lib/axios';
import clsx from 'clsx';

interface AuditLog {
  log_type: string;
  ref_id: number;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
  ip_address: string | null;
}

export default function SystemAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await api.get('/audit');
      setLogs(response.data.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (log.user_name || '').toLowerCase().includes(term) ||
      (log.action || '').toLowerCase().includes(term) ||
      (log.details || '').toLowerCase().includes(term);
      
    const matchesType = filterType === 'All' || log.log_type === filterType;
    return matchesSearch && matchesType;
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'Lead Action': 
        return (
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        );
      case 'System Action': 
        return (
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Monitor className="w-4 h-4" />
          </div>
        );
      case 'Failed Login': 
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      default: 
        return (
          <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 dark:border-indigo-500/20" />
          <div className="absolute inset-0 rounded-full border-[3px] border-t-indigo-600 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in select-none">
      
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
          <ShieldCheck className="text-indigo-600 w-6 h-6" /> Immutable Audit Trail
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Immutable cryptographic log registry of all lead actions, system alterations, and security events.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search logs by operator user name, actions, or details..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-xs text-slate-800 dark:text-white transition-all focus:ring-2 focus:ring-indigo-500/10"
          />
        </div>
        <div className="w-full sm:w-56 relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-indigo-500 text-xs text-slate-800 dark:text-white appearance-none cursor-pointer transition-all"
          >
            <option value="All">All Audit Event Logs</option>
            <option value="Lead Action">Lead Interaction Logs</option>
            <option value="System Action">System Event Logs</option>
            <option value="Failed Login">Failed Login Security Logs</option>
          </select>
        </div>
      </div>

      {/* ── Data Grid/Table ── */}
      <div className="card overflow-hidden">
        {/* Accent top line */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                <th className="px-6 py-4">Event Group</th>
                <th className="px-6 py-4">Operator User / IP</th>
                <th className="px-6 py-4">Security Action</th>
                <th className="px-6 py-4">Logged Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-slate-400 text-xs">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
                    No cryptographic logs match the selected parameters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr 
                    key={idx} 
                    className={clsx(
                      'hover:bg-indigo-50/20 dark:hover:bg-indigo-500/5 transition-colors',
                      idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/5' : ''
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getLogIcon(log.log_type)}
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-[13px]">{log.log_type}</div>
                          {log.ref_id > 0 && (
                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                              FILE ID: {log.ref_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-850 dark:text-slate-200 text-xs">
                        {log.user_name || 'System / Anonymous'}
                      </div>
                      {log.ip_address && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Info className="w-3 h-3 text-slate-300" /> IP: {log.ip_address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-bold text-slate-800 dark:text-white text-xs truncate">
                        {log.action}
                      </div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-450 text-xs">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-650 shrink-0" />
                        {new Date(log.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
