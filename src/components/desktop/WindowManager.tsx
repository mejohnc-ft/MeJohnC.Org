/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useWindowManager, WindowManagerState } from '@/hooks/useWindowManager';
import { useDesktopWorkspace } from '@/hooks/useDesktopWorkspace';
import { getApp } from './apps/AppRegistry';

const MAX_OPEN_WINDOWS = 10;
const MENU_BAR_HEIGHT = 28;
const DOCK_HEIGHT = 64;

interface WindowManagerContextType {
  state: WindowManagerState;
  launchApp: (appId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, width: number, height: number, x?: number, y?: number) => void;
}

export interface WorkspaceContextType {
  isLoading: boolean;
  wallpaper: string;
  dockItems: string[];
  updateWallpaper: (wallpaper: string) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
}

const WindowManagerContext = createContext<WindowManagerContextType | undefined>(undefined);
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

// Cascade offset for new windows
let cascadeOffset = 0;

interface WindowManagerProviderProps {
  userId: string;
  children: ReactNode;
}

export function WindowManagerProvider({ userId, children }: WindowManagerProviderProps) {
  const wm = useWindowManager();

  const workspace = useDesktopWorkspace({
    userId,
    windowState: wm.state,
    restoreWindowState: wm.restoreState,
  });

  const launchApp = useCallback((appId: string) => {
    const app = getApp(appId);
    if (!app) return;

    // Singleton enforcement: focus existing if already open
    if (app.singleton) {
      const existing = wm.findWindowByAppId(appId);
      if (existing) {
        wm.focusWindow(existing.id);
        return;
      }
    }

    // Max window limit
    const openCount = wm.state.windows.filter(w => !w.minimized).length;
    if (openCount >= MAX_OPEN_WINDOWS) {
      // Could dispatch a notification here in Phase 5
      return;
    }

    // Cascade position for new windows
    const baseX = 80 + (cascadeOffset % 8) * 30;
    const baseY = MENU_BAR_HEIGHT + 40 + (cascadeOffset % 8) * 30;
    cascadeOffset++;

    const { width, height } = app.defaultSize;
    // Clamp to viewport
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(MENU_BAR_HEIGHT, window.innerHeight - DOCK_HEIGHT - height);
    const x = Math.min(baseX, maxX);
    const y = Math.min(baseY, maxY);

    wm.openWindow(appId, app.name, x, y, width, height);
  }, [wm]);

  const maximizeWindow = useCallback((id: string) => {
    wm.maximizeWindow(id, {
      width: window.innerWidth,
      height: window.innerHeight - DOCK_HEIGHT,
      topOffset: MENU_BAR_HEIGHT,
    });
  }, [wm]);

  const workspaceValue = useMemo<WorkspaceContextType>(() => ({
    isLoading: workspace.isLoading,
    wallpaper: workspace.wallpaper,
    dockItems: workspace.dockItems,
    updateWallpaper: workspace.updateWallpaper,
    pinApp: workspace.pinApp,
    unpinApp: workspace.unpinApp,
  }), [workspace.isLoading, workspace.wallpaper, workspace.dockItems, workspace.updateWallpaper, workspace.pinApp, workspace.unpinApp]);

  return (
    <WindowManagerContext.Provider
      value={{
        state: wm.state,
        launchApp,
        closeWindow: wm.closeWindow,
        focusWindow: wm.focusWindow,
        minimizeWindow: wm.minimizeWindow,
        maximizeWindow,
        restoreWindow: wm.restoreWindow,
        moveWindow: wm.moveWindow,
        resizeWindow: wm.resizeWindow,
      }}
    >
      <WorkspaceContext.Provider value={workspaceValue}>
        {children}
      </WorkspaceContext.Provider>
    </WindowManagerContext.Provider>
  );
}

export function useWindowManagerContext() {
  const context = useContext(WindowManagerContext);
  if (context === undefined) {
    throw new Error('useWindowManagerContext must be used within a WindowManagerProvider');
  }
  return context;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaceContext must be used within a WindowManagerProvider');
  }
  return context;
}
