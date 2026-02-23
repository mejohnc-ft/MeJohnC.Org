/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { useWindowManager, WindowManagerState } from "@/hooks/useWindowManager";
import { useDesktopWorkspace } from "@/hooks/useDesktopWorkspace";
import { getApp, isAppLocked } from "./apps/AppRegistry";
import { useBilling } from "@/hooks/useBilling";
import { useTenant } from "@/lib/tenant";

import {
  MENU_BAR_HEIGHT,
  DOCK_HEIGHT,
  MAX_OPEN_WINDOWS,
} from "@/lib/desktop-constants";

interface WindowManagerContextType {
  state: WindowManagerState;
  toastMessage: string | null;
  launchApp: (appId: string) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (
    id: string,
    width: number,
    height: number,
    x?: number,
    y?: number,
  ) => void;
}

export interface WorkspaceContextType {
  userId: string;
  isLoading: boolean;
  wallpaper: string;
  dockItems: string[];
  updateWallpaper: (wallpaper: string) => void;
  pinApp: (appId: string) => void;
  unpinApp: (appId: string) => void;
  reorderDockItems: (items: string[]) => void;
}

const WindowManagerContext = createContext<
  WindowManagerContextType | undefined
>(undefined);
const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

interface WindowManagerProviderProps {
  userId: string;
  children: ReactNode;
}

export function WindowManagerProvider({
  userId,
  children,
}: WindowManagerProviderProps) {
  const wm = useWindowManager();
  const cascadeOffset = useRef(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { plan } = useBilling();
  const { tenant } = useTenant();
  const enabledAppIds = (tenant?.settings as Record<string, unknown>)
    ?.enabled_apps as string[] | undefined;

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const workspace = useDesktopWorkspace({
    userId,
    windowState: wm.state,
    restoreWindowState: wm.restoreState,
    plan,
    enabledAppIds,
  });

  const launchApp = useCallback(
    (appId: string) => {
      const app = getApp(appId);
      if (!app) return;

      // Plan/whitelist permission check
      if (isAppLocked(appId, plan, enabledAppIds)) {
        setToastMessage(`${app.name} is not available on your current plan.`);
        return;
      }

      // Singleton enforcement: focus existing if already open
      if (app.singleton) {
        const existing = wm.findWindowByAppId(appId);
        if (existing) {
          wm.focusWindow(existing.id);
          return;
        }
      }

      // Max window limit
      const openCount = wm.state.windows.filter((w) => !w.minimized).length;
      if (openCount >= MAX_OPEN_WINDOWS) {
        setToastMessage(
          "Maximum of 10 windows open. Close a window to open a new one.",
        );
        return;
      }

      // Cascade position for new windows
      const baseX = 80 + (cascadeOffset.current % 8) * 30;
      const baseY = MENU_BAR_HEIGHT + 40 + (cascadeOffset.current % 8) * 30;
      cascadeOffset.current++;

      // Clamp size to viewport
      const width = Math.min(app.defaultSize.width, window.innerWidth - 40);
      const height = Math.min(
        app.defaultSize.height,
        window.innerHeight - MENU_BAR_HEIGHT - DOCK_HEIGHT - 40,
      );
      // Clamp position to viewport
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(
        MENU_BAR_HEIGHT,
        window.innerHeight - DOCK_HEIGHT - height,
      );
      const x = Math.min(baseX, maxX);
      const y = Math.min(baseY, maxY);

      wm.openWindow(appId, app.name, x, y, width, height);
    },
    [wm, plan, enabledAppIds],
  );

  const maximizeWindow = useCallback(
    (id: string) => {
      wm.maximizeWindow(id, {
        width: window.innerWidth,
        height: window.innerHeight - DOCK_HEIGHT,
        topOffset: MENU_BAR_HEIGHT,
      });
    },
    [wm],
  );

  const workspaceValue = useMemo<WorkspaceContextType>(
    () => ({
      userId,
      isLoading: workspace.isLoading,
      wallpaper: workspace.wallpaper,
      dockItems: workspace.dockItems,
      updateWallpaper: workspace.updateWallpaper,
      pinApp: workspace.pinApp,
      unpinApp: workspace.unpinApp,
      reorderDockItems: workspace.reorderDockItems,
    }),
    [
      userId,
      workspace.isLoading,
      workspace.wallpaper,
      workspace.dockItems,
      workspace.updateWallpaper,
      workspace.pinApp,
      workspace.unpinApp,
      workspace.reorderDockItems,
    ],
  );

  return (
    <WindowManagerContext.Provider
      value={{
        state: wm.state,
        toastMessage,
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
    throw new Error(
      "useWindowManagerContext must be used within a WindowManagerProvider",
    );
  }
  return context;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error(
      "useWorkspaceContext must be used within a WindowManagerProvider",
    );
  }
  return context;
}
