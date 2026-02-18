import { useState, useCallback, useEffect, useRef } from "react";
import { ROOT_FOLDERS, type FileSystemNode } from "@/lib/desktop-schemas";
import {
  getFileSystemChildren,
  createFileSystemNode,
  moveNode as moveNodeQuery,
  renameNode as renameNodeQuery,
  moveToTrash as moveToTrashQuery,
  restoreFromTrash as restoreFromTrashQuery,
  permanentlyDelete as permanentlyDeleteQuery,
  emptyTrash as emptyTrashQuery,
  searchFileSystem,
  getNodePath,
  getTrashedCount,
  updateNodePosition,
} from "@/lib/desktop-queries";

export interface BreadcrumbItem {
  id: string;
  name: string;
}

interface UseFileSystemState {
  currentParentId: string | null;
  currentPath: BreadcrumbItem[];
  children: FileSystemNode[];
  isLoading: boolean;
  error: string | null;
  trashCount: number;
}

const ROOT_FOLDER_ENTRIES: { id: string; name: string }[] = [
  { id: ROOT_FOLDERS.DESKTOP, name: "Desktop" },
  { id: ROOT_FOLDERS.APPLICATIONS, name: "Applications" },
  { id: ROOT_FOLDERS.DOCUMENTS, name: "Documents" },
  { id: ROOT_FOLDERS.DOWNLOADS, name: "Downloads" },
  { id: ROOT_FOLDERS.TRASH, name: "Trash" },
];

