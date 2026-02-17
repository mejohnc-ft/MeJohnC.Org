import { useCallback, useRef } from 'react';

const MENU_BAR_HEIGHT = 28;

export type ResizeEdge = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface ResizeCallbacks {
  onResizeEnd: (x: number, y: number, width: number, height: number) => void;
}

export interface UseWindowResizeOptions {
  windowRef: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maximized: boolean;
  callbacks: ResizeCallbacks;
}

interface ResizeStart {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pure geometry calculation extracted for reuse between move and up handlers */
function calcResize(
  edge: ResizeEdge,
  dx: number,
  dy: number,
  start: ResizeStart,
  minW: number,
  minH: number,
) {
  let { x: newX, y: newY, w: newW, h: newH } = start;

  const hasEast = edge === 'e' || edge === 'ne' || edge === 'se';
  const hasWest = edge === 'w' || edge === 'nw' || edge === 'sw';
  const hasSouth = edge === 's' || edge === 'se' || edge === 'sw';
  const hasNorth = edge === 'n' || edge === 'ne' || edge === 'nw';

  if (hasEast) newW = Math.max(minW, start.w + dx);
  if (hasWest) {
    const dw = Math.min(dx, start.w - minW);
    newW = start.w - dw;
    newX = start.x + dw;
  }
  if (hasSouth) newH = Math.max(minH, start.h + dy);
  if (hasNorth) {
    const dh = Math.min(dy, start.h - minH);
    newH = start.h - dh;
    newY = Math.max(MENU_BAR_HEIGHT, start.y + dh);
    if (newY === MENU_BAR_HEIGHT && start.y + dh < MENU_BAR_HEIGHT) {
      newH = start.y + start.h - MENU_BAR_HEIGHT;
    }
  }

  return { x: newX, y: newY, w: newW, h: newH };
}

export function useWindowResize({
  windowRef,
  x,
  y,
  width,
  height,
  minWidth,
  minHeight,
  maximized,
  callbacks,
}: UseWindowResizeOptions) {
  const resizingRef = useRef(false);

  const handleResizePointerDown = useCallback(
    (edge: ResizeEdge, e: React.PointerEvent) => {
      if (maximized) return;
      e.preventDefault();
      e.stopPropagation();

      const el = windowRef.current;
      if (!el) return;

      resizingRef.current = true;

      const startPx = e.clientX;
      const startPy = e.clientY;
      const start: ResizeStart = { x, y, w: width, h: height };

      el.setPointerCapture(e.pointerId);

      const handleMove = (moveEvent: PointerEvent) => {
        const r = calcResize(
          edge,
          moveEvent.clientX - startPx,
          moveEvent.clientY - startPy,
          start,
          minWidth,
          minHeight,
        );
        if (windowRef.current) {
          windowRef.current.style.transform = `translate(${r.x}px, ${r.y}px)`;
          windowRef.current.style.left = '0';
          windowRef.current.style.top = '0';
          windowRef.current.style.width = `${r.w}px`;
          windowRef.current.style.height = `${r.h}px`;
        }
      };

      const handleUp = (upEvent: PointerEvent) => {
        el.removeEventListener('pointermove', handleMove);
        el.removeEventListener('pointerup', handleUp);
        resizingRef.current = false;

        const r = calcResize(
          edge,
          upEvent.clientX - startPx,
          upEvent.clientY - startPy,
          start,
          minWidth,
          minHeight,
        );
        if (windowRef.current) {
          windowRef.current.style.transform = '';
          windowRef.current.style.left = `${r.x}px`;
          windowRef.current.style.top = `${r.y}px`;
          windowRef.current.style.width = `${r.w}px`;
          windowRef.current.style.height = `${r.h}px`;
        }
        callbacks.onResizeEnd(r.x, r.y, r.w, r.h);
      };

      el.addEventListener('pointermove', handleMove);
      el.addEventListener('pointerup', handleUp);
    },
    [windowRef, x, y, width, height, minWidth, minHeight, maximized, callbacks]
  );

  return { handleResizePointerDown, resizingRef };
}

/** Resize handles rendered inside the window frame */
export function ResizeHandles({
  onPointerDown,
  maximized,
}: {
  onPointerDown: (edge: ResizeEdge, e: React.PointerEvent) => void;
  maximized: boolean;
}) {
  if (maximized) return null;

  const edges: { edge: ResizeEdge; style: React.CSSProperties }[] = [
    { edge: 'n', style: { top: -2, left: 8, right: 8, height: 4, cursor: 'n-resize' } },
    { edge: 's', style: { bottom: -2, left: 8, right: 8, height: 4, cursor: 's-resize' } },
    { edge: 'e', style: { top: 8, right: -2, bottom: 8, width: 4, cursor: 'e-resize' } },
    { edge: 'w', style: { top: 8, left: -2, bottom: 8, width: 4, cursor: 'w-resize' } },
    { edge: 'nw', style: { top: -4, left: -4, width: 8, height: 8, cursor: 'nw-resize' } },
    { edge: 'ne', style: { top: -4, right: -4, width: 8, height: 8, cursor: 'ne-resize' } },
    { edge: 'sw', style: { bottom: -4, left: -4, width: 8, height: 8, cursor: 'sw-resize' } },
    { edge: 'se', style: { bottom: -4, right: -4, width: 8, height: 8, cursor: 'se-resize' } },
  ];

  return (
    <>
      {edges.map(({ edge, style }) => (
        <div
          key={edge}
          style={{ position: 'absolute', zIndex: 1, ...style }}
          onPointerDown={(e) => onPointerDown(edge, e)}
        />
      ))}
    </>
  );
}
