import { useState, useEffect, useRef, useCallback } from "react";
import {
  getActiveWorkspace,
  createDefaultWorkspace,
  saveWorkspace,
} from "@/lib/desktop-queries";
import {
  getApp,
  getDefaultDockApps,
} from "@/components/desktop/apps/AppRegistry";
import type { WindowState } from "./useWindowManager";
import type { DesktopWorkspace } from "@/lib/desktop-schemas";

const SAVE_DEBOUNCE_MS = 2000;
const DEFAULT_WALLPAPER =
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)";
const WINDOW_STATE_SCHEMA_VERSION = 1;

/** Shape persisted for each window (no ephemeral id) */
interface PersistedWindowState {
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  preMaximize?: { x: number; y: number; width: number; height: number };
}

interface PersistedWindowPayload {
  schemaVersion: number;
  windows: PersistedWindowState[];
}

function serializeWindows(windows: WindowState[]): PersistedWindowPayload {
  // Sort by zIndex so restore order preserves z-order
  return {
    schemaVersion: WINDOW_STATE_SCHEMA_VERSION,
    windows: [...windows]
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((w) => ({
        appId: w.appId,
        title: w.title,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        minimized: w.minimized,
        maximized: w.maximized,
        preMaximize: w.preMaximize,
      })),
  };
}

/** Parse persisted window states, handling both legacy (raw array) and versioned formats */
function parsePersistedWindows(raw: unknown): PersistedWindowState[] {
  if (Array.isArray(raw)) {
    // Legacy format: raw array (schemaVersion 0)
    return raw as PersistedWindowState[];
  }
  if (
    raw &&
    typeof raw === "object" &&
    "schemaVersion" in raw &&
    "windows" in raw
  ) {
    // Versioned format
    const payload = raw as PersistedWindowPayload;
    // Future: add migration logic for newer schema versions here
    return payload.windows;
  }
  return [];
}

let restoreCounter = 0;

function deserializeWindows(persisted: PersistedWindowState[]): {
  windows: WindowState[];
  nextZIndex: number;
} {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const windows: WindowState[] = persisted
    .filter((w) => getApp(w.appId)) // drop windows for unregistered apps
    .map((w, i) => ({
      ...w,
      id: `${w.appId}-r${++restoreCounter}-${Date.now()}`,
      // Clamp position to viewport
      x: Math.max(0, Math.min(w.x, vw - 100)),
      y: Math.max(0, Math.min(w.y, vh - 100)),
      zIndex: 100 + i,
    }));

  return { windows, nextZIndex: 100 + windows.length };
}

export interface WorkspaceState {
  isLoading: boolean;
  wallpaper: string;
  dockItems: string[]; // appId[]
}

interface UseDesktopWorkspaceOptions {
  userId: string;
  windowState: { windows: WindowState[] };
  restoreWindowState: (windows: WindowState[], nextZIndex: number) => void;
}

export function useDesktopWorkspace({
  userId,
  windowState,
  restoreWindowState,
}: UseDesktopWorkspaceOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [wallpaper, setWallpaper] = useState(DEFAULT_WALLPAPER);
  const [dockItems, setDockItems] = useState<string[]>(() =>
    getDefaultDockApps().map((a) => a.id),
  );
  const workspaceRef = useRef<DesktopWorkspace | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = useRef(false);

  // Load or create workspace on mount
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let ws = await getActiveWorkspace(userId);
        if (!ws && !cancelled) {
          ws = await createDefaultWorkspace(userId);
        }
        if (cancelled || !ws) return;

        workspaceRef.current = ws;

        // Restore wallpaper
        if (ws.wallpaper) {
          setWallpaper(ws.wallpaper);
        }

        // Restore dock items
        if (ws.dock_items && ws.dock_items.length > 0) {
          const appIds = (ws.dock_items as Array<{ appId?: string }>)
            .map((item) => item.appId)
            .filter((id): id is string => !!id && !!getApp(id));
          if (appIds.length > 0) {
            setDockItems(appIds);
          }
        }

        // Restore window states (handles both legacy array and versioned format)
        if (
          ws.window_states &&
          (Array.isArray(ws.window_states) ? ws.window_states.length > 0 : true)
        ) {
          const parsed = parsePersistedWindows(ws.window_states);
          if (parsed.length > 0) {
            const { windows, nextZIndex } = deserializeWindows(parsed);
            if (windows.length > 0) {
              restoreWindowState(windows, nextZIndex);
            }
          }
        }

        hasRestoredRef.current = true;
      } catch (err) {
        console.error("[useDesktopWorkspace] Failed to load workspace:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [userId, restoreWindowState]);

  // Debounced save on window state changes
  const prevWindowsRef = useRef<string>("");
  useEffect(() => {
    if (!hasRestoredRef.current || !workspaceRef.current) return;

    const serialized = JSON.stringify(serializeWindows(windowState.windows));
    // Skip if nothing changed
    if (serialized === prevWindowsRef.current) return;
    prevWindowsRef.current = serialized;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const ws = workspaceRef.current;
      if (!ws) return;
      saveWorkspace(ws.id, {
        window_states: JSON.parse(serialized),
      }).catch((err) =>
        console.error("[useDesktopWorkspace] Save window state failed:", err),
      );
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [windowState.windows]);

  // Immediate wallpaper save
  const updateWallpaper = useCallback((newWallpaper: string) => {
    setWallpaper(newWallpaper);
    const ws = workspaceRef.current;
    if (!ws) return;
    saveWorkspace(ws.id, { wallpaper: newWallpaper }).catch((err) =>
      console.error("[useDesktopWorkspace] Save wallpaper failed:", err),
    );
  }, []);

  // Immediate dock save
  const saveDockItems = useCallback((items: string[]) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    saveWorkspace(ws.id, {
      dock_items: items.map((appId) => ({ appId })),
    }).catch((err) =>
      console.error("[useDesktopWorkspace] Save dock items failed:", err),
    );
  }, []);

  const pinApp = useCallback(
    (appId: string) => {
      setDockItems((prev) => {
        if (prev.includes(appId)) return prev;
        const next = [...prev, appId];
        saveDockItems(next);
        return next;
      });
    },
    [saveDockItems],
  );

  const unpinApp = useCallback(
    (appId: string) => {
      setDockItems((prev) => {
        const next = prev.filter((id) => id !== appId);
        saveDockItems(next);
        return next;
      });
    },
    [saveDockItems],
  );

  const reorderDockItems = useCallback(
    (items: string[]) => {
      setDockItems(items);
      saveDockItems(items);
    },
    [saveDockItems],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    isLoading,
    wallpaper,
    dockItems,
    updateWallpaper,
    pinApp,
    unpinApp,
    reorderDockItems,
  };
}
