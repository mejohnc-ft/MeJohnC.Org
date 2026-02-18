import { useReducer, useCallback, useMemo } from "react";

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  /** Stored position/size before maximize for restore */
  preMaximize?: { x: number; y: number; width: number; height: number };
}

export interface WindowManagerState {
  windows: WindowState[];
  nextZIndex: number;
  focusedWindowId: string | null;
}

type WindowAction =
  | {
      type: "OPEN_WINDOW";
      payload: {
        appId: string;
        title: string;
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }
  | { type: "CLOSE_WINDOW"; payload: { id: string } }
  | { type: "FOCUS_WINDOW"; payload: { id: string } }
  | { type: "MINIMIZE_WINDOW"; payload: { id: string } }
  | {
      type: "MAXIMIZE_WINDOW";
      payload: { id: string };
      bounds: { width: number; height: number; topOffset: number };
    }
  | { type: "RESTORE_WINDOW"; payload: { id: string } }
  | { type: "MOVE_WINDOW"; payload: { id: string; x: number; y: number } }
  | {
      type: "RESIZE_WINDOW";
      payload: {
        id: string;
        width: number;
        height: number;
        x?: number;
        y?: number;
      };
    }
  | {
      type: "RESTORE_STATE";
      payload: { windows: WindowState[]; nextZIndex: number };
    };

let windowIdCounter = 0;

function generateWindowId(appId: string): string {
  return `${appId}-${++windowIdCounter}-${Date.now()}`;
}

/** Compact z-indices when they grow too large */
function compactZIndices(state: WindowManagerState): WindowManagerState {
  if (state.nextZIndex < 1000) return state;
  const sorted = [...state.windows].sort((a, b) => a.zIndex - b.zIndex);
  const windows = sorted.map((w, i) => ({ ...w, zIndex: 100 + i }));
  return { ...state, windows, nextZIndex: 100 + windows.length };
}

function windowReducer(
  state: WindowManagerState,
  action: WindowAction,
): WindowManagerState {
  switch (action.type) {
    case "OPEN_WINDOW": {
      const { appId, title, x, y, width, height } = action.payload;
      const newWindow: WindowState = {
        id: generateWindowId(appId),
        appId,
        title,
        x,
        y,
        width,
        height,
        zIndex: state.nextZIndex,
        minimized: false,
        maximized: false,
      };
      return {
        ...state,
        windows: [...state.windows, newWindow],
        nextZIndex: state.nextZIndex + 1,
        focusedWindowId: newWindow.id,
      };
    }

    case "CLOSE_WINDOW": {
      const remaining = state.windows.filter((w) => w.id !== action.payload.id);
      const wasFocused = state.focusedWindowId === action.payload.id;
      // Focus the topmost remaining window
      const newFocused = wasFocused
        ? (remaining
            .filter((w) => !w.minimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null)
        : state.focusedWindowId;
      return { ...state, windows: remaining, focusedWindowId: newFocused };
    }

    case "FOCUS_WINDOW": {
      const { id } = action.payload;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id
            ? { ...w, zIndex: state.nextZIndex, minimized: false }
            : w,
        ),
        nextZIndex: state.nextZIndex + 1,
        focusedWindowId: id,
      };
    }

    case "MINIMIZE_WINDOW": {
      const { id } = action.payload;
      const newFocused =
        state.focusedWindowId === id
          ? (state.windows
              .filter((w) => w.id !== id && !w.minimized)
              .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null)
          : state.focusedWindowId;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, minimized: true } : w,
        ),
        focusedWindowId: newFocused,
      };
    }

    case "MAXIMIZE_WINDOW": {
      const { id } = action.payload;
      const { width, height, topOffset } = action.bounds;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                preMaximize: w.maximized
                  ? w.preMaximize
                  : { x: w.x, y: w.y, width: w.width, height: w.height },
                x: 0,
                y: topOffset,
                width,
                height: height - topOffset,
                maximized: true,
                zIndex: state.nextZIndex,
              }
            : w,
        ),
        nextZIndex: state.nextZIndex + 1,
        focusedWindowId: id,
      };
    }

    case "RESTORE_WINDOW": {
      const { id } = action.payload;
      return {
        ...state,
        windows: state.windows.map((w) => {
          if (w.id !== id) return w;
          if (w.maximized && w.preMaximize) {
            return {
              ...w,
              ...w.preMaximize,
              maximized: false,
              preMaximize: undefined,
              zIndex: state.nextZIndex,
            };
          }
          return { ...w, minimized: false, zIndex: state.nextZIndex };
        }),
        nextZIndex: state.nextZIndex + 1,
        focusedWindowId: id,
      };
    }

    case "MOVE_WINDOW": {
      const { id, x, y } = action.payload;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id ? { ...w, x, y, maximized: false } : w,
        ),
      };
    }

    case "RESIZE_WINDOW": {
      const { id, width, height, x, y } = action.payload;
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === id
            ? {
                ...w,
                width,
                height,
                ...(x !== undefined && { x }),
                ...(y !== undefined && { y }),
                maximized: false,
              }
            : w,
        ),
      };
    }

    case "RESTORE_STATE": {
      return {
        ...state,
        windows: action.payload.windows,
        nextZIndex: action.payload.nextZIndex,
        focusedWindowId:
          action.payload.windows
            .filter((w) => !w.minimized)
            .sort((a, b) => b.zIndex - a.zIndex)[0]?.id ?? null,
      };
    }

    default:
      return state;
  }
}

