import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Modal from '../ui/Modal';
import CommandPalette from '../CommandPalette';
import NewLeadModal from '../NewLeadModal';
import IrrCalculatorComponent from '../IrrCalculatorComponent';
import Sidebar from './Sidebar';
import Header from './Header';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleToggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewLeadModalOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsCalculatorModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('q') || '';
    setSearchVal(q);
  }, [location.search]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/leads?q=${encodeURIComponent(searchVal)}`);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return { group: 'Overview', title: 'Dashboard' };
    if (path.startsWith('/leads')) return { group: 'Leads', title: 'Lead Management' };
    if (path === '/follow-ups') return { group: 'CRM', title: 'Follow-ups' };
    if (path.startsWith('/finance/')) return { group: 'Finance', title: 'Finance' };
    if (path === '/financers') return { group: 'Network', title: 'Financers' };
    if (path === '/executives') return { group: 'Network', title: 'Executives' };
    if (path === '/dealers') return { group: 'Network', title: 'Dealers' };
    if (path === '/channel-executives') return { group: 'Network', title: 'Channel Partners' };
    if (path === '/reports') return { group: 'System', title: 'Reports' };
    if (path === '/users') return { group: 'System', title: 'Users' };
    if (path === '/audit') return { group: 'System', title: 'Audit Trail' };
    if (path === '/settings') return { group: 'System', title: 'Settings' };
    return { group: 'Application', title: 'Overview' };
  };

  const pageMeta = getPageTitle();

  return (
    <div className="min-h-screen flex text-slate-800 dark:text-slate-200 font-sans bg-[#f5f6f8] dark:bg-[#0c0c14]">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "flex flex-col bg-[#111026] dark:bg-[#0e0c1f] border-r border-[#1d1b38] dark:border-[#1c1a30] text-slate-300 select-none shrink-0 transition-all z-50 overflow-hidden",
          "md:sticky md:top-0 md:h-screen",
          isSidebarOpen ? "md:w-[260px]" : "md:w-16",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:h-screen max-md:w-[270px] max-md:shadow-2xl max-md:transition-transform max-md:duration-300",
          isMobileMenuOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        {isMobileMenuOpen && (
          <div className="md:hidden flex justify-end p-2 border-b border-slate-200 dark:border-[#27272a]">
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <Sidebar isSidebarOpen={isSidebarOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        <Header 
          isSidebarOpen={isSidebarOpen}
          handleToggleSidebar={handleToggleSidebar}
          pageMeta={pageMeta}
          searchVal={searchVal}
          setSearchVal={setSearchVal}
          onSearchSubmit={onSearchSubmit}
          onOpenCalculator={() => setIsCalculatorModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className={clsx(
          "flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-8 custom-scrollbar",
          "bg-[#f5f6f8] dark:bg-[#0c0c14]",
          "print:p-0 print:border-none print:shadow-none print:bg-transparent print:rounded-none"
        )}>
          <div key={location.pathname} className="animate-page-enter">
            <Outlet />
          </div>
        </main>

        {/* Modals */}
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

        <Modal isOpen={isCalculatorModalOpen} onClose={() => setIsCalculatorModalOpen(false)} zClassName="z-[9999] print:hidden" className="bg-white dark:bg-[#111622] rounded-2xl w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] relative border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsCalculatorModalOpen(false)}
                className="absolute right-4 top-4 z-10 p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-900/30 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="p-4 sm:p-6">
                <IrrCalculatorComponent />
              </div>
        </Modal>

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenNewLead={() => setIsNewLeadModalOpen(true)}
          onOpenCalculator={() => setIsCalculatorModalOpen(true)}
        />
      </div>
    </div>
  );
}
