import { create } from 'zustand';

export type AccentTheme = 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber';
export type LayoutDensity = 'comfortable' | 'compact';

interface ThemeState {
  isDark: boolean;
  accent: AccentTheme;
  density: LayoutDensity;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setAccent: (accent: AccentTheme) => void;
  setDensity: (density: LayoutDensity) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const storedTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme_mode') || localStorage.getItem('theme')) : null;
  const initialDark = storedTheme === 'dark' || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  
  const storedAccent = (typeof window !== 'undefined' ? localStorage.getItem('accent_theme') : 'indigo') as AccentTheme || 'indigo';
  const storedDensity = (typeof window !== 'undefined' ? localStorage.getItem('layout_density') : 'comfortable') as LayoutDensity || 'comfortable';

  const applyThemeClasses = (isDark: boolean, accent: AccentTheme, density: LayoutDensity) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      root.setAttribute('data-accent', accent);
      root.setAttribute('data-density', density);
    }
  };

  // Initial apply
  applyThemeClasses(initialDark, storedAccent, storedDensity);

  return {
    isDark: initialDark,
    accent: storedAccent,
    density: storedDensity,
    toggleTheme: () => set((state) => {
      const nextDark = !state.isDark;
      localStorage.setItem('theme_mode', nextDark ? 'dark' : 'light');
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
      applyThemeClasses(nextDark, state.accent, state.density);
      return { isDark: nextDark };
    }),
    setTheme: (isDark) => set((state) => {
      localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyThemeClasses(isDark, state.accent, state.density);
      return { isDark };
    }),
    setAccent: (accent) => set((state) => {
      localStorage.setItem('accent_theme', accent);
      applyThemeClasses(state.isDark, accent, state.density);
      return { accent };
    }),
    setDensity: (density) => set((state) => {
      localStorage.setItem('layout_density', density);
      applyThemeClasses(state.isDark, state.accent, density);
      return { density };
    })
  };
});

