import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { ContextMenuItem } from "@/hooks/useContextMenu";

interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ContextMenu({
  items,
  position,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Indices of actionable (non-separator, non-disabled) items for keyboard nav
  const actionableIndices = useMemo(
    () =>
      items.reduce<number[]>((acc, item, i) => {
        if (!item.separator && !item.disabled) acc.push(i);
        return acc;
      }, []),
    [items],
  );

  const [focusedIndex, setFocusedIndex] = useState<number>(() =>
    actionableIndices.length > 0 ? actionableIndices[0] : -1,
  );

  // Auto-focus the menu on mount
  useEffect(() => {
    menuRef.current?.focus();
  }, []);

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
  const handleOutsideClick = useCallback(
    (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  const activateItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item || item.separator || item.disabled) return;
      item.onClick?.();
      onClose();
    },
    [items, onClose],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (actionableIndices.length === 0) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          const curPos = actionableIndices.indexOf(focusedIndex);
          const next = (curPos + 1) % actionableIndices.length;
          setFocusedIndex(actionableIndices[next]);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const curPos = actionableIndices.indexOf(focusedIndex);
          const prev =
            (curPos - 1 + actionableIndices.length) % actionableIndices.length;
          setFocusedIndex(actionableIndices[prev]);
          break;
        }
        case "Home":
          e.preventDefault();
          setFocusedIndex(actionableIndices[0]);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(actionableIndices[actionableIndices.length - 1]);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          activateItem(focusedIndex);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [actionableIndices, focusedIndex, activateItem, onClose],
  );

  return (
    <div
      ref={menuRef}
      className="fixed min-w-[180px] bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-xl py-1 outline-none"
      style={{
        zIndex: 55,
        left: position.x,
        top: position.y,
      }}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <div
              key={item.id}
              className="border-t border-border my-1"
              role="separator"
            />
          );
        }

        const isFocused = index === focusedIndex;

        return (
          <button
            key={item.id}
            role="menuitem"
            disabled={item.disabled}
            tabIndex={-1}
            className={`
              w-full text-left px-3 py-1.5 text-xs flex items-center justify-between gap-4
              transition-colors
              ${
                item.disabled
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : item.danger
                    ? `text-red-500 ${isFocused ? "bg-red-500/10" : "hover:bg-red-500/10"}`
                    : `text-foreground ${isFocused ? "bg-muted" : "hover:bg-muted"}`
              }
            `}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            onMouseEnter={() => {
              if (!item.disabled) setFocusedIndex(index);
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[10px] text-muted-foreground">
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
