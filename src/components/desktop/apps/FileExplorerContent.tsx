import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
  Folder,
  FileText,
  Link,
  File,
  Bot,
  GitBranch,
  Plug,
  Bookmark,
  Users,
  CheckSquare,
  AppWindow,
  Monitor,
  Download,
  Trash2,
  Settings,
} from "lucide-react";
import type {
  FileSystemNode,
  FileExplorerViewMode,
} from "@/lib/desktop-schemas";
import { getFileSystemChildren } from "@/lib/desktop-queries";
import type { ContextMenuItem } from "@/hooks/useContextMenu";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  FileText,
  Link,
  File,
  Bot,
  GitBranch,
  Plug,
  Bookmark,
  Users,
  CheckSquare,
  AppWindow,
  Monitor,
  Download,
  Trash2,
  Settings,
};

function NodeIcon({ node }: { node: FileSystemNode }) {
  const Icon =
    ICON_MAP[node.icon ?? ""] ?? (node.type === "folder" ? Folder : File);
  return (
    <Icon className={`w-4 h-4 ${node.color ?? "text-blue-400"} shrink-0`} />
  );
}

function LargeNodeIcon({ node }: { node: FileSystemNode }) {
  const Icon =
    ICON_MAP[node.icon ?? ""] ?? (node.type === "folder" ? Folder : File);
  return <Icon className={`w-10 h-10 ${node.color ?? "text-blue-400"}`} />;
}

// Inline rename input shared across views
function InlineRenameInput({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: (newName: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Select the name part before the extension (if any)
    const dotIndex = name.lastIndexOf(".");
    input.setSelectionRange(0, dotIndex > 0 ? dotIndex : name.length);
  }, [name]);

  const confirm = () => {
    onConfirm(value);
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          confirm();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={confirm}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className="bg-card border border-primary rounded px-1 py-0 text-[10px] text-foreground outline-none w-full text-center leading-tight"
    />
  );
}

interface FileExplorerContentProps {
  children: FileSystemNode[];
  viewMode: FileExplorerViewMode;
  isLoading: boolean;
  error: string | null;
  isTrash: boolean;
  selectedIds: Set<string>;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onOpen: (node: FileSystemNode) => void;
  onMove?: (nodeId: string, targetFolderId: string) => void;
  onContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  getNodeMenuItems: (node: FileSystemNode) => ContextMenuItem[];
  renamingId: string | null;
  onRenameConfirm: (nodeId: string, newName: string) => void;
  onRenameCancel: () => void;
}

export default function FileExplorerContent({
  children,
  viewMode,
  isLoading,
  error,
  isTrash,
  selectedIds,
  onSelect,
  onOpen,
  onMove,
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: FileExplorerContentProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-red-500">
        {error}
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        {isTrash ? "Trash is empty" : "This folder is empty"}
      </div>
    );
  }

  if (viewMode === "icons") {
    return (
      <IconView
        items={children}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onOpen={onOpen}
        onMove={onMove}
        onContextMenu={onContextMenu}
        getNodeMenuItems={getNodeMenuItems}
        renamingId={renamingId}
        onRenameConfirm={onRenameConfirm}
        onRenameCancel={onRenameCancel}
      />
    );
  }
  if (viewMode === "list") {
    return (
      <ListView
        items={children}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onOpen={onOpen}
        onMove={onMove}
        onContextMenu={onContextMenu}
        getNodeMenuItems={getNodeMenuItems}
        renamingId={renamingId}
        onRenameConfirm={onRenameConfirm}
        onRenameCancel={onRenameCancel}
      />
    );
  }
  return (
    <ColumnView
      items={children}
      selectedIds={selectedIds}
      onSelect={onSelect}
      onOpen={onOpen}
      onMove={onMove}
      onContextMenu={onContextMenu}
      getNodeMenuItems={getNodeMenuItems}
      renamingId={renamingId}
      onRenameConfirm={onRenameConfirm}
      onRenameCancel={onRenameCancel}
    />
  );
}

// ============================================
// ICON VIEW
// ============================================

interface ViewProps {
  items: FileSystemNode[];
  selectedIds: Set<string>;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onOpen: (node: FileSystemNode) => void;
  onMove?: (nodeId: string, targetFolderId: string) => void;
  onContextMenu: (e: React.MouseEvent, items: ContextMenuItem[]) => void;
  getNodeMenuItems: (node: FileSystemNode) => ContextMenuItem[];
  renamingId: string | null;
  onRenameConfirm: (nodeId: string, newName: string) => void;
  onRenameCancel: () => void;
}

