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
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchChildren = useCallback(async (parentId: string | null) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const [children, path] = await Promise.all([
        getFileSystemChildren(parentId),
        parentId ? getNodePath(parentId) : Promise.resolve([]),
      ]);
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        children,
        currentParentId: parentId,
        currentPath: path.map((n) => ({ id: n.id, name: n.name })),
        isLoading: false,
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

  const navigateTo = useCallback(
    async (folderId: string) => {
      await fetchChildren(folderId);
    },
    [fetchChildren],
  );

  const navigateUp = useCallback(async () => {
    if (state.currentPath.length > 1) {
      const parentIndex = state.currentPath.length - 2;
      await fetchChildren(state.currentPath[parentIndex].id);
    } else {
      await fetchChildren(null);
    }
  }, [state.currentPath, fetchChildren]);

  const navigateToRoot = useCallback(async () => {
    await fetchChildren(null);
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
      try {
        await renameNodeQuery(id, newName);
        await fetchChildren(state.currentParentId);
      } catch (err) {
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
      try {
        await moveNodeQuery(id, newParentId);
        await fetchChildren(state.currentParentId);
      } catch (err) {
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
      try {
        await moveToTrashQuery(id);
        await fetchChildren(state.currentParentId);
      } catch (err) {
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
      try {
        await restoreFromTrashQuery(id);
        await fetchChildren(state.currentParentId);
      } catch (err) {
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
      try {
        await permanentlyDeleteQuery(id);
        await fetchChildren(state.currentParentId);
      } catch (err) {
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
    try {
      await emptyTrashQuery(ownerId);
      await fetchChildren(state.currentParentId);
    } catch (err) {
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

  return {
    ...state,
    rootFolders: ROOT_FOLDER_ENTRIES,
    navigateTo,
    navigateUp,
    navigateToRoot,
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