export function useFileSystem(
  initialParentId: string | null = null,
  ownerId?: string,
) {
  const [state, setState] = useState<UseFileSystemState>({
    currentParentId: initialParentId,
    currentPath: [],
    children: [],
    isLoading: true,
    error: null,
    trashCount: 0,
  });
  const mountedRef = useRef(true);

  // Navigation history for forward/back
  const historyRef = useRef<(string | null)[]>([initialParentId]);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchChildren = useCallback(async (parentId: string | null) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [children, path, trashCount] = await Promise.all([
        getFileSystemChildren(parentId),
        parentId ? getNodePath(parentId) : Promise.resolve([]),
        getTrashedCount(),
      ]);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        children,
        currentParentId: parentId,
        currentPath: path.map((n) => ({ id: n.id, name: n.name })),
        isLoading: false,
        trashCount,
      }));
    } catch (err) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load files",
      }));
    }
  }, []);

  // Fetch on mount and when parent changes
  useEffect(() => {
    fetchChildren(state.currentParentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushHistory = useCallback((folderId: string | null) => {
    // Truncate any forward history
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push(folderId);
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const navigateTo = useCallback(
    async (folderId: string) => {
      pushHistory(folderId);
      await fetchChildren(folderId);
    },
    [fetchChildren, pushHistory],
  );

  const navigateUp = useCallback(async () => {
    let target: string | null;
    if (state.currentPath.length > 1) {
      target = state.currentPath[state.currentPath.length - 2].id;
    } else {
      target = null;
    }
    pushHistory(target);
    await fetchChildren(target);
  }, [state.currentPath, fetchChildren, pushHistory]);

  const navigateToRoot = useCallback(async () => {
    pushHistory(null);
    await fetchChildren(null);
  }, [fetchChildren, pushHistory]);

  const navigateBack = useCallback(async () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    await fetchChildren(historyRef.current[historyIndexRef.current]);
  }, [fetchChildren]);

  const navigateForward = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    await fetchChildren(historyRef.current[historyIndexRef.current]);
  }, [fetchChildren]);

  const createFolder = useCallback(
    async (name: string): Promise<FileSystemNode | null> => {
      try {
        const node = await createFileSystemNode({
          parent_id: state.currentParentId,
          name,
          type: "folder",
          icon: "Folder",
        });
        await fetchChildren(state.currentParentId);
        return node;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to create folder",
        }));
        return null;
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const createFile = useCallback(
    async (
      name: string,
      targetType?: string,
      targetId?: string,
      icon?: string,
    ) => {
      try {
        await createFileSystemNode({
          parent_id: state.currentParentId,
          name,
          type: targetType ? "shortcut" : "file",
          target_type: targetType ?? null,
          target_id: targetId ?? null,
          icon: icon ?? null,
        });
        await fetchChildren(state.currentParentId);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to create file",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const rename = useCallback(
    async (id: string, newName: string) => {
      // Optimistic: update name locally
      setState((prev) => ({
        ...prev,
        children: prev.children.map((c) =>
          c.id === id ? { ...c, name: newName } : c,
        ),
      }));
      try {
        await renameNodeQuery(id, newName);
      } catch (err) {
        await fetchChildren(state.currentParentId);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to rename",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const move = useCallback(
    async (id: string, newParentId: string | null) => {
      // Optimistic: remove from current view
      setState((prev) => ({
        ...prev,
        children: prev.children.filter((c) => c.id !== id),
      }));
      try {
        await moveNodeQuery(id, newParentId);
      } catch (err) {
        await fetchChildren(state.currentParentId);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to move",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const moveToTrash = useCallback(
    async (id: string) => {
      // Optimistic: remove from view and bump trash count
      setState((prev) => ({
        ...prev,
        children: prev.children.filter((c) => c.id !== id),
        trashCount: prev.trashCount + 1,
      }));
      try {
        await moveToTrashQuery(id);
      } catch (err) {
        await fetchChildren(state.currentParentId);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to move to trash",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const restoreFromTrash = useCallback(
    async (id: string) => {
      // Optimistic: remove from trash view and decrement count
      setState((prev) => ({
        ...prev,
        children: prev.children.filter((c) => c.id !== id),
        trashCount: Math.max(0, prev.trashCount - 1),
      }));
      try {
        await restoreFromTrashQuery(id);
      } catch (err) {
        await fetchChildren(state.currentParentId);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to restore",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const permanentlyDelete = useCallback(
    async (id: string) => {
      // Optimistic: remove from view and decrement trash count
      setState((prev) => ({
        ...prev,
        children: prev.children.filter((c) => c.id !== id),
        trashCount: Math.max(0, prev.trashCount - 1),
      }));
      try {
        await permanentlyDeleteQuery(id);
      } catch (err) {
        await fetchChildren(state.currentParentId);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Failed to delete",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const emptyTrash = useCallback(async () => {
    if (!ownerId) return;
    // Optimistic: clear all children and reset trash count
    setState((prev) => ({
      ...prev,
      children: [],
      trashCount: 0,
    }));
    try {
      await emptyTrashQuery(ownerId);
    } catch (err) {
      await fetchChildren(state.currentParentId);
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to empty trash",
      }));
    }
  }, [state.currentParentId, fetchChildren, ownerId]);

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        await fetchChildren(state.currentParentId);
        return;
      }
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const results = await searchFileSystem(query, ownerId);
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          children: results,
          isLoading: false,
        }));
      } catch (err) {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Search failed",
        }));
      }
    },
    [state.currentParentId, fetchChildren],
  );

  const refresh = useCallback(async () => {
    await fetchChildren(state.currentParentId);
  }, [state.currentParentId, fetchChildren]);

  const updatePosition = useCallback(
    async (
      id: string,
      position: { x: number; y: number; gridCol?: number; gridRow?: number },
    ) => {
      try {
        await updateNodePosition(id, position);
        // Optimistic update: update local state without refetching
        setState((prev) => ({
          ...prev,
          children: prev.children.map((c) =>
            c.id === id ? { ...c, position } : c,
          ),
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to update position",
        }));
      }
    },
    [],
  );

  const canGoBack = historyIndexRef.current > 0;
  const canGoForward = historyIndexRef.current < historyRef.current.length - 1;

  return {
    ...state,
    rootFolders: ROOT_FOLDER_ENTRIES,
    navigateTo,
    navigateUp,
    navigateToRoot,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward,
    createFolder,
    createFile,
    rename,
    move,
    moveToTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    search,
    refresh,
    updatePosition,
  };
}
