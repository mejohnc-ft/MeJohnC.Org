import { useMemo } from 'react';
import { useWindowManagerContext } from './WindowManager';
import { getDefaultDockApps, appRegistry } from './apps/AppRegistry';
import DockItem from './DockItem';

export default function Dock() {
  const { state, launchApp, focusWindow } = useWindowManagerContext();

  // Pinned apps (always visible)
  const pinnedApps = useMemo(() => getDefaultDockApps(), []);
  const pinnedIds = useMemo(() => new Set(pinnedApps.map(a => a.id)), [pinnedApps]);

  // Running apps that aren't pinned
  const runningUnpinned = useMemo(() => {
    const runningAppIds = new Set(state.windows.map(w => w.appId));
    return appRegistry.filter(a => runningAppIds.has(a.id) && !pinnedIds.has(a.id));
  }, [state.windows, pinnedIds]);

  const runningAppIds = useMemo(() => new Set(state.windows.map(w => w.appId)), [state.windows]);

  const handleAppClick = (appId: string) => {
    // If running and focused, minimize; if running but not focused, focus; if not running, launch
    const existing = state.windows.find(w => w.appId === appId);
    if (existing) {
      if (existing.id === state.focusedWindowId && !existing.minimized) {
        // Already focused — minimize
        // Note: we just focus for now, minimize-on-click comes in Phase 5
        focusWindow(existing.id);
      } else {
        focusWindow(existing.id);
      }
    } else {
      launchApp(appId);
    }
  };

  return (
    <div
      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1 px-3 py-1.5 bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl"
      style={{ zIndex: 40 }}
      role="toolbar"
      aria-label="Application dock"
    >
      {/* Pinned apps */}
      {pinnedApps.map(app => (
        <DockItem
          key={app.id}
          app={app}
          isRunning={runningAppIds.has(app.id)}
          isFocused={state.windows.find(w => w.appId === app.id)?.id === state.focusedWindowId}
          onClick={() => handleAppClick(app.id)}
        />
      ))}

      {/* Separator between pinned and running-unpinned */}
      {runningUnpinned.length > 0 && (
        <div className="w-px h-8 bg-border/50 mx-1" />
      )}

      {/* Running but not pinned */}
      {runningUnpinned.map(app => (
        <DockItem
          key={app.id}
          app={app}
          isRunning={true}
          isFocused={state.windows.find(w => w.appId === app.id)?.id === state.focusedWindowId}
          onClick={() => handleAppClick(app.id)}
        />
      ))}
    </div>
  );
}
