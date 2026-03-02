import { useState, useCallback, useRef } from "react";

const MAX_STACK_SIZE = 50;
const UNDO_TOAST_DURATION_MS = 4000;

export interface UndoAction {
  id: string;
  label: string;
  undo: () => void;
  timestamp: number;
}

interface UndoToast {
  label: string;
  actionId: string;
}

interface UseUndoStackReturn {
  /** Push an undoable action onto the stack */
  push: (label: string, undoFn: () => void) => void;
  /** Pop and execute the most recent undo */
  undo: () => void;
  /** Whether there's anything to undo */
  canUndo: boolean;
  /** Current undo toast (if any) */
  toast: UndoToast | null;
  /** Dismiss the current toast */
  dismissToast: () => void;
}

/**
 * Global undo stack for destructive desktop actions.
 * Supports Cmd+Z to undo the last action and shows a toast with an Undo button.
 */
export function useUndoStack(): UseUndoStackReturn {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((label: string, actionId: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ label, actionId });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, UNDO_TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  }, []);

  const push = useCallback(
    (label: string, undoFn: () => void) => {
      const id = crypto.randomUUID();
      setStack((prev) => {
        const next = [
          { id, label, undo: undoFn, timestamp: Date.now() },
          ...prev,
        ];
        return next.slice(0, MAX_STACK_SIZE);
      });
      showToast(label, id);
    },
    [showToast],
  );

  const undo = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const [top, ...rest] = prev;
      top.undo();
      return rest;
    });
    dismissToast();
  }, [dismissToast]);

  return {
    push,
    undo,
    canUndo: stack.length > 0,
    toast,
    dismissToast,
  };
}
