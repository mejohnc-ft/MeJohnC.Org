import { useCallback, useState } from 'react';

interface WindowTitleBarProps {
  title: string;
  focused: boolean;
  maximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
}

export default function WindowTitleBar({
  title,
  focused,
  maximized,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onPointerDown,
  onDoubleClick,
}: WindowTitleBarProps) {
  const [hovering, setHovering] = useState(false);

  const handleMaxToggle = useCallback(() => {
    if (maximized) {
      onRestore();
    } else {
      onMaximize();
    }
  }, [maximized, onMaximize, onRestore]);

  return (
    <div
      className={`
        h-9 flex items-center px-3 select-none shrink-0 rounded-t-lg
        ${focused
          ? 'bg-card border-b border-border'
          : 'bg-muted/80 border-b border-border/50'
        }
      `}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {/* Traffic light buttons */}
      <div
        className="flex items-center gap-1.5 mr-3"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        {/* Close (red) */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`
            w-3 h-3 rounded-full transition-colors
            ${focused
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-muted-foreground/30'
            }
          `}
          aria-label="Close window"
        >
          {hovering && focused && (
            <svg className="w-3 h-3 text-red-900/80" viewBox="0 0 12 12">
              <path d="M3.5 3.5L8.5 8.5M8.5 3.5L3.5 8.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          )}
        </button>

        {/* Minimize (yellow) */}
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          className={`
            w-3 h-3 rounded-full transition-colors
            ${focused
              ? 'bg-yellow-500 hover:bg-yellow-600'
              : 'bg-muted-foreground/30'
            }
          `}
          aria-label="Minimize window"
        >
          {hovering && focused && (
            <svg className="w-3 h-3 text-yellow-900/80" viewBox="0 0 12 12">
              <path d="M3 6H9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          )}
        </button>

        {/* Maximize/Restore (green) */}
        <button
          onClick={(e) => { e.stopPropagation(); handleMaxToggle(); }}
          className={`
            w-3 h-3 rounded-full transition-colors
            ${focused
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-muted-foreground/30'
            }
          `}
          aria-label={maximized ? 'Restore window' : 'Maximize window'}
        >
          {hovering && focused && (
            <svg className="w-3 h-3 text-green-900/80" viewBox="0 0 12 12">
              {maximized ? (
                // Restore icon (two overlapping squares)
                <>
                  <rect x="2.5" y="4.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M4.5 4.5V3a.5.5 0 0 1 .5-.5H9a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H7.5" stroke="currentColor" strokeWidth="1" fill="none" />
                </>
              ) : (
                // Full screen arrows
                <>
                  <path d="M3 3L5.5 5.5M9 3L6.5 5.5M3 9L5.5 6.5M9 9L6.5 6.5" stroke="currentColor" strokeWidth="1" fill="none" />
                </>
              )}
            </svg>
          )}
        </button>
      </div>

      {/* Title */}
      <span className={`
        flex-1 text-center text-xs font-medium truncate pointer-events-none
        ${focused ? 'text-foreground' : 'text-muted-foreground'}
      `}>
        {title}
      </span>

      {/* Spacer to balance traffic lights */}
      <div className="w-[54px]" />
    </div>
  );
}
