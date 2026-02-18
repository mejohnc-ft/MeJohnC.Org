import { useCallback, useRef } from "react";
import {
  Folder,
  FileText,
  Monitor,
  AppWindow,
  Download,
  Trash2,
  Link,
  File,
  Bot,
  GitBranch,
  Plug,
  Settings,
  Bookmark,
  Users,
  CheckSquare,
} from "lucide-react";
import type { FileSystemNode } from "@/lib/desktop-schemas";

import { MENU_BAR_HEIGHT, DOCK_HEIGHT } from "@/lib/desktop-constants";
const ICON_SIZE = 80; // total icon cell size

const ICON_COMPONENTS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Folder,
  FileText,
  Monitor,
  AppWindow,
  Download,
  Trash2,
  Link,
  File,
  Bot,
  GitBranch,
  Plug,
  Settings,
  Bookmark,
  Users,
  CheckSquare,
};

interface DesktopIconProps {
  node: FileSystemNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onOpen: (node: FileSystemNode) => void;
  onContextMenu: (e: React.MouseEvent, node: FileSystemNode) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
}

export default function DesktopIcon({
  node,
  isSelected,
  onSelect,
  onOpen,
  onContextMenu,
  onPositionChange,
}: DesktopIconProps) {
  const iconRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    px: number;
    py: number;
    startX: number;
    startY: number;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const Icon = ICON_COMPONENTS[node.icon ?? ""] ?? File;
  const position = node.position ?? { x: 0, y: 0 };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // left click only
      e.preventDefault();
      e.stopPropagation();

      onSelect(node.id);

      const el = iconRef.current;
      if (!el) return;

      dragStartRef.current = {
        px: e.clientX,
        py: e.clientY,
        startX: position.x,
        startY: position.y,
      };
      isDraggingRef.current = false;
      el.setPointerCapture(e.pointerId);

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.px;
        const dy = moveEvent.clientY - dragStartRef.current.py;

        if (!isDraggingRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isDraggingRef.current = true;
        }
        if (!isDraggingRef.current) return;

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        let newX = dragStartRef.current.startX + dx;
        let newY = dragStartRef.current.startY + dy;

        // Clamp within desktop area
        newX = Math.max(0, Math.min(viewW - ICON_SIZE, newX));
        newY = Math.max(
          MENU_BAR_HEIGHT,
          Math.min(viewH - DOCK_HEIGHT - ICON_SIZE, newY),
        );

        // GPU-accelerated drag via transform
        if (iconRef.current) {
          const offsetX = newX - dragStartRef.current.startX;
          const offsetY = newY - dragStartRef.current.startY;
          iconRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        }
      };

      const handleUp = (upEvent: PointerEvent) => {
        el.removeEventListener("pointermove", handleMove);
        el.removeEventListener("pointerup", handleUp);
        el.removeEventListener("pointercancel", handleUp);

        if (isDraggingRef.current && dragStartRef.current) {
          const dx = upEvent.clientX - dragStartRef.current.px;
          const dy = upEvent.clientY - dragStartRef.current.py;
          const viewW = window.innerWidth;
          const viewH = window.innerHeight;

          let newX = dragStartRef.current.startX + dx;
          let newY = dragStartRef.current.startY + dy;
          newX = Math.max(0, Math.min(viewW - ICON_SIZE, newX));
          newY = Math.max(
            MENU_BAR_HEIGHT,
            Math.min(viewH - DOCK_HEIGHT - ICON_SIZE, newY),
          );

          // Commit final position to left/top and clear transform
          if (iconRef.current) {
            iconRef.current.style.transform = "";
            iconRef.current.style.left = `${newX}px`;
            iconRef.current.style.top = `${newY}px`;
          }

          onPositionChange?.(node.id, { x: newX, y: newY });
        } else if (iconRef.current) {
          iconRef.current.style.transform = "";
        }

        dragStartRef.current = null;
        isDraggingRef.current = false;
      };

      el.addEventListener("pointermove", handleMove);
      el.addEventListener("pointerup", handleUp);
      el.addEventListener("pointercancel", handleUp);
    },
    [node.id, position.x, position.y, onSelect, onPositionChange],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDraggingRef.current) return;
      onSelect(node.id);
    },
    [node.id, onSelect],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      onOpen(node);
    },
    [node, onOpen],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      onContextMenu(e, node);
    },
    [node, onContextMenu],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          onOpen(node);
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          onContextMenu(e as unknown as React.MouseEvent, node);
          break;
      }
    },
    [node, onOpen, onContextMenu],
  );

  return (
    <div
      ref={iconRef}
      className={`
        absolute flex flex-col items-center justify-start gap-1 p-2
        rounded-lg cursor-default select-none touch-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        ${isSelected ? "bg-primary/20 ring-1 ring-primary/40" : "hover:bg-black/5 dark:hover:bg-white/5"}
      `}
      style={{
        left: position.x,
        top: position.y,
        width: ICON_SIZE,
        height: ICON_SIZE,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={node.name}
      aria-selected={isSelected}
    >
      <Icon
        className={`w-8 h-8 ${node.color ?? "text-blue-400"} drop-shadow-md`}
      />
      <span className="text-[10px] text-white text-center leading-tight line-clamp-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] font-medium">
        {node.name}
      </span>
    </div>
  );
}
