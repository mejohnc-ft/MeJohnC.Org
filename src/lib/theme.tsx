/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { STORAGE_KEYS } from './constants';

export type Theme = 'warm' | 'crisp' | 'solarized-dark' | 'solarized-light';

export const THEMES: Theme[] = ['warm', 'crisp', 'solarized-dark', 'solarized-light'];

export const THEME_LABELS: Record<Theme, string> = {
  'warm': 'Warm',
  'crisp': 'Crisp',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isValidTheme(value: string | null): value is Theme {
  return value !== null && THEMES.includes(value as Theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME);
      if (isValidTheme(stored)) {
        return stored;
      }
    }
    return 'warm';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      const currentIndex = THEMES.indexOf(prev);
      const nextIndex = (currentIndex + 1) % THEMES.length;
      return THEMES[nextIndex];
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
