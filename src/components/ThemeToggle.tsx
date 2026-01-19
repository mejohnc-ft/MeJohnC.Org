import { Sun, Snowflake, ArrowRight, Moon, SunMedium } from 'lucide-react';
import { useTheme, Theme, THEMES, THEME_LABELS } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

function getThemeIcon(theme: Theme, className: string = 'w-3.5 h-3.5') {
  switch (theme) {
    case 'warm':
      return <Sun className={`${className} text-orange-500`} />;
    case 'crisp':
      return <Snowflake className={`${className} text-teal-600`} />;
    case 'solarized-dark':
      return <Moon className={`${className} text-cyan-400`} />;
    case 'solarized-light':
      return <SunMedium className={`${className} text-cyan-600`} />;
  }
}

function getNextTheme(current: Theme): Theme {
  const currentIndex = THEMES.indexOf(current);
  const nextIndex = (currentIndex + 1) % THEMES.length;
  return THEMES[nextIndex];
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = getNextTheme(theme);

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-mono uppercase tracking-wider border border-border hover:border-primary transition-colors ${className}`}
      aria-label={`Switch to ${THEME_LABELS[nextTheme]} theme`}
    >
      <span className="flex items-center gap-1.5">
        {getThemeIcon(theme)}
        <span>{THEME_LABELS[theme]}</span>
      </span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground hover:text-foreground transition-colors">
        {THEME_LABELS[nextTheme]}
      </span>
    </button>
  );
}

export function ThemeToggleMinimal({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = getNextTheme(theme);

  return (
    <button
      onClick={toggleTheme}
      className={`group relative w-11 h-11 flex items-center justify-center border border-border hover:border-primary transition-all ${className}`}
      aria-label={`Switch to ${THEME_LABELS[nextTheme]} theme`}
    >
      {/* Icon */}
      <span className="group-hover:scale-110 transition-transform">
        {getThemeIcon(theme, 'w-4 h-4')}
      </span>

      {/* Tooltip pill */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 font-mono text-xs whitespace-nowrap shadow-sm">
          {/* Current */}
          <span className="flex items-center gap-1.5 text-foreground">
            {getThemeIcon(theme)}
            <span>{THEME_LABELS[theme]}</span>
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />

          {/* Target */}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {getThemeIcon(nextTheme)}
            <span>{THEME_LABELS[nextTheme]}</span>
          </span>
        </div>
      </div>
    </button>
  );
}
