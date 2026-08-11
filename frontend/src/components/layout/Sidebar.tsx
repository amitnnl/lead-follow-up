import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeStore } from '../../store/themeStore';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut,
  Landmark, UserCircle, ShieldCheck, Sun, Moon, User,
  UsersRound, CheckCircle, Award, PiggyBank, Settings2,
  Receipt, BookOpen
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ isSidebarOpen, setIsMobileMenuOpen }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const { isDark, toggleTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  const logoLetters = settings.app_name ? settings.app_name.substring(0, 2).toUpperCase() : 'LF';

  const isItemActive = (itemTo: string) => {
    if (itemTo === '/') return location.pathname === '/';
    if (itemTo.includes('?')) {
      const [path] = itemTo.split('?');
      if (location.pathname !== path) return false;
      return true;
    } else {
      if (location.pathname !== itemTo) return false;
      return true;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isExecutive = user?.role === 'executive';
  const isChannelAgent = user?.role === 'channel_agent';
  const isAgent = user?.role === 'agent';
  const isRestrictedRole = isExecutive || isChannelAgent || isAgent;
  const isStaff = user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  const navGroups = [
    {
      heading: 'Overview',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    },
    {
      heading: 'Leads',
      items: [
        { to: '/leads', icon: Users, label: 'All Leads' },
        { to: '/leads?status=approved', icon: CheckCircle, label: 'Approved' },
        { to: '/leads?status=disbursed', icon: Award, label: 'Disbursed' }
      ]
    },
    ...(!isRestrictedRole ? [{
      heading: 'Network',
      items: [
        { to: '/financers', icon: Landmark, label: 'Financers' },
        { to: '/executives', icon: UserCircle, label: 'Executives' },
        { to: '/dealers', icon: User, label: 'Dealers' },
        { to: '/channel-executives', icon: UsersRound, label: 'Channels' }
      ]
    }] : []),
    ...(!isRestrictedRole && !isStaff ? [{
      heading: 'Finance',
      items: [
        { to: '/finance/banking', icon: PiggyBank, label: 'Banking' },
        { to: '/finance/settlement', icon: Settings2, label: 'Settlement' },
        { to: '/finance/payout', icon: Receipt, label: 'Payout' },
        { to: '/finance/ledger', icon: BookOpen, label: 'Ledger' },
        { to: '/finance/expenses', icon: Receipt, label: 'Expenses' }
      ]
    }] : []),
    {
      heading: 'System',
      items: [
        ...(!isRestrictedRole ? [{ to: '/reports', icon: FileText, label: 'Reports' }] : []),
        ...(isAdmin ? [{ to: '/users', icon: ShieldCheck, label: 'Users' }] : []),
        ...(isAdmin ? [{ to: '/audit', icon: ShieldCheck, label: 'Audit Trail' }] : []),
        { to: '/settings', icon: Settings, label: 'Settings' }
      ]
    }
  ];

  return (
    <>
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#27272a] shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs shrink-0 rounded-md">
                {logoLetters}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate tracking-tight">
                  {settings.app_name || 'Vehicle Finance'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize truncate">
                    {user?.role_name || user?.role || 'Staff'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-8 h-8 bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs rounded-md">
              {logoLetters}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="py-3 px-3 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            {isSidebarOpen && (
              <div className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 pt-3 pb-1.5">
                {group.heading}
              </div>
            )}
            {group.items.map((item) => {
              const active = isItemActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={!isSidebarOpen ? item.label : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center rounded-md font-medium text-[13px] transition-colors",
                    isSidebarOpen ? "px-2.5 py-1.5 gap-2.5" : "w-8 h-8 justify-center mx-auto",
                    active
                      ? "bg-slate-100 dark:bg-[#27272a] text-slate-900 dark:text-slate-100 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#18181b] hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon className={clsx(
                    "w-4 h-4 shrink-0",
                    active ? "text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"
                  )} />
                  {isSidebarOpen && <span className="truncate tracking-tight">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom User Bar */}
      <div className="p-3 border-t border-slate-200 dark:border-[#27272a] shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between gap-2 rounded-xl p-2 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                  {user?.email || 'Active'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={toggleTheme}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={toggleTheme}
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
