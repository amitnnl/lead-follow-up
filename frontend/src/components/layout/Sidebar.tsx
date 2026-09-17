import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeStore } from '../../store/themeStore';
import api from '../../lib/axios';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, FileText, Settings, LogOut,
  Landmark, UserCircle, ShieldCheck, Sun, Moon, User,
  UsersRound, CheckCircle, Award, PiggyBank, Settings2,
  Receipt, BookOpen, Scale, ChevronDown, Plus
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

  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({
    '/finance/banking': true
  });

  const toggleSubmenu = (to: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [to]: prev[to] !== undefined ? !prev[to] : false
    }));
  };

  const logoLetters = settings.app_name ? settings.app_name.substring(0, 2).toUpperCase() : 'LF';

  const isItemActive = (itemTo: string) => {
    if (itemTo === '/') return location.pathname === '/';
    if (itemTo.includes('?')) {
      const [path, query] = itemTo.split('?');
      if (location.pathname !== path) return false;
      return location.search.includes(query);
    } else {
      if (location.pathname !== itemTo) return false;
      if (location.search && location.search.includes('action=')) return false;
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
        { 
          to: '/finance/banking', 
          icon: PiggyBank, 
          label: 'Banking',
          children: [
            { to: '/finance/banking', label: 'Statements & Ledger', icon: BookOpen },
            { to: '/finance/banking?action=add_account', label: '+ Add Bank Account', icon: Plus }
          ]
        },
        { to: '/finance/pnl', icon: Scale, label: 'Expenses' },
        { to: '/finance/settlement', icon: Settings2, label: 'Settlement' },
        { to: '/finance/payout', icon: Receipt, label: 'Payout' },
        { to: '/finance/ledger', icon: BookOpen, label: 'Ledger' }
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
      <div className="p-3 border-b border-[#1d1b38] dark:border-[#1c1a30] shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-none overflow-hidden relative shadow-sm border border-[#1d1b38] dark:border-[#1c1a30] bg-[#1a1836] dark:bg-[#0e0c1f]">
                <img 
                  src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/AppLogo.png?v=${settings.logo_updated_at || '1'}`} 
                  alt="Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => { 
                    e.currentTarget.style.display = 'none'; 
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                <span className="hidden w-full h-full bg-[#673DE6] text-white font-bold text-xs">
                  {logoLetters}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-slate-200 truncate tracking-tight">
                  {settings.app_name || 'Vehicle Finance'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-slate-400 capitalize truncate">
                    {user?.role_name || user?.role || 'Staff'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-0.5">
            <div className="w-9 h-9 flex items-center justify-center rounded-none overflow-hidden relative shadow-sm border border-[#1d1b38] dark:border-[#1c1a30] bg-[#1a1836] dark:bg-[#0e0c1f]">
              <img 
                src={`${api.defaults.baseURL?.replace('/api', '')}/uploads/AppLogo.png?v=${settings.logo_updated_at || '1'}`} 
                alt="Logo" 
                className="w-full h-full object-contain"
                onError={(e) => { 
                  e.currentTarget.style.display = 'none'; 
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <span className="hidden w-full h-full bg-[#673DE6] text-white font-bold text-xs">
                {logoLetters}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="py-1 px-2 space-y-0.5 flex-1 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-0.5">
            {isSidebarOpen && (
              <div className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1.5 pt-1.5 pb-0.5">
                {group.heading}
              </div>
            )}
            {group.items.map((item: any) => {
              const hasChildren = item.children && item.children.length > 0;
              const isChildActive = hasChildren && item.children.some((c: any) => isItemActive(c.to));
              const active = isItemActive(item.to) || isChildActive;
              const isSubmenuOpen = openSubmenus[item.to] ?? (location.pathname.startsWith(item.to));

              if (hasChildren && isSidebarOpen) {
                return (
                  <div key={item.to} className="space-y-0.5">
                    <div
                      onClick={() => toggleSubmenu(item.to)}
                      className={clsx(
                        "flex items-center justify-between rounded-md font-medium text-[12px] transition-all duration-150 relative cursor-pointer px-2 py-1 gap-2",
                        active
                          ? "bg-[#673DE6]/15 text-white font-bold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#673DE6] before:rounded-r-md"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <item.icon className={clsx(
                          "w-3.5 h-3.5 shrink-0 transition-colors",
                          active ? "text-[#8c67ff] dark:text-[#a78bfa]" : "text-slate-400"
                        )} />
                        <span className="truncate tracking-tight">{item.label}</span>
                      </div>
                      <ChevronDown className={clsx(
                        "w-3 h-3 text-slate-400 transition-transform duration-200 shrink-0",
                        isSubmenuOpen ? "rotate-180 text-white" : ""
                      )} />
                    </div>

                    {isSubmenuOpen && (
                      <div className="pl-3.5 ml-2.5 border-l border-[#673DE6]/30 space-y-0.5 my-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                        {item.children.map((child: any) => {
                          const childActive = isItemActive(child.to);
                          return (
                            <Link
                              key={child.to}
                              to={child.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={clsx(
                                "flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-medium transition-all duration-150",
                                childActive
                                  ? "text-[#a78bfa] font-bold bg-[#673DE6]/10"
                                  : "text-slate-400 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {child.icon && <child.icon className="w-3 h-3 shrink-0 text-[#8c67ff]/80" />}
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={!isSidebarOpen ? item.label : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={clsx(
                    "flex items-center rounded-md font-medium text-[12px] transition-all duration-150 relative",
                    isSidebarOpen ? "px-2 py-1 gap-2" : "w-7 h-7 justify-center mx-auto",
                    active
                      ? "bg-[#673DE6]/15 text-white font-bold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#673DE6] before:rounded-r-md"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className={clsx(
                    "w-3.5 h-3.5 shrink-0 transition-colors",
                    active ? "text-[#8c67ff] dark:text-[#a78bfa]" : "text-slate-400"
                  )} />
                  {isSidebarOpen && <span className="truncate tracking-tight">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom User Bar */}
      <div className="p-1.5 border-t border-[#1d1b38] dark:border-[#1c1a30] shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between gap-1.5 rounded-lg p-1 bg-[#1a1836] dark:bg-[#121028]/60">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-md bg-[#673DE6] flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-200 truncate leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-[9px] font-medium text-slate-400 truncate">
                  {user?.email || 'Active'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                onClick={toggleTheme}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-[#111026] dark:hover:bg-[#0e0c1f] transition-all cursor-pointer"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-[#111026] dark:hover:bg-[#0e0c1f] transition-all cursor-pointer"
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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-[#111026] dark:hover:bg-[#0e0c1f] transition-all cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-[#111026] dark:hover:bg-[#0e0c1f] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