function IconView({
  items,
  selectedIds,
  onSelect,
  onOpen,
  onMove,
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
        {items.map((node) => (
          <button
            key={node.id}
            draggable={!renamingId}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", node.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (node.type === "folder") {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverId(node.id);
              }
            }}
            onDragLeave={() => setDragOverId(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverId(null);
              const draggedId = e.dataTransfer.getData("text/plain");
              if (
                draggedId &&
                draggedId !== node.id &&
                node.type === "folder"
              ) {
                onMove?.(draggedId, node.id);
              }
            }}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg text-center
              transition-colors cursor-default
              ${selectedIds.has(node.id) ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted/50"}
              ${dragOverId === node.id ? "ring-2 ring-primary bg-primary/10" : ""}
            `}
            onClick={(e) => onSelect(node.id, e)}
            onDoubleClick={() => {
              if (renamingId !== node.id) onOpen(node);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, getNodeMenuItems(node));
            }}
          >
            <LargeNodeIcon node={node} />
            {renamingId === node.id ? (
              <InlineRenameInput
                name={node.name}
                onConfirm={(newName) => onRenameConfirm(node.id, newName)}
                onCancel={onRenameCancel}
              />
            ) : (
              <span className="text-[10px] text-foreground/80 line-clamp-2 leading-tight w-full">
                {node.name}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// LIST VIEW
// ============================================

function ListView({
  items,
  selectedIds,
  onSelect,
  onOpen,
  onMove,
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card border-b border-border">
          <tr>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">
              Name
            </th>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-24">
              Type
            </th>
            <th className="text-left px-3 py-1.5 font-medium text-muted-foreground w-32">
              Modified
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((node) => (
            <tr
              key={node.id}
              draggable={!renamingId}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", node.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (node.type === "folder") {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDragOverId(node.id);
                }
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverId(null);
                const draggedId = e.dataTransfer.getData("text/plain");
                if (
                  draggedId &&
                  draggedId !== node.id &&
                  node.type === "folder"
                ) {
                  onMove?.(draggedId, node.id);
                }
              }}
              className={`
                border-b border-border/30 cursor-default transition-colors
                ${selectedIds.has(node.id) ? "bg-primary/15" : "hover:bg-muted/30"}
                ${dragOverId === node.id ? "ring-2 ring-primary bg-primary/10" : ""}
              `}
              onClick={(e) => onSelect(node.id, e)}
              onDoubleClick={() => {
                if (renamingId !== node.id) onOpen(node);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu(e, getNodeMenuItems(node));
              }}
            >
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <NodeIcon node={node} />
                  {renamingId === node.id ? (
                    <InlineRenameInput
                      name={node.name}
                      onConfirm={(newName) => onRenameConfirm(node.id, newName)}
                      onCancel={onRenameCancel}
                    />
                  ) : (
                    <span className="truncate">{node.name}</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-1.5 text-muted-foreground capitalize">
                {node.type}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {formatDate(node.updated_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// COLUMN VIEW (Finder-style multi-column)
// ============================================

interface ColumnData {
  parentId: string;
  items: FileSystemNode[];
}

function ColumnView({
  items,
  // selectedIds not used — ColumnView tracks selection internally via selectedPath
  onSelect,
  onOpen,
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When a folder is clicked, load its children into the next column
  const handleColumnSelect = useCallback(
    async (node: FileSystemNode, columnIndex: number) => {
      // Update parent selection state
      onSelect(node.id, {
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
      } as React.MouseEvent);

      // Trim columns after this level
      const newPath = selectedPath.slice(0, columnIndex);
      newPath.push(node.id);
      setSelectedPath(newPath);

      if (node.type === "folder") {
        try {
          const children = await getFileSystemChildren(node.id);
          setColumns((prev) => {
            const trimmed = prev.slice(0, columnIndex);
            trimmed.push({ parentId: node.id, items: children });
            return trimmed;
          });
          // Scroll to right
          requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({
              left: scrollRef.current.scrollWidth,
              behavior: "smooth",
            });
          });
        } catch {
          // silently ignore
        }
      } else {
        // Non-folder: trim sub-columns
        setColumns((prev) => prev.slice(0, columnIndex));
      }
    },
    [onSelect, selectedPath],
  );

  const renderColumn = (columnItems: FileSystemNode[], columnIndex: number) => (
    <div
      key={columnIndex}
      className="min-w-[200px] max-w-[250px] shrink-0 border-r border-border overflow-y-auto"
    >
      {columnItems.map((node) => {
        const isSelected = selectedPath.includes(node.id);
        return (
          <button
            key={node.id}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors
              ${isSelected ? "bg-primary/15" : "hover:bg-muted/30"}
            `}
            onClick={() => handleColumnSelect(node, columnIndex)}
            onDoubleClick={() => {
              if (renamingId !== node.id) onOpen(node);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, getNodeMenuItems(node));
            }}
          >
            <NodeIcon node={node} />
            {renamingId === node.id ? (
              <InlineRenameInput
                name={node.name}
                onConfirm={(newName) => onRenameConfirm(node.id, newName)}
                onCancel={onRenameCancel}
              />
            ) : (
              <>
                <span className="truncate flex-1 text-left">{node.name}</span>
                {node.type === "folder" && (
                  <span className="text-muted-foreground/50">›</span>
                )}
              </>
            )}
          </button>
        );
      })}
      {columnItems.length === 0 && (
        <div className="p-3 text-xs text-muted-foreground text-center">
          Empty
        </div>
      )}
    </div>
  );

  // The selected leaf node for preview
  const selectedLeaf = useMemo(() => {
    if (selectedPath.length === 0) return null;
    const lastId = selectedPath[selectedPath.length - 1];
    // Check all sources for the node
    const allItems = [items, ...columns.map((c) => c.items)];
    for (const list of allItems) {
      const found = list.find((n) => n.id === lastId);
      if (found && found.type !== "folder") return found;
    }
    return null;
  }, [selectedPath, items, columns]);

  return (
    <div ref={scrollRef} className="flex-1 flex overflow-x-auto">
      {/* First column: current directory items */}
      {renderColumn(items, 0)}

      {/* Subsequent columns from folder drill-downs */}
      {columns.map((col, i) => renderColumn(col.items, i + 1))}

      {/* Preview pane for the selected non-folder item */}
      <div className="flex-1 min-w-[200px] flex items-center justify-center text-xs text-muted-foreground p-4">
        {selectedLeaf ? (
          <div className="text-center space-y-2">
            <LargeNodeIcon node={selectedLeaf} />
            <div className="font-medium text-foreground">
              {selectedLeaf.name}
            </div>
            <div className="capitalize">{selectedLeaf.type}</div>
            {selectedLeaf.target_type && (
              <div>Target: {selectedLeaf.target_type}</div>
            )}
          </div>
        ) : (
          "Select an item to preview"
        )}
      </div>
    </div>
  );
}
