import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function FinanceLayout() {
  const { user } = useAuthStore();
  
  if (user?.role !== 'admin' && user?.role !== 'manager' && user?.role !== 'finance_manager') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-900/30">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-slate-500 dark:text-slate-400">Only Admin and Finance team members can access this module.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0 bg-white/40 dark:bg-slate-900/40 rounded-xl border border-slate-200/50 dark:border-slate-800/50 p-2 sm:p-2.5 md:p-3 overflow-y-auto custom-scrollbar">
        <Outlet />
      </div>
    </div>
  );
}
