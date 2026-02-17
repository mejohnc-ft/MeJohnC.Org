import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, List, Columns, Search } from 'lucide-react';
import type { FileExplorerViewMode } from '@/lib/desktop-schemas';
import type { BreadcrumbItem } from '@/hooks/useFileSystem';

interface FileExplorerToolbarProps {
  currentPath: BreadcrumbItem[];
  viewMode: FileExplorerViewMode;
  onViewModeChange: (mode: FileExplorerViewMode) => void;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateTo: (id: string) => void;
  onNavigateToRoot: () => void;
  onSearch: (query: string) => void;
  canGoBack: boolean;
}

export default function FileExplorerToolbar({
  currentPath,
  viewMode,
  onViewModeChange,
  onNavigateBack,
  onNavigateForward,
  onNavigateTo,
  onNavigateToRoot,
  onSearch,
  canGoBack,
}: FileExplorerToolbarProps) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch(searchValue);
    }
  }, [searchValue, onSearch]);

  const viewModes: { mode: FileExplorerViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: 'icons', icon: LayoutGrid, label: 'Icons' },
    { mode: 'list', icon: List, label: 'List' },
    { mode: 'columns', icon: Columns, label: 'Columns' },
  ];

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/50">
      {/* Navigation buttons */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={onNavigateBack}
          disabled={!canGoBack}
          className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={onNavigateForward}
          disabled
          className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors"
          aria-label="Go forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb path */}
      <div className="flex-1 flex items-center gap-1 min-w-0 px-2 py-1 bg-muted/50 rounded text-xs">
        <button
          onClick={onNavigateToRoot}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          /
        </button>
        {currentPath.map((crumb, i) => (
          <span key={crumb.id} className="flex items-center gap-1 min-w-0">
            <span className="text-muted-foreground/50">/</span>
            {i === currentPath.length - 1 ? (
              <span className="text-foreground font-medium truncate">{crumb.name}</span>
            ) : (
              <button
                onClick={() => onNavigateTo(crumb.id)}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center border border-border rounded overflow-hidden">
        {viewModes.map(({ mode, icon: ModeIcon, label }) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`p-1.5 transition-colors ${
              viewMode === mode
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
            aria-label={label}
            aria-pressed={viewMode === mode}
          >
            <ModeIcon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="pl-6 pr-2 py-1 text-xs bg-muted/50 border border-border rounded w-32 focus:w-48 transition-all focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
    </div>
  );
}
