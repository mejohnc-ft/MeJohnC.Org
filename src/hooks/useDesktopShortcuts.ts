import { useEffect, useCallback } from "react";
import type { WindowState } from "./useWindowManager";

interface UseDesktopShortcutsOptions {
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  focusedWindowId: string | null;
  windows: WindowState[];
  openSpotlight: () => void;
  closeSpotlight: () => void;
  isSpotlightOpen: boolean;
}

export function useDesktopShortcuts({
  closeWindow,
  minimizeWindow,
  focusWindow,
  focusedWindowId,
  windows,
  openSpotlight,
  closeSpotlight,
  isSpotlightOpen,
}: UseDesktopShortcutsOptions) {
  const handleModKey = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "w":
          e.preventDefault();
          if (focusedWindowId) closeWindow(focusedWindowId);
          break;
        case "m":
          e.preventDefault();
          if (focusedWindowId) minimizeWindow(focusedWindowId);
          break;
        case "`": {
          e.preventDefault();
          const nonMinimized = windows
            .filter((w) => !w.minimized)
            .sort((a, b) => b.zIndex - a.zIndex);
          if (nonMinimized.length < 2) break;
          const currentIdx = nonMinimized.findIndex(
            (w) => w.id === focusedWindowId,
          );
          const nextIdx = (currentIdx + 1) % nonMinimized.length;
          focusWindow(nonMinimized[nextIdx].id);
          break;
        }
        case "k":
        case " ":
          e.preventDefault();
          if (isSpotlightOpen) closeSpotlight();
          else openSpotlight();
          break;
      }
    },
    [
      closeWindow,
      minimizeWindow,
      focusWindow,
      focusedWindowId,
      windows,
      openSpotlight,
      closeSpotlight,
      isSpotlightOpen,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip global shortcuts when focus is inside input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        handleModKey(e);
        return;
      }

      if (e.key === "Escape" && isSpotlightOpen) {
        e.preventDefault();
        closeSpotlight();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleModKey, isSpotlightOpen, closeSpotlight]);
}
