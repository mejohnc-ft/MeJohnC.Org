import { Suspense, useCallback, useRef, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/reduced-motion';
import { useWindowManagerContext } from './WindowManager';
import WindowTitleBar from './WindowTitleBar';
import { getApp } from './apps/AppRegistry';
import type { WindowState } from '@/hooks/useWindowManager';

interface WindowProps {
  window: WindowState;
}

function WindowLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Window({ window: win }: WindowProps) {
  const { state, closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow } = useWindowManagerContext();
  const prefersReducedMotion = useReducedMotion();
  const windowRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; winX: number; winY: number } | null>(null);

  const isFocused = state.focusedWindowId === win.id;
  const app = getApp(win.appId);

  // Lazy load the app component
  const AppComponent = useMemo(() => {
    if (!app) return null;
    return lazy(app.component);
  }, [app]);

  const handlePointerDown = useCallback(() => {
    // Focus window on any click
    if (!isFocused) {
      focusWindow(win.id);
    }
  }, [isFocused, focusWindow, win.id]);

  const handleTitleBarPointerDown = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return; // Don't drag maximized windows
    e.preventDefault();
    const el = windowRef.current;
    if (!el) return;

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      winX: win.x,
      winY: win.y,
    };

    el.setPointerCapture(e.pointerId);

    const handleMove = (moveEvent: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.winX + dx;
      const newY = Math.max(28, dragStartRef.current.winY + dy); // Can't go above menu bar

      // Use transform for GPU-accelerated movement during drag
      if (windowRef.current) {
        windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        windowRef.current.style.left = '0';
        windowRef.current.style.top = '0';
      }
    };

    const handleUp = (upEvent: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = upEvent.clientX - dragStartRef.current.x;
      const dy = upEvent.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.winX + dx;
      const newY = Math.max(28, dragStartRef.current.winY + dy);

      dragStartRef.current = null;

      // Commit to state
      if (windowRef.current) {
        windowRef.current.style.transform = '';
        windowRef.current.style.left = `${newX}px`;
        windowRef.current.style.top = `${newY}px`;
      }
      moveWindow(win.id, newX, newY);

      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerup', handleUp);
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerup', handleUp);
  }, [win.id, win.x, win.y, win.maximized, moveWindow]);

  const handleDoubleClick = useCallback(() => {
    if (win.maximized) {
      restoreWindow(win.id);
    } else {
      maximizeWindow(win.id);
    }
  }, [win.id, win.maximized, maximizeWindow, restoreWindow]);

  if (!app || !AppComponent) return null;
  if (win.minimized) return null;

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { scale: 0.85, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  return (
    <motion.div
      ref={windowRef}
      {...motionProps}
      role="dialog"
      aria-label={win.title}
      className={`
        absolute flex flex-col rounded-lg overflow-hidden
        ${isFocused ? 'shadow-2xl ring-1 ring-border' : 'shadow-lg ring-1 ring-border/50'}
      `}
      style={{
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        contain: 'layout style paint',
      }}
      onPointerDown={handlePointerDown}
    >
      <WindowTitleBar
        title={win.title}
        focused={isFocused}
        maximized={win.maximized}
        onClose={() => closeWindow(win.id)}
        onMinimize={() => minimizeWindow(win.id)}
        onMaximize={() => maximizeWindow(win.id)}
        onRestore={() => restoreWindow(win.id)}
        onPointerDown={handleTitleBarPointerDown}
        onDoubleClick={handleDoubleClick}
      />
      <div className="flex-1 overflow-auto bg-background">
        <Suspense fallback={<WindowLoader />}>
          <div className="p-8">
            <AppComponent />
          </div>
        </Suspense>
      </div>
    </motion.div>
  );
}