function windowReducerWithCompaction(
  state: WindowManagerState,
  action: WindowAction,
): WindowManagerState {
  return compactZIndices(windowReducer(state, action));
}

const initialState: WindowManagerState = {
  windows: [],
  nextZIndex: 100,
  focusedWindowId: null,
};

export function useWindowManager() {
  const [state, dispatch] = useReducer(
    windowReducerWithCompaction,
    initialState,
  );

  const openWindow = useCallback(
    (
      appId: string,
      title: string,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      dispatch({
        type: "OPEN_WINDOW",
        payload: { appId, title, x, y, width, height },
      });
    },
    [],
  );

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: "CLOSE_WINDOW", payload: { id } });
  }, []);

  const focusWindow = useCallback((id: string) => {
    dispatch({ type: "FOCUS_WINDOW", payload: { id } });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: "MINIMIZE_WINDOW", payload: { id } });
  }, []);

  const maximizeWindow = useCallback(
    (
      id: string,
      bounds: { width: number; height: number; topOffset: number },
    ) => {
      dispatch({ type: "MAXIMIZE_WINDOW", payload: { id }, bounds });
    },
    [],
  );

  const restoreWindow = useCallback((id: string) => {
    dispatch({ type: "RESTORE_WINDOW", payload: { id } });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: "MOVE_WINDOW", payload: { id, x, y } });
  }, []);

  const resizeWindow = useCallback(
    (id: string, width: number, height: number, x?: number, y?: number) => {
      dispatch({ type: "RESIZE_WINDOW", payload: { id, width, height, x, y } });
    },
    [],
  );

  const restoreState = useCallback(
    (windows: WindowState[], nextZIndex: number) => {
      dispatch({ type: "RESTORE_STATE", payload: { windows, nextZIndex } });
    },
    [],
  );

  /** Check if a singleton app is already open, return its window if so */
  const findWindowByAppId = useCallback(
    (appId: string): WindowState | undefined => {
      return state.windows.find((w) => w.appId === appId);
    },
    [state.windows],
  );

  const actions = useMemo(
    () => ({
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      moveWindow,
      resizeWindow,
      restoreState,
      findWindowByAppId,
    }),
    [
      openWindow,
      closeWindow,
      focusWindow,
      minimizeWindow,
      maximizeWindow,
      restoreWindow,
      moveWindow,
      resizeWindow,
      restoreState,
      findWindowByAppId,
    ],
  );

  return { state, ...actions };
}
