import { useState, useCallback, useMemo } from 'react';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useContextMenu, type ContextMenuItem } from '@/hooks/useContextMenu';
import ContextMenu from '@/components/desktop/ContextMenu';
import FileExplorerToolbar from './FileExplorerToolbar';
import FileExplorerSidebar from './FileExplorerSidebar';
import FileExplorerContent from './FileExplorerContent';
import { ROOT_FOLDERS, type FileSystemNode, type FileExplorerViewMode } from '@/lib/desktop-schemas';

export default function FileExplorer() {
  const fs = useFileSystem(ROOT_FOLDERS.DESKTOP);
  const contextMenu = useContextMenu();
  const [viewMode, setViewMode] = useState<FileExplorerViewMode>('icons');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isTrash = fs.currentParentId === ROOT_FOLDERS.TRASH;

  const handleSelect = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const handleOpen = useCallback((node: FileSystemNode) => {
    if (node.type === 'folder') {
      fs.navigateTo(node.id);
      setSelectedIds(new Set());
    }
    // For shortcuts/files, a future phase can open the target
  }, [fs]);

  const handleSidebarNavigate = useCallback((folderId: string | null) => {
    if (folderId) {
      fs.navigateTo(folderId);
    } else {
      fs.navigateToRoot();
    }
    setSelectedIds(new Set());
  }, [fs]);

  const handleNewFolder = useCallback(async () => {
    const name = prompt('Folder name:');
    if (name?.trim()) {
      await fs.createFolder(name.trim());
    }
  }, [fs]);

  const handleNewShortcut = useCallback(async () => {
    const name = prompt('Shortcut name:');
    if (name?.trim()) {
      await fs.createFile(name.trim(), 'url', '', 'Link');
    }
  }, [fs]);

  const getNodeMenuItems = useCallback((node: FileSystemNode): ContextMenuItem[] => {
    if (isTrash) {
      return [
        { id: 'restore', label: 'Put Back', onClick: () => fs.restoreFromTrash(node.id) },
        { id: 'sep1', label: '', separator: true },
        { id: 'delete-permanent', label: 'Delete Permanently', danger: true, onClick: () => fs.permanentlyDelete(node.id) },
      ];
    }

    const items: ContextMenuItem[] = [
      { id: 'open', label: 'Open', onClick: () => handleOpen(node) },
    ];

    if (node.type === 'folder') {
      items.push({ id: 'open-new', label: 'Open in New Window', disabled: true });
    }

    items.push(
      { id: 'sep1', label: '', separator: true },
      { id: 'rename', label: 'Rename', onClick: async () => {
        const newName = prompt('New name:', node.name);
        if (newName?.trim() && newName.trim() !== node.name) {
          await fs.rename(node.id, newName.trim());
        }
      }},
      { id: 'sep2', label: '', separator: true },
      { id: 'trash', label: 'Move to Trash', shortcut: '⌘⌫', danger: true, onClick: () => fs.moveToTrash(node.id) },
    );

    return items;
  }, [isTrash, fs, handleOpen]);

  const handleContentContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    contextMenu.openMenu(e, items);
  }, [contextMenu]);

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    // Only trigger on the content area background
    if (e.target !== e.currentTarget) return;
    e.preventDefault();

    const items: ContextMenuItem[] = [
      { id: 'new-folder', label: 'New Folder', shortcut: '⇧⌘N', onClick: handleNewFolder },
      { id: 'new-shortcut', label: 'New Shortcut', onClick: handleNewShortcut },
    ];

    if (isTrash) {
      items.push(
        { id: 'sep1', label: '', separator: true },
        { id: 'empty-trash', label: 'Empty Trash', danger: true, onClick: () => fs.emptyTrash() },
      );
    }

    contextMenu.openMenu(e, items);
  }, [isTrash, handleNewFolder, handleNewShortcut, fs, contextMenu]);

  // Count trashed items for sidebar badge
  const trashCount = useMemo(() => {
    if (isTrash) return fs.children.length;
    return 0;
  }, [isTrash, fs.children.length]);

  return (
    <div className="flex flex-col h-full -m-8 bg-background">
      <FileExplorerToolbar
        currentPath={fs.currentPath}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigateBack={fs.navigateUp}
        onNavigateForward={() => {}} // Forward nav not implemented yet
        onNavigateTo={(id) => fs.navigateTo(id)}
        onNavigateToRoot={fs.navigateToRoot}
        onSearch={fs.search}
        canGoBack={fs.currentPath.length > 0}
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
            onContextMenu={handleContentContextMenu}
            getNodeMenuItems={getNodeMenuItems}
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
