import { Sun, Snowflake, ArrowRight } from 'lucide-react';
import { useTheme } from '../lib/theme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-mono uppercase tracking-wider border border-border hover:border-primary transition-colors ${className}`}
      aria-label={`Switch to ${theme === 'warm' ? 'crisp' : 'warm'} theme`}
    >
      <span className="flex items-center gap-1.5">
        {theme === 'warm' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-orange-500" />
            <span>Warm</span>
          </>
        ) : (
          <>
            <Snowflake className="w-3.5 h-3.5 text-teal-600" />
            <span>Crisp</span>
          </>
        )}
      </span>
      <span className="text-muted-foreground">/</span>
      <span className="text-muted-foreground hover:text-foreground transition-colors">
        {theme === 'warm' ? 'Crisp' : 'Warm'}
      </span>
    </button>
  );
}

export function ThemeToggleMinimal({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isWarm = theme === 'warm';

  return (
    <button
      onClick={toggleTheme}
      className={`group relative w-11 h-11 flex items-center justify-center border border-border hover:border-primary transition-all ${className}`}
      aria-label={`Switch to ${isWarm ? 'crisp' : 'warm'} theme`}
    >
      {/* Icon */}
      {isWarm ? (
        <Sun className="w-4 h-4 text-orange-500 group-hover:scale-110 transition-transform" />
      ) : (
        <Snowflake className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
      )}

      {/* Tooltip pill */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 font-mono text-xs whitespace-nowrap shadow-sm">
          {/* Current */}
          <span className="flex items-center gap-1.5 text-foreground">
            {isWarm ? <Sun className="w-3.5 h-3.5 text-orange-500" /> : <Snowflake className="w-3.5 h-3.5 text-teal-600" />}
            <span>{isWarm ? 'Warm' : 'Crisp'}</span>
          </span>

          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />

          {/* Target */}
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {isWarm ? <Snowflake className="w-3.5 h-3.5 text-teal-600" /> : <Sun className="w-3.5 h-3.5 text-orange-500" />}
            <span>{isWarm ? 'Crisp' : 'Warm'}</span>
          </span>
        </div>
      </div>
    </button>
  );
}
