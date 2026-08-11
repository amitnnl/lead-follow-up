import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import {
  PanelLeftClose, PanelLeftOpen, Search, X, Calculator,
  Sun, Moon, Bell, ChevronDown, Settings, LogOut
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/axios';

interface HeaderProps {
  isSidebarOpen: boolean;
  handleToggleSidebar: () => void;
  pageMeta: { group: string; title: string };
  searchVal: string;
  setSearchVal: (v: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onOpenCalculator: () => void;
}

export default function Header({
  isSidebarOpen,
  handleToggleSidebar,
  pageMeta,
  searchVal,
  setSearchVal,
  onSearchSubmit,
  onOpenCalculator
}: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications.php?action=fetch');
      if (response.data?.success) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const handleMarkRead = async (id?: number) => {
    try {
      const params = new URLSearchParams();
      params.append('action', 'mark_read');
      if (id) params.append('id', id.toString());
      await api.post('/notifications.php', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      fetchNotifications();
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 shrink-0 bg-[#fcfcfc] dark:bg-[#09090b] border-b border-slate-200 dark:border-[#27272a] md:px-5 print:hidden z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleToggleSidebar}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
          title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 text-[11px] font-semibold truncate tracking-tight">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">{pageMeta.group}</span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="text-slate-900 dark:text-slate-100 truncate">{pageMeta.title}</span>
        </div>
      </div>

      {/* Center Search */}
      <form
        onSubmit={onSearchSubmit}
        className="hidden md:flex items-center max-w-sm w-full mx-4 relative"
      >
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-12 py-1 text-xs bg-transparent focus:outline-none rounded-md border border-slate-200 dark:border-[#27272a] focus:border-slate-400 dark:focus:border-slate-600 placeholder:text-slate-400 text-slate-700 dark:text-slate-200 transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {searchVal ? (
            <button
              type="button"
              onClick={() => { setSearchVal(''); navigate('/leads'); }}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          )}
        </div>
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenCalculator}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          title="IRR Calculator"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Calc</span>
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Dark / Light Theme Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              const next = !showNotifications;
              setShowNotifications(next);
              if (next) { setShowProfileMenu(false); handleMarkRead(); }
            }}
            className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white dark:ring-[#111622]">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={() => handleMarkRead()} className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold hover:underline cursor-pointer">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {notifications.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400 italic">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!n.is_read ? 'bg-primary-500/5 font-semibold' : ''}`}
                      >
                        <p className="text-slate-700 dark:text-slate-200">{n.message}</p>
                        <span className="text-[10px] text-slate-400 block mt-1">{new Date(n.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <div
            onClick={() => {
              const next = !showProfileMenu;
              setShowProfileMenu(next);
              if (next) setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary-500 to-violet-600 text-white flex items-center justify-center font-bold text-[10px]">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <ChevronDown className={clsx("w-3 h-3 text-slate-400 transition-transform hidden sm:block", showProfileMenu && "rotate-180")} />
          </div>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Admin'}</div>
                  <div className="text-[10px] text-primary-600 dark:text-primary-400 font-bold capitalize">{user?.role?.replace('_', ' ')}</div>
                </div>
                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Settings
                  </Link>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
                  <button
                    onClick={() => { setShowProfileMenu(false); handleLogout(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
