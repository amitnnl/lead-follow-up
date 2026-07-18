import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  FileText, 
  Settings, 
  LogOut,
  Bell,
  Landmark,
  UserCircle,
  PiggyBank,
  BookOpen,
  ShieldCheck,
  Sun,
  Moon,
  User,
  UsersRound,
  CheckCircle,
  Award,
  X,
  Calculator,
  Search,
  ChevronDown,
  Plus,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '../../store/themeStore';
import api from '../../lib/axios';
import { useSettingsStore } from '../../store/settingsStore';
import NewLeadModal from '../NewLeadModal';
import IrrCalculatorComponent from '../IrrCalculatorComponent';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const logoLetters = settings.app_name ? settings.app_name.substring(0, 2).toUpperCase() : 'LF';
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen((prev) => !prev);
    } else {
      setIsSidebarOpen((prev) => {
        const next = !prev;
        localStorage.setItem('sidebar_open', String(next));
        return next;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchVal(q);
  }, [location.search]);

  // Notifications & profile states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const interval = setInterval(fetchNotifications, 20000); // Check every 20s
      return () => clearInterval(interval);
    }
  }, [user]);

  const isItemActive = (itemTo: string) => {
    if (itemTo === '/') return location.pathname === '/';
    if (itemTo.includes('?')) {
      const [path, query] = itemTo.split('?');
      if (location.pathname !== path) return false;
      const targetParams = new URLSearchParams(query);
      const currentParams = new URLSearchParams(location.search);
      let match = true;
      targetParams.forEach((val, key) => {
        if (currentParams.get(key) !== val) {
          match = false;
        }
      });
      return match;
    } else {
      if (location.pathname !== itemTo) return false;
      const status = new URLSearchParams(location.search).get('status');
      if (itemTo === '/leads' && (status === 'approved' || status === 'disbursed')) {
        return false;
      }
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
        { to: '/dealers', icon: User, label: 'Dealer\'s' },
        { to: '/channel-executives', icon: UsersRound, label: 'Channels' }
      ]
    }] : []),
    ...(!isRestrictedRole && !isStaff ? [{
      heading: 'Finance',
      items: [
        { to: '/banking', icon: PiggyBank, label: 'Banking' },
        { to: '/ledger', icon: BookOpen, label: 'Ledger' },
        { to: '/commissions', icon: Briefcase, label: 'Payouts' }
      ]
    }] : (isChannelAgent || isAgent ? [{
      heading: 'Finance & Earnings',
      items: [
        { to: '/commissions', icon: Briefcase, label: 'My Payouts' }
      ]
    }] : [])),
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

  // Helper for top context breadcrumb title
  const getPageTitle = () => {
    const path = location.pathname;
    const status = new URLSearchParams(location.search).get('status');
    if (path === '/dashboard') return { group: 'Overview', title: 'Dashboard' };

    if (path === '/leads') {
      if (status === 'approved') return { group: 'Leads', title: 'Approved Leads' };
      if (status === 'disbursed') return { group: 'Leads', title: 'Disbursed Leads' };
      return { group: 'Leads', title: 'All Leads' };
    }
    if (path.startsWith('/leads/')) return { group: 'Leads', title: 'Lead Dossier & Details' };
    if (path === '/financers') return { group: 'Network', title: 'Financers & Bank Roster' };
    if (path === '/executives') return { group: 'Network', title: 'Field Executives' };
    if (path === '/dealers') return { group: 'Network', title: 'Dealer\'s' };
    if (path === '/channel-executives') return { group: 'Network', title: 'Channel Partners' };
    if (path === '/banking') return { group: 'Finance', title: 'Banking & Cash Flow' };
    if (path === '/ledger') return { group: 'Finance', title: 'Master General Ledger' };
    if (path === '/commissions') return { group: 'Finance', title: 'Commission Payouts' };
    if (path === '/reports') return { group: 'System', title: 'Analytics & Reports' };
    if (path === '/users') return { group: 'System', title: 'Team & User Management' };
    if (path === '/audit') return { group: 'System', title: 'Immutable Audit Trail' };
    if (path === '/settings') return { group: 'System', title: 'System Settings' };
    return { group: 'Application', title: 'Overview' };
  };

  const pageMeta = getPageTitle();

  const sidebarContent = (
    <>
      {/* ── Workspace Header ── */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 shrink-0">
        {isSidebarOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-primary-500/25 shrink-0">
                {logoLetters}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-xs text-slate-900 dark:text-white truncate tracking-tight">
                  {settings.app_name || 'Vehicle Finance Hub'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 capitalize truncate">
                    {user?.role_name || user?.role || 'Staff'}
                  </span>
                </div>
              </div>
            </div>
            <span className="font-mono text-[9px] bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 px-1.5 py-0.5 rounded-md font-extrabold shrink-0">
              PRO
            </span>
          </div>
        ) : (
          <div className="flex justify-center py-0.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-primary-500/25 cursor-pointer transform hover:scale-105 transition-all" title="Workspace: PRO">
              {logoLetters}
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation Links ── */}
      <div className="py-3 px-2.5 space-y-5 flex-1 overflow-y-auto">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            {isSidebarOpen ? (
              <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 pt-1 pb-1 flex items-center justify-between">
                <span>{group.heading}</span>
              </div>
            ) : (
              idx > 0 && <hr className="my-2 border-slate-200/80 dark:border-slate-800 mx-2 opacity-60" />
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
                    "transition-all duration-200 ease-in-out relative group cursor-pointer flex items-center rounded-xl font-medium text-xs",
                    isSidebarOpen ? "px-3 py-2.5 gap-3" : "w-10 h-10 justify-center mx-auto",
                    active 
                      ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/25 font-bold hover-lift" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <item.icon className={clsx(
                    "w-[18px] h-[18px] shrink-0 transition-transform duration-150",
                    active ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                  )} />
                  {isSidebarOpen && <span className="truncate tracking-tight">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Bottom User Profile Bar ── */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[var(--color-surface-dark)] shrink-0">
        {isSidebarOpen ? (
          <div className="glass-panel flex items-center justify-between gap-2 rounded-xl p-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                  {user?.name || 'User'}
                </div>
                <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate">
                  {user?.email || user?.mobile || 'Active'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={toggleTheme}
                title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
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

  return (
    <div className="min-h-screen flex p-2 md:p-4 gap-2 md:gap-4 text-slate-800 dark:text-slate-200 font-sans">
      
      {/* ── Desktop & Mobile Full-Height Sidebar Dock ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside 
        className={clsx(
          "glass-panel flex flex-col select-none shrink-0 transition-all duration-300 ease-in-out z-50 overflow-x-hidden rounded-[2rem]",
          // Desktop behavior (>= 768px)
          "md:sticky md:top-4 md:h-[calc(100vh-2rem)]",
          isSidebarOpen ? "md:w-[280px]" : "md:w-20",
          // Mobile behavior (< 768px)
          "max-md:fixed max-md:inset-y-2 max-md:left-2 max-md:h-[calc(100vh-1rem)] max-md:w-[280px] max-md:shadow-2xl max-md:transition-transform max-md:duration-300",
          isMobileMenuOpen ? "max-md:translate-x-0" : "max-md:-translate-x-[110%]"
        )}
      >
        {isMobileMenuOpen && (
          <div className="md:hidden flex justify-end p-2 border-b border-slate-100 dark:border-slate-800">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
        {sidebarContent}
      </aside>

      {/* ── Main App Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-2rem)] md:h-[calc(100vh-2rem)] relative">
        
        {/* ── Frosted Glass Top Context Bar ── */}
        <header className="glass-header h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30 select-none rounded-[2rem] mb-4">
          
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle button */}
            <button 
              onClick={handleToggleSidebar}
              className="p-2.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shrink-0 shadow-2xs"
              title={isSidebarOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
            >
              {(isMobileMenuOpen || isSidebarOpen) ? <PanelLeftClose className="w-4.5 h-4.5" /> : <PanelLeftOpen className="w-4.5 h-4.5" />}
            </button>

            {/* Breadcrumb / Page Title */}
            <div className="flex items-center gap-2 text-xs font-medium truncate">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">{pageMeta.group}</span>
              <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">/</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight truncate">{pageMeta.title}</span>
            </div>
          </div>

          {/* Center Search Bar */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/leads?q=${encodeURIComponent(searchVal)}`);
            }}
            className="hidden md:flex items-center max-w-md w-full mx-6 relative group"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-primary-500 transition-colors" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search leads, customers, vehicle models..."
              className="w-full pl-10 pr-14 py-1.5 text-xs bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-[#0A0D14] focus:text-slate-900 dark:focus:text-slate-100 focus:outline-none rounded-xl border border-transparent focus:border-primary-500 placeholder-slate-400 text-slate-800 dark:text-slate-200 transition-all shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchVal ? (
                <button 
                  type="button"
                  onClick={() => {
                    setSearchVal('');
                    navigate('/leads');
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[10px] font-mono font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shadow-2xs">
                  ⌘K
                </span>
              )}
            </div>
          </form>

          {/* Right Utilities & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            
            {/* + New Lead Action Center CTA */}
            <button
              onClick={() => setIsNewLeadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-primary-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">New Lead</span>
            </button>

            <button
              onClick={() => setIsCalculatorModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title="Open IRR Calculator"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Calc</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextState = !showNotifications;
                  setShowNotifications(nextState);
                  if (nextState) {
                    setShowProfileMenu(false);
                    handleMarkRead();
                  }
                }}
                className="relative p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center ring-2 ring-white dark:ring-[#111622] animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-700 dark:text-slate-200 animate-fade-in">
                    <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => handleMarkRead()}
                          className="text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 italic">No new notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3.5 text-xs leading-relaxed hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${!n.is_read ? 'bg-primary-500/5 font-semibold' : ''} text-left`}
                          >
                            <p className="text-slate-800 dark:text-slate-200">{n.message}</p>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block mt-1">{new Date(n.created_at).toLocaleString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile Dropdown Trigger */}
            <div className="relative">
              <div
                onClick={() => {
                  const nextState = !showProfileMenu;
                  setShowProfileMenu(nextState);
                  if (nextState) setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                title="Account menu"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <ChevronDown className={clsx("w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden sm:block", showProfileMenu && "rotate-180")} />
              </div>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden text-slate-700 dark:text-slate-200 animate-fade-in">
                    <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || 'Admin'}</div>
                      <div className="text-[10px] text-primary-600 dark:text-primary-400 font-extrabold capitalize mt-0.5">{user?.role?.replace('_', ' ') || 'User'}</div>
                      {user?.mobile && <div className="text-[10px] text-slate-400 font-mono mt-1 truncate">{user?.mobile}</div>}
                    </div>

                    <div className="py-1">
                      <Link
                        to="/settings"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800" />

                    <div className="p-1.5">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left cursor-pointer group"
                      >
                        <LogOut className="w-4 h-4 text-rose-500 group-hover:-translate-x-0.5 transition-transform" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ── Main Scrollable Outlet ── */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative rounded-[2rem] glass-panel p-4 md:p-6 custom-scrollbar shadow-xl border border-white/20 dark:border-white/5 bg-white/50 dark:bg-slate-900/50">
          <Outlet />
        </main>
        
        {isNewLeadModalOpen && (
          <NewLeadModal
            isOpen={isNewLeadModalOpen}
            onClose={() => setIsNewLeadModalOpen(false)}
            onSuccess={(newId) => {
              setIsNewLeadModalOpen(false);
              navigate(`/leads/${newId}`);
            }}
          />
        )}

        {/* Floating IRR Calculator Modal */}
        {isCalculatorModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] relative border border-slate-200 dark:border-slate-800 animate-scale-in">
              <button 
                onClick={() => setIsCalculatorModalOpen(false)}
                className="absolute right-4 top-4 z-10 p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="p-2 sm:p-6">
                <IrrCalculatorComponent />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
