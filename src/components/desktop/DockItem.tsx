import { useCallback, useState } from 'react';
import {
  LayoutDashboard, FileText, Newspaper, Bookmark, Bot, BookText,
  Wrench, BookOpen, CheckSquare, Users, FolderKanban, AppWindow,
  BarChart3, Server, Cable, FileCode2, GitBranch, Clock, Plug,
  FileSearch, Settings, User, Sparkles, Palette, FolderOpen,
} from 'lucide-react';
import type { DesktopApp } from './apps/AppRegistry';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, FileText, Newspaper, Bookmark, Bot, BookText,
  Wrench, BookOpen, CheckSquare, Users, FolderKanban, AppWindow,
  BarChart3, Server, Cable, FileCode2, GitBranch, Clock, Plug,
  FileSearch, Settings, User, Sparkles, Palette, FolderOpen,
};

interface DockItemProps {
  app: DesktopApp;
  isRunning: boolean;
  isFocused: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export default function DockItem({ app, isRunning, isFocused, onClick, onContextMenu }: DockItemProps) {
  const [bouncing, setBouncing] = useState(false);
  const Icon = ICON_MAP[app.icon];

  const handleClick = useCallback(() => {
    if (!isRunning) {
      // Bounce animation on launch
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }
    onClick();
  }, [isRunning, onClick]);

  return (
    <button
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className="relative flex flex-col items-center group"
      role="button"
      aria-pressed={isRunning}
      aria-label={`${app.name}${isRunning ? ' (running)' : ''}`}
    >
      {/* Tooltip */}
      <span className="absolute -top-8 px-2 py-0.5 bg-card border border-border rounded text-[10px] text-foreground font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
        {app.name}
      </span>

      {/* Icon container */}
      <div
        className={`
          w-11 h-11 rounded-xl flex items-center justify-center
          bg-card/80 backdrop-blur-sm border border-border/50
          hover:bg-card hover:border-border hover:scale-110
          active:scale-95
          transition-all duration-150
          ${isFocused ? 'ring-1 ring-primary/50' : ''}
          ${bouncing ? 'animate-bounce' : ''}
        `}
      >
        {Icon ? (
          <Icon className={`w-5 h-5 ${app.color}`} />
        ) : (
          <span className="text-xs font-bold text-muted-foreground">
            {app.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Running indicator dot */}
      {isRunning && (
        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-foreground/70" />
      )}
    </button>
  );
}
