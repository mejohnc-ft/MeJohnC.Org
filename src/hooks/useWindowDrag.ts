import { useCallback, useRef } from 'react';

const MENU_BAR_HEIGHT = 28;
const TITLE_BAR_MIN_VISIBLE = 48;

export interface DragCallbacks {
  onDragStart?: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

export interface UseWindowDragOptions {
  windowRef: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  width: number;
  maximized: boolean;
  callbacks?: DragCallbacks;
}

export function useWindowDrag({
  windowRef,
  x,
  y,
  width,
  maximized,
  callbacks,
}: UseWindowDragOptions) {
  const dragStartRef = useRef<{
    px: number;
    py: number;
    winX: number;
    winY: number;
  } | null>(null);
  const isDraggingRef = useRef(false);

  const handleTitleBarPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (maximized) return;
      e.preventDefault();
      const el = windowRef.current;
      if (!el) return;

      dragStartRef.current = { px: e.clientX, py: e.clientY, winX: x, winY: y };
      isDraggingRef.current = false;
      el.setPointerCapture(e.pointerId);

      const handleMove = (moveEvent: PointerEvent) => {
        if (!dragStartRef.current) return;
        const dx = moveEvent.clientX - dragStartRef.current.px;
        const dy = moveEvent.clientY - dragStartRef.current.py;

        if (!isDraggingRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          isDraggingRef.current = true;
          callbacks?.onDragStart?.();
        }

        if (!isDraggingRef.current) return;

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        // Boundary constraints
        let newX = dragStartRef.current.winX + dx;
        let newY = dragStartRef.current.winY + dy;
        // Cannot go above menu bar
        newY = Math.max(MENU_BAR_HEIGHT, newY);
        // At least 48px of title bar visible horizontally
        newX = Math.max(-width + TITLE_BAR_MIN_VISIBLE, newX);
        newX = Math.min(viewW - TITLE_BAR_MIN_VISIBLE, newX);
        // At least title bar visible vertically (don't go below viewport)
        newY = Math.min(viewH - TITLE_BAR_MIN_VISIBLE, newY);

        // GPU-accelerated movement via transform
        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
          windowRef.current.style.left = '0';
          windowRef.current.style.top = '0';
        }

        callbacks?.onDragMove?.(newX, newY);
      };

      const handleUp = (upEvent: PointerEvent) => {
        el.removeEventListener('pointermove', handleMove);
        el.removeEventListener('pointerup', handleUp);

        if (!dragStartRef.current) return;
        const dx = upEvent.clientX - dragStartRef.current.px;
        const dy = upEvent.clientY - dragStartRef.current.py;

        const viewW = window.innerWidth;
        const viewH = window.innerHeight;

        let newX = dragStartRef.current.winX + dx;
        let newY = dragStartRef.current.winY + dy;
        newY = Math.max(MENU_BAR_HEIGHT, newY);
        newX = Math.max(-width + TITLE_BAR_MIN_VISIBLE, newX);
        newX = Math.min(viewW - TITLE_BAR_MIN_VISIBLE, newX);
        newY = Math.min(viewH - TITLE_BAR_MIN_VISIBLE, newY);

        dragStartRef.current = null;

        // Commit to DOM before state update
        if (windowRef.current) {
          windowRef.current.style.transform = '';
          windowRef.current.style.left = `${newX}px`;
          windowRef.current.style.top = `${newY}px`;
        }

        if (isDraggingRef.current) {
          callbacks?.onDragEnd?.(newX, newY);
        }
        isDraggingRef.current = false;
      };

      el.addEventListener('pointermove', handleMove);
      el.addEventListener('pointerup', handleUp);
    },
    [windowRef, x, y, width, maximized, callbacks]
  );

  return { handleTitleBarPointerDown, isDraggingRef };
}
