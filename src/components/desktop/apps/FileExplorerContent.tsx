import { useCallback, useState, useRef, useEffect } from "react";
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
  onSelect: (id: string) => void;
  onOpen: (node: FileSystemNode) => void;
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
  onSelect: (id: string) => void;
  onOpen: (node: FileSystemNode) => void;
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
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
        {items.map((node) => (
          <button
            key={node.id}
            className={`
              flex flex-col items-center gap-1 p-2 rounded-lg text-center
              transition-colors cursor-default
              ${selectedIds.has(node.id) ? "bg-primary/15 ring-1 ring-primary/30" : "hover:bg-muted/50"}
            `}
            onClick={() => onSelect(node.id)}
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
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
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
              className={`
                border-b border-border/30 cursor-default transition-colors
                ${selectedIds.has(node.id) ? "bg-primary/15" : "hover:bg-muted/30"}
              `}
              onClick={() => onSelect(node.id)}
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
// COLUMN VIEW (simplified)
// ============================================

function ColumnView({
  items,
  selectedIds,
  onSelect,
  onOpen,
  onContextMenu,
  getNodeMenuItems,
  renamingId,
  onRenameConfirm,
  onRenameCancel,
}: ViewProps) {
  return (
    <div className="flex-1 flex overflow-x-auto">
      <div className="min-w-[200px] max-w-[250px] border-r border-border overflow-y-auto">
        {items.map((node) => (
          <button
            key={node.id}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors
              ${selectedIds.has(node.id) ? "bg-primary/15" : "hover:bg-muted/30"}
            `}
            onClick={() => onSelect(node.id)}
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
        ))}
      </div>
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        Select an item to preview
      </div>
    </div>
  );
}
