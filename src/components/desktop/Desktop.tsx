import { useCallback, useState } from 'react';
import { useWindowManagerContext } from './WindowManager';
import Window from './Window';
import DesktopIcon from './DesktopIcon';
import ContextMenu from './ContextMenu';
import { useContextMenu, type ContextMenuItem } from '@/hooks/useContextMenu';
import { useFileSystem } from '@/hooks/useFileSystem';
import { ROOT_FOLDERS, type FileSystemNode } from '@/lib/desktop-schemas';

const WALLPAPER_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)';

export default function Desktop() {
  const { state, launchApp } = useWindowManagerContext();
  const contextMenu = useContextMenu();
  const fs = useFileSystem(ROOT_FOLDERS.DESKTOP);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  const handleDesktopClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIconId(null);
    }
  }, []);

  const handleDesktopContextMenu = useCallback((e: React.MouseEvent) => {
    const items: ContextMenuItem[] = [
      { id: 'new-folder', label: 'New Folder', onClick: () => fs.createFolder('New Folder') },
      { id: 'sep1', label: '', separator: true },
      { id: 'refresh', label: 'Refresh', shortcut: '⌘R', onClick: () => fs.refresh() },
    ];
    contextMenu.openMenu(e, items);
  }, [contextMenu, fs]);

  const handleIconContextMenu = useCallback((e: React.MouseEvent, node: FileSystemNode) => {
    const items: ContextMenuItem[] = [
      { id: 'open', label: 'Open', onClick: () => handleOpenIcon(node) },
      { id: 'sep1', label: '', separator: true },
      { id: 'rename', label: 'Rename', onClick: () => { /* TODO */ } },
      { id: 'sep2', label: '', separator: true },
      { id: 'trash', label: 'Move to Trash', danger: true, onClick: () => fs.moveToTrash(node.id) },
    ];
    contextMenu.openMenu(e, items);
  }, [contextMenu, fs]);

  const handleOpenIcon = useCallback((node: FileSystemNode) => {
    if (node.type === 'folder') {
      launchApp('file-explorer');
    } else if (node.app_id) {
      launchApp(node.app_id);
    }
  }, [launchApp]);

  const handleIconSelect = useCallback((id: string) => {
    setSelectedIconId(id);
  }, []);

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: WALLPAPER_GRADIENT }}
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* Desktop Icons */}
      {fs.children.map(node => (
        <DesktopIcon
          key={node.id}
          node={node}
          isSelected={selectedIconId === node.id}
          onSelect={handleIconSelect}
          onOpen={handleOpenIcon}
          onContextMenu={handleIconContextMenu}
          onPositionChange={fs.updatePosition}
        />
      ))}

      {/* Windows */}
      {state.windows.map(win => (
        <Window key={win.id} window={win} />
      ))}

      {/* Context Menu */}
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
