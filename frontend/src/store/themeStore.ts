import { create } from 'zustand';

export type AccentTheme = 'indigo' | 'emerald' | 'violet' | 'cyan' | 'amber' | 'titanium' | 'platinum' | 'gold' | 'rosegold' | 'bronze';
export type LayoutDensity = 'comfortable' | 'compact';
export type AppFont = 'inter' | 'outfit' | 'playfair';
export type AppRadius = 'sharp' | 'rounded' | 'pill';

interface ThemeState {
  isDark: boolean;
  accent: AccentTheme;
  density: LayoutDensity;
  appFont: AppFont;
  appRadius: AppRadius;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setAccent: (accent: AccentTheme) => void;
  setDensity: (density: LayoutDensity) => void;
  setAppFont: (font: AppFont) => void;
  setAppRadius: (radius: AppRadius) => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const storedTheme = typeof window !== 'undefined' ? (localStorage.getItem('theme_mode') || localStorage.getItem('theme')) : null;
  const initialDark = storedTheme === 'dark';
  
  const storedAccent = (typeof window !== 'undefined' ? localStorage.getItem('accent_theme') : 'indigo') as AccentTheme || 'indigo';
  const storedDensity = (typeof window !== 'undefined' ? localStorage.getItem('layout_density') : 'compact') as LayoutDensity || 'compact';
  const storedFont = (typeof window !== 'undefined' ? localStorage.getItem('app_font') : 'inter') as AppFont || 'inter';
  const storedRadius = (typeof window !== 'undefined' ? localStorage.getItem('app_radius') : 'rounded') as AppRadius || 'rounded';

  const applyThemeClasses = (isDark: boolean, accent: AccentTheme, density: LayoutDensity, font: AppFont, radius: AppRadius) => {
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
      root.setAttribute('data-font', font);
      root.setAttribute('data-radius', radius);
    }
  };

  // Initial apply
  applyThemeClasses(initialDark, storedAccent, storedDensity, storedFont, storedRadius);

  return {
    isDark: initialDark,
    accent: storedAccent,
    density: storedDensity,
    appFont: storedFont,
    appRadius: storedRadius,
    toggleTheme: () => set((state) => {
      const nextDark = !state.isDark;
      localStorage.setItem('theme_mode', nextDark ? 'dark' : 'light');
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
      applyThemeClasses(nextDark, state.accent, state.density, state.appFont, state.appRadius);
      return { isDark: nextDark };
    }),
    setTheme: (isDark) => set((state) => {
      localStorage.setItem('theme_mode', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyThemeClasses(isDark, state.accent, state.density, state.appFont, state.appRadius);
      return { isDark };
    }),
    setAccent: (accent) => set((state) => {
      localStorage.setItem('accent_theme', accent);
      applyThemeClasses(state.isDark, accent, state.density, state.appFont, state.appRadius);
      return { accent };
    }),
    setDensity: (density) => set((state) => {
      localStorage.setItem('layout_density', density);
      applyThemeClasses(state.isDark, state.accent, density, state.appFont, state.appRadius);
      return { density };
    }),
    setAppFont: (font) => set((state) => {
      localStorage.setItem('app_font', font);
      applyThemeClasses(state.isDark, state.accent, state.density, font, state.appRadius);
      return { appFont: font };
    }),
    setAppRadius: (radius) => set((state) => {
      localStorage.setItem('app_radius', radius);
      applyThemeClasses(state.isDark, state.accent, state.density, state.appFont, radius);
      return { appRadius: radius };
    })
  };
});

