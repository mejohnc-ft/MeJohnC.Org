import { useCallback, useState } from "react";
import { useWindowManagerContext, useWorkspaceContext } from "./WindowManager";
import Window from "./Window";
import DesktopIcon from "./DesktopIcon";
import ContextMenu from "./ContextMenu";
import { useContextMenu, type ContextMenuItem } from "@/hooks/useContextMenu";
import { useFileSystem } from "@/hooks/useFileSystem";
import { ROOT_FOLDERS, type FileSystemNode } from "@/lib/desktop-schemas";
import { Loader2 } from "lucide-react";

export default function Desktop() {
  const { state, launchApp } = useWindowManagerContext();
  const workspace = useWorkspaceContext();
  const contextMenu = useContextMenu();
  const fs = useFileSystem(ROOT_FOLDERS.DESKTOP, workspace.userId);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  const handleDesktopClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedIconId(null);
    }
  }, []);

  const handleDesktopContextMenu = useCallback(
    (e: React.MouseEvent) => {
      const items: ContextMenuItem[] = [
        {
          id: "new-folder",
          label: "New Folder",
          onClick: () => fs.createFolder("New Folder"),
        },
        { id: "sep1", label: "", separator: true },
        {
          id: "change-wallpaper",
          label: "Change Wallpaper...",
          onClick: () => launchApp("wallpaper-picker"),
        },
        { id: "sep2", label: "", separator: true },
        {
          id: "refresh",
          label: "Refresh",
          shortcut: "⌘R",
          onClick: () => fs.refresh(),
        },
      ];
      contextMenu.openMenu(e, items);
    },
    [contextMenu, fs, launchApp],
  );

  const handleIconContextMenu = useCallback(
    (e: React.MouseEvent, node: FileSystemNode) => {
      const items: ContextMenuItem[] = [
        { id: "open", label: "Open", onClick: () => handleOpenIcon(node) },
        { id: "sep1", label: "", separator: true },
        {
          id: "trash",
          label: "Move to Trash",
          danger: true,
          onClick: () => fs.moveToTrash(node.id),
        },
      ];
      contextMenu.openMenu(e, items);
    },
    [contextMenu, fs],
  );

  const handleOpenIcon = useCallback(
    (node: FileSystemNode) => {
      if (node.type === "folder") {
        launchApp("file-explorer");
      } else if (node.target_type === "app" && node.target_id) {
        launchApp(node.target_id);
      }
    },
    [launchApp],
  );

  const handleIconSelect = useCallback((id: string) => {
    setSelectedIconId(id);
  }, []);

  if (workspace.isLoading) {
    return (
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        style={{ background: workspace.wallpaper }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 relative overflow-hidden"
      style={{ background: workspace.wallpaper }}
      onClick={handleDesktopClick}
      onContextMenu={handleDesktopContextMenu}
    >
      {/* Desktop Icons */}
      {fs.children.map((node) => (
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
      {state.windows.map((win) => (
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
