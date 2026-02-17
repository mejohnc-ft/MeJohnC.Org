import { useEffect, useRef, useCallback } from 'react';
import type { ContextMenuItem } from '@/hooks/useContextMenu';

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({ items, position, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Viewport clamping
  const clampedPosition = useRef(position);
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    let { x, y } = position;
    if (x + rect.width > viewW) x = viewW - rect.width - 4;
    if (y + rect.height > viewH) y = viewH - rect.height - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;
    clampedPosition.current = { x, y };
    menuRef.current.style.left = `${x}px`;
    menuRef.current.style.top = `${y}px`;
  }, [position]);

  // Close on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOutsideClick, handleKeyDown]);

  return (
    <div
      ref={menuRef}
      className="fixed min-w-[180px] bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl py-1"
      style={{
        zIndex: 55,
        left: position.x,
        top: position.y,
      }}
      role="menu"
    >
      {items.map(item => {
        if (item.separator) {
          return <div key={item.id} className="border-t border-border my-1" role="separator" />;
        }

        return (
          <button
            key={item.id}
            role="menuitem"
            disabled={item.disabled}
            className={`
              w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-4
              transition-colors
              ${item.disabled
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : item.danger
                  ? 'text-red-500 hover:bg-red-500/10'
                  : 'text-foreground hover:bg-muted'
              }
            `}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-muted-foreground">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
