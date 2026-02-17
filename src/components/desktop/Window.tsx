import { Suspense, useCallback, useRef, lazy, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/reduced-motion';
import { useWindowManagerContext } from './WindowManager';
import WindowTitleBar from './WindowTitleBar';
import { getApp } from './apps/AppRegistry';
import { useWindowDrag } from '@/hooks/useWindowDrag';
import { useWindowResize, ResizeHandles } from '@/hooks/useWindowResize';
import { useSnapZones, SnapPreview } from '@/hooks/useSnapZones';
import { getDockIconPosition } from '@/lib/dock-icon-positions';
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

type AnimPhase = 'visible' | 'minimizing' | 'hidden' | 'restoring';

export default function Window({ window: win }: WindowProps) {
  const { state, closeWindow, focusWindow, minimizeWindow, maximizeWindow, restoreWindow, moveWindow, resizeWindow } = useWindowManagerContext();
  const prefersReducedMotion = useReducedMotion();
  const windowRef = useRef<HTMLDivElement>(null);

  const isFocused = state.focusedWindowId === win.id;
  const app = getApp(win.appId);

  // Animation state machine for minimize/restore
  const prevMinimizedRef = useRef(win.minimized);
  const [animPhase, setAnimPhase] = useState<AnimPhase>(win.minimized ? 'hidden' : 'visible');

  useEffect(() => {
    const wasMinimized = prevMinimizedRef.current;
    prevMinimizedRef.current = win.minimized;

    if (!wasMinimized && win.minimized) {
      // Minimize transition
      if (prefersReducedMotion) {
        setAnimPhase('hidden');
      } else {
        setAnimPhase('minimizing');
      }
    } else if (wasMinimized && !win.minimized) {
      // Restore transition
      if (prefersReducedMotion) {
        setAnimPhase('visible');
      } else {
        setAnimPhase('restoring');
      }
    }
  }, [win.minimized, prefersReducedMotion]);

  // Compute dock target for animation
  const dockTarget = useMemo(() => {
    const dockRect = getDockIconPosition(win.appId);
    if (!dockRect) return null;
    return {
      x: dockRect.left + dockRect.width / 2,
      y: dockRect.top + dockRect.height / 2,
    };
  }, [win.appId]);

  // Window center
  const windowCenter = useMemo(() => ({
    x: win.x + win.width / 2,
    y: win.y + win.height / 2,
  }), [win.x, win.y, win.width, win.height]);

  const { activeZone, updateSnapZone, commitSnap } = useSnapZones();

  // Drag hook with snap zone integration
  const dragCallbacks = useMemo(
    () => ({
      onDragEnd: (x: number, y: number) => {
        const snapGeo = commitSnap();
        if (snapGeo) {
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

  const handleTitleBarPointerDownWithSnap = useCallback(
    (e: React.PointerEvent) => {
      if (win.maximized) return;

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

  // Lazy load the app component
  const AppComponent = useMemo(() => {
    if (!app) return null;
    return lazy(app.component);
  }, [app]);

  if (!app || !AppComponent) return null;

  // Don't render when fully hidden
  if (animPhase === 'hidden') return null;

  // Compute animation variants for minimize/restore
  const getAnimateProps = () => {
    if (animPhase === 'minimizing' && dockTarget) {
      return {
        animate: {
          scale: 0.1,
          x: dockTarget.x - windowCenter.x,
          y: dockTarget.y - windowCenter.y,
          opacity: 0,
        },
        transition: {
          duration: 0.35,
          ease: [0.4, 0, 0.2, 1],
        },
        onAnimationComplete: () => setAnimPhase('hidden'),
      };
    }
    if (animPhase === 'restoring' && dockTarget) {
      return {
        initial: {
          scale: 0.1,
          x: dockTarget.x - windowCenter.x,
          y: dockTarget.y - windowCenter.y,
          opacity: 0,
        },
        animate: { scale: 1, x: 0, y: 0, opacity: 1 },
        transition: {
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        },
        onAnimationComplete: () => setAnimPhase('visible'),
      };
    }
    // Normal open animation
    if (prefersReducedMotion) return {};
    return {
      initial: { scale: 0.85, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { duration: 0.15, ease: 'easeOut' },
    };
  };

  const motionAnimProps = getAnimateProps();

  return (
    <>
      {activeZone && <SnapPreview zone={activeZone} />}

      <motion.div
        ref={windowRef}
        {...motionAnimProps}
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
