import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Terminal, 
  LayoutDashboard, 
  Users, 
  Building, 
  Settings, 
  Plus, 
  Calculator,
  Moon,
  Sun,
  FileText
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import clsx from 'clsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewLead: () => void;
  onOpenCalculator: () => void;
}

interface Command {
  id: string;
  name: string;
  icon: React.FC<{className?: string}>;
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette({ isOpen, onClose, onOpenNewLead, onOpenCalculator }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'home', name: 'Go to Dashboard', icon: LayoutDashboard, action: () => navigate('/') },
    { id: 'leads', name: 'Go to Leads', icon: FileText, action: () => navigate('/leads') },
    { id: 'financers', name: 'Go to Financers', icon: Building, action: () => navigate('/financers') },
    { id: 'users', name: 'Go to Users', icon: Users, action: () => navigate('/users') },
    { id: 'settings', name: 'Go to Settings', icon: Settings, action: () => navigate('/settings') },
    { id: 'new-lead', name: 'Add New Lead', icon: Plus, shortcut: 'Ctrl+N', action: onOpenNewLead },
    { id: 'calculator', name: 'Open IRR Calculator', icon: Calculator, shortcut: 'Ctrl+I', action: onOpenCalculator },
    { id: 'theme', name: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`, icon: isDark ? Sun : Moon, action: toggleTheme },
  ];

  const filteredCommands = query === '' 
    ? commands 
    : commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-[#111622] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up ring-1 ring-black/5">
        <div className="flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-0 focus:ring-0 px-4 py-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 font-semibold border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2" role="listbox">
          {filteredCommands.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">
              No commands found.
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const Icon = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    isSelected 
                      ? "bg-primary-500/10 text-primary-700 dark:text-primary-400" 
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={clsx("w-4 h-4", isSelected ? "text-primary-500" : "text-slate-400")} />
                    {cmd.name}
                  </div>
                  {cmd.shortcut && (
                    <kbd className={clsx(
                      "hidden sm:inline-flex px-2 py-1 rounded text-[10px] font-mono font-semibold border",
                      isSelected 
                        ? "bg-primary-500/20 text-primary-700 dark:text-primary-400 border-primary-500/30" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    )}>
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              );
            })
          )}
        </div>
        
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between font-medium">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            <span>Command Menu</span>
          </div>
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1">â†‘</kbd><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1">â†“</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-1">â†µ</kbd> to select</span>
          </div>
        </div>
      </div>
    </div>
  );
}
