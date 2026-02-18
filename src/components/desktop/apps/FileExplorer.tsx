import { useState, useCallback, useRef, useEffect } from "react";
import { useFileSystem } from "@/hooks/useFileSystem";
import { useContextMenu, type ContextMenuItem } from "@/hooks/useContextMenu";
import ContextMenu from "@/components/desktop/ContextMenu";
import FileExplorerToolbar from "./FileExplorerToolbar";
import FileExplorerSidebar from "./FileExplorerSidebar";
import FileExplorerContent from "./FileExplorerContent";
import {
  ROOT_FOLDERS,
  type FileSystemNode,
  type FileExplorerViewMode,
} from "@/lib/desktop-schemas";
import { useWorkspaceContext } from "@/components/desktop/WindowManager";

export default function FileExplorer() {
  const workspace = useWorkspaceContext();
  const fs = useFileSystem(ROOT_FOLDERS.DESKTOP, workspace.userId);
  const contextMenu = useContextMenu();
  const [viewMode, setViewMode] = useState<FileExplorerViewMode>("icons");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTrash = fs.currentParentId === ROOT_FOLDERS.TRASH;

  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      if (isMeta) {
        // Toggle individual selection
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
        lastSelectedIdRef.current = id;
      } else if (isShift && lastSelectedIdRef.current) {
        // Range selection from last selected to clicked
        const items = fs.children;
        const lastIdx = items.findIndex(
          (n) => n.id === lastSelectedIdRef.current,
        );
        const curIdx = items.findIndex((n) => n.id === id);
        if (lastIdx >= 0 && curIdx >= 0) {
          const start = Math.min(lastIdx, curIdx);
          const end = Math.max(lastIdx, curIdx);
          const rangeIds = items.slice(start, end + 1).map((n) => n.id);
          setSelectedIds((prev) => new Set([...prev, ...rangeIds]));
        } else {
          setSelectedIds(new Set([id]));
          lastSelectedIdRef.current = id;
        }
      } else {
        setSelectedIds(new Set([id]));
        lastSelectedIdRef.current = id;
      }
    },
    [fs.children],
  );

  // Delete key trashes all selected items
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size > 0 &&
        !renamingId
      ) {
        e.preventDefault();
        for (const id of selectedIds) {
          if (isTrash) {
            fs.permanentlyDelete(id);
          } else {
            fs.moveToTrash(id);
          }
        }
        setSelectedIds(new Set());
      }
    };
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, renamingId, isTrash, fs]);

  const handleOpen = useCallback(
    (node: FileSystemNode) => {
      if (node.type === "folder") {
        fs.navigateTo(node.id);
        setSelectedIds(new Set());
      }
    },
    [fs],
  );

  const handleSidebarNavigate = useCallback(
    (folderId: string | null) => {
      if (folderId) {
        fs.navigateTo(folderId);
      } else {
        fs.navigateToRoot();
      }
      setSelectedIds(new Set());
    },
    [fs],
  );

  const startRename = useCallback((nodeId: string) => {
    setRenamingId(nodeId);
  }, []);

  const handleRenameConfirm = useCallback(
    async (nodeId: string, newName: string) => {
      setRenamingId(null);
      const node = fs.children.find((n) => n.id === nodeId);
      if (newName.trim() && node && newName.trim() !== node.name) {
        await fs.rename(nodeId, newName.trim());
      }
    },
    [fs],
  );

  const handleRenameCancel = useCallback(() => {
    setRenamingId(null);
  }, []);

  const handleNewFolder = useCallback(async () => {
    const node = await fs.createFolder("Untitled Folder");
    if (node) {
      setSelectedIds(new Set([node.id]));
      setRenamingId(node.id);
    }
  }, [fs]);

  const handleNewShortcut = useCallback(async () => {
    await fs.createFile("Untitled Shortcut", "url", "", "Link");
  }, [fs]);

  const getNodeMenuItems = useCallback(
    (node: FileSystemNode): ContextMenuItem[] => {
      // Determine the effective set of IDs to act on
      const actionIds =
        selectedIds.has(node.id) && selectedIds.size > 1
          ? [...selectedIds]
          : [node.id];
      const multi = actionIds.length > 1;

      if (isTrash) {
        return [
          {
            id: "restore",
            label: multi ? `Put Back (${actionIds.length})` : "Put Back",
            onClick: () => actionIds.forEach((id) => fs.restoreFromTrash(id)),
          },
          { id: "sep1", label: "", separator: true },
          {
            id: "delete-permanent",
            label: multi
              ? `Delete Permanently (${actionIds.length})`
              : "Delete Permanently",
            danger: true,
            onClick: () => actionIds.forEach((id) => fs.permanentlyDelete(id)),
          },
        ];
      }

      const items: ContextMenuItem[] = [];

      if (!multi) {
        items.push({
          id: "open",
          label: "Open",
          onClick: () => handleOpen(node),
        });
        if (node.type === "folder") {
          items.push({
            id: "open-new",
            label: "Open in New Window",
            disabled: true,
          });
        }
        items.push(
          { id: "sep1", label: "", separator: true },
          {
            id: "rename",
            label: "Rename",
            onClick: () => startRename(node.id),
          },
        );
      }

      items.push(
        { id: "sep2", label: "", separator: true },
        {
          id: "trash",
          label: multi
            ? `Move to Trash (${actionIds.length})`
            : "Move to Trash",
          shortcut: "⌘⌫",
          danger: true,
          onClick: () => {
            actionIds.forEach((id) => fs.moveToTrash(id));
            setSelectedIds(new Set());
          },
        },
      );

      return items;
    },
    [isTrash, fs, handleOpen, startRename, selectedIds],
  );

  const handleMove = useCallback(
    (nodeId: string, targetFolderId: string) => {
      fs.move(nodeId, targetFolderId);
      setSelectedIds(new Set());
    },
    [fs],
  );

  const handleContentContextMenu = useCallback(
    (e: React.MouseEvent, items: ContextMenuItem[]) => {
      contextMenu.openMenu(e, items);
    },
    [contextMenu],
  );

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget) return;
      e.preventDefault();

      const items: ContextMenuItem[] = [
        {
          id: "new-folder",
          label: "New Folder",
          shortcut: "⇧⌘N",
          onClick: handleNewFolder,
        },
        {
          id: "new-shortcut",
          label: "New Shortcut",
          onClick: handleNewShortcut,
        },
      ];

      if (isTrash) {
        items.push(
          { id: "sep1", label: "", separator: true },
          {
            id: "empty-trash",
            label: "Empty Trash",
            danger: true,
            onClick: () => fs.emptyTrash(),
          },
        );
      }

      contextMenu.openMenu(e, items);
    },
    [isTrash, handleNewFolder, handleNewShortcut, fs, contextMenu],
  );

  const trashCount = fs.trashCount;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="flex flex-col h-full -m-8 bg-background outline-none"
    >
      <FileExplorerToolbar
        currentPath={fs.currentPath}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigateBack={fs.navigateBack}
        onNavigateForward={fs.navigateForward}
        onNavigateTo={(id) => fs.navigateTo(id)}
        onNavigateToRoot={fs.navigateToRoot}
        onSearch={fs.search}
        canGoBack={fs.canGoBack}
        canGoForward={fs.canGoForward}
      />
      <div className="flex flex-1 min-h-0">
        <FileExplorerSidebar
          currentFolderId={fs.currentParentId}
          onNavigate={handleSidebarNavigate}
          trashCount={trashCount}
        />
        <div
          className="flex flex-col flex-1 min-w-0"
          onContextMenu={handleBackgroundContextMenu}
        >
          <FileExplorerContent
            children={fs.children}
            viewMode={viewMode}
            isLoading={fs.isLoading}
            error={fs.error}
            isTrash={isTrash}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onOpen={handleOpen}
            onMove={handleMove}
            onContextMenu={handleContentContextMenu}
            getNodeMenuItems={getNodeMenuItems}
            renamingId={renamingId}
            onRenameConfirm={handleRenameConfirm}
            onRenameCancel={handleRenameCancel}
          />
        </div>
      </div>
      {contextMenu.isOpen && (
        <ContextMenu
          items={contextMenu.menuItems}
          position={contextMenu.position}
          onClose={contextMenu.closeMenu}
        />
      )}
    </div>
  );
}
