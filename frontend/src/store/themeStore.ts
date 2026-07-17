import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = typeof window !== 'undefined' ? (localStorage.getItem('theme_mode') || localStorage.getItem('theme')) : null;
  const initialDark = stored === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  
  if (typeof document !== 'undefined') {
    if (initialDark) {
      document.documentElement.classList.add('dark');
      if (document.body) document.body.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      if (document.body) document.body.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }

  return {
    isDark: initialDark,
    toggleTheme: () => set((state) => {
      const next = !state.isDark;
      localStorage.setItem('theme_mode', next ? 'dark' : 'light');
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      return { isDark: next };
    }),
    setTheme: (isDark) => set(() => {
      localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      return { isDark };
    })
  };
});
