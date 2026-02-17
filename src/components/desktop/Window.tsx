import { Suspense, useCallback, useRef, lazy, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/reduced-motion';
import { useWindowManagerContext } from './WindowManager';
import WindowTitleBar from './WindowTitleBar';
import { getApp } from './apps/AppRegistry';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { useWindowResize, ResizeHandles } from '@/hooks/useWindowResize';
import { useSnapZones, SnapPreview } from '@/hooks/useSnapZones';
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
  const { state, closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } = useWindowManagerContext();
  const prefersReducedMotion = useReducedMotion();
  const windowRef = useRef<HTMLDivElement>(null);

  const isFocused = state.focusedWindowId === win.id;
  const app = getApp(win.appId);

  const { activeZone, updateSnapZone, commitSnap } = useSnapZones();

  // Drag hook with snap zone integration
  const dragCallbacks = useMemo(
    () => ({
      onDragEnd: (x: number, y: number) => {
        const snapGeo = commitSnap();
        if (snapGeo) {
          // Apply snap geometry
          if (windowRef.current) {
            windowRef.current.style.transform = '';
            windowRef.current.style.left = `${snapGeo.x}px`;
            windowRef.current.style.top = `${snapGeo.y}px`;
            windowRef.current.style.width = `${snapGeo.width}px`;
            windowRef.current.style.height = `${snapGeo.height}px`;
          }
          resizeWindow(win.id, snapGeo.width, snapGeo.height, snapGeo.x, snapGeo.y);
        } else {
          moveWindow(win.id, x, y);
        }
      },
    }),
    [commitSnap, moveWindow, resizeWindow, win.id]
  );

  const { handleTitleBarPointerDown } = useWindowDrag({
    windowRef,
    x: win.x,
    y: win.y,
    width: win.width,
    maximized: win.maximized,
    callbacks: dragCallbacks,
  });

  // Resize hook
  const resizeCallbacks = useMemo(
    () => ({
      onResizeEnd: (newX: number, newY: number, newW: number, newH: number) => {
        resizeWindow(win.id, newW, newH, newX, newY);
      },
    }),
    [resizeWindow, win.id]
  );

  const minSize = app?.minSize ?? { width: 300, height: 200 };

  const { handleResizePointerDown } = useWindowResize({
    windowRef,
    x: win.x,
    y: win.y,
    width: win.width,
    height: win.height,
    minWidth: minSize.width,
    minHeight: minSize.height,
    maximized: win.maximized,
    callbacks: resizeCallbacks,
  });

  const handlePointerDown = useCallback(() => {
    if (!isFocused) {
      focusWindow(win.id);
    }
  }, [isFocused, focusWindow, win.id]);

  // Enhanced title bar pointer down: wire snap zone detection into the drag
  const handleTitleBarPointerDownWithSnap = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) return;

      // Set up snap zone tracking on the window element
      const el = windowRef.current;
      if (!el) {
        handleTitleBarPointerDown(e);
        return;
      }

      const handleSnapMove = (moveEvent: PointerEvent) => {
        updateSnapZone(moveEvent.clientX, moveEvent.clientY);
      };

      const handleSnapUp = () => {
        el.removeEventListener('pointermove', handleSnapMove);
        el.removeEventListener('pointerup', handleSnapUp);
      };

      el.addEventListener('pointermove', handleSnapMove);
      el.addEventListener('pointerup', handleSnapUp);

      // Delegate to the drag hook
      handleTitleBarPointerDown(e);
    },
    [win.maximized, windowRef, handleTitleBarPointerDown, updateSnapZone]
  );

  const handleDoubleClick = useCallback(() => {
    if (win.maximized) {
      restoreWindow(win.id);
    } else {
      maximizeWindow(win.id);
    }
  }, [win.id, win.maximized, maximizeWindow, restoreWindow]);

  // Lazy load the app component (memoized to avoid re-creating on every render)
  const AppComponent = useMemo(() => {
    if (!app) return null;
    return lazy(app.component);
  }, [app]);

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
    <>
      {/* Snap zone preview — rendered as sibling to avoid z-index nesting */}
      {activeZone && <SnapPreview zone={activeZone} />}

      <motion.div
        ref={windowRef}
        {...motionProps}
        role="dialog"
        aria-label={win.title}
        className={`
          absolute flex flex-col rounded-lg overflow-visible
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
        {/* Resize handles */}
        <ResizeHandles onPointerDown={handleResizePointerDown} maximized={win.maximized} />

        <WindowTitleBar
          title={win.title}
          focused={isFocused}
          maximized={win.maximized}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onMaximize={() => maximizeWindow(win.id)}
          onRestore={() => restoreWindow(win.id)}
          onPointerDown={handleTitleBarPointerDownWithSnap}
          onDoubleClick={handleDoubleClick}
        />
        <div className="flex-1 overflow-auto bg-background rounded-b-lg">
          <Suspense fallback={<WindowLoader />}>
            <div className="p-8">
              <AppComponent />
            </div>
          </Suspense>
        </div>
      </motion.div>
    </>
  );
}
