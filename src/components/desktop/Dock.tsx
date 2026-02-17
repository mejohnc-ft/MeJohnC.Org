import { useMemo, useCallback } from 'react';
import { useWindowManagerContext, useWorkspaceContext } from './WindowManager';
import { getApp, appRegistry } from './apps/AppRegistry';
import DockItem from './DockItem';
import ContextMenu from './ContextMenu';
import { useContextMenu, type ContextMenuItem } from '@/hooks/useContextMenu';

export default function Dock() {
  const { state, launchApp, focusWindow } = useWindowManagerContext();
  const workspace = useWorkspaceContext();
  const contextMenu = useContextMenu();

  // Pinned apps from workspace (filter out any that no longer exist in registry)
  const pinnedApps = useMemo(
    () => workspace.dockItems.map(id => getApp(id)).filter(Boolean) as NonNullable<ReturnType<typeof getApp>>[],
    [workspace.dockItems]
  );
  const pinnedIds = useMemo(() => new Set(pinnedApps.map(a => a.id)), [pinnedApps]);

  // Running apps that aren't pinned
  const runningUnpinned = useMemo(() => {
    const runningAppIds = new Set(state.windows.map(w => w.appId));
    return appRegistry.filter(a => runningAppIds.has(a.id) && !pinnedIds.has(a.id));
  }, [state.windows, pinnedIds]);

  const runningAppIds = useMemo(() => new Set(state.windows.map(w => w.appId)), [state.windows]);

  const handleAppClick = useCallback((appId: string) => {
    const existing = state.windows.find(w => w.appId === appId);
    if (existing) {
      focusWindow(existing.id);
    } else {
      launchApp(appId);
    }
  }, [state.windows, focusWindow, launchApp]);

  const handleDockItemContextMenu = useCallback((e: React.MouseEvent, appId: string) => {
    const isPinned = pinnedIds.has(appId);
    const isRunning = runningAppIds.has(appId);
    const items: ContextMenuItem[] = [];

    if (isPinned) {
      items.push({ id: 'unpin', label: 'Remove from Dock', onClick: () => workspace.unpinApp(appId) });
    } else {
      items.push({ id: 'pin', label: 'Keep in Dock', onClick: () => workspace.pinApp(appId) });
    }

    if (isRunning) {
      items.push({ id: 'sep1', label: '', separator: true });
      items.push({
        id: 'quit',
        label: 'Quit',
        danger: true,
        onClick: () => { /* TODO: wire up closeWindow per-app in future phase */ },
        disabled: true,
      });
    }

    contextMenu.openMenu(e, items);
  }, [pinnedIds, runningAppIds, workspace, state.windows, contextMenu]);

  return (
    <>
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
            onContextMenu={(e) => handleDockItemContextMenu(e, app.id)}
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
            onContextMenu={(e) => handleDockItemContextMenu(e, app.id)}
          />
        ))}
      </div>

      {/* Dock Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          items={contextMenu.menuItems}
          position={contextMenu.position}
          onClose={contextMenu.closeMenu}
        />
      )}
    </>
  );
}
