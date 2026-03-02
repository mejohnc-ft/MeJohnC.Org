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
  undo?: () => void;
  toggleQuickNote?: () => void;
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
  undo,
  toggleQuickNote,
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
          e.preventDefault();
          if (isSpotlightOpen) closeSpotlight();
          else openSpotlight();
          break;
        case "z":
          e.preventDefault();
          if (undo) undo();
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
      undo,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+Shift+N — Quick Note (works even in input fields)
      if (mod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        if (toggleQuickNote) toggleQuickNote();
        return;
      }

      // Skip other global shortcuts when focus is inside input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

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
  }, [handleModKey, isSpotlightOpen, closeSpotlight, toggleQuickNote]);
}
