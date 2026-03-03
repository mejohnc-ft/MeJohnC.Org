import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import {
  getAllWorkspaces,
  createWorkspace,
  switchWorkspace,
  renameWorkspace,
  deleteWorkspace,
} from "@/lib/desktop-queries";
import type { DesktopWorkspace } from "@/lib/desktop-schemas";

interface VirtualSpacesProps {
  userId: string;
  onSwitch: () => void;
}

export default function VirtualSpaces({
  userId,
  onSwitch,
}: VirtualSpacesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<DesktopWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.is_active);

  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await getAllWorkspaces(userId);
      setWorkspaces(data);
    } catch (err) {
      console.error("[VirtualSpaces] Failed to load:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) loadWorkspaces();
  }, [isOpen, loadWorkspaces]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setCreating(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleSwitch = async (wsId: string) => {
    if (activeWorkspace?.id === wsId) return;
    setLoading(true);
    try {
      await switchWorkspace(userId, wsId);
      setIsOpen(false);
      onSwitch(); // Triggers page reload to apply new workspace
    } catch (err) {
      console.error("[VirtualSpaces] Switch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createWorkspace(userId, newName.trim());
      setNewName("");
      setCreating(false);
      await loadWorkspaces();
    } catch (err) {
      console.error("[VirtualSpaces] Create failed:", err);
    }
  };

  const handleRename = async (wsId: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await renameWorkspace(wsId, editName.trim());
      setEditingId(null);
      await loadWorkspaces();
    } catch (err) {
      console.error("[VirtualSpaces] Rename failed:", err);
    }
  };

  const handleDelete = async (wsId: string) => {
    try {
      await deleteWorkspace(wsId);
      await loadWorkspaces();
    } catch (err) {
      console.error("[VirtualSpaces] Delete failed:", err);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted"
        title="Virtual Spaces"
      >
        {activeWorkspace?.name || "Default"}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-xl py-1 z-[60]"
          >
            <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Spaces
            </div>

            {loading && (
              <div className="px-3 py-2 flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {workspaces.map((ws) => (
              <div key={ws.id} className="group">
                {editingId === ws.id ? (
                  <div className="flex items-center gap-1 px-2 py-1">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(ws.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 h-6 px-1.5 text-xs bg-muted border border-border rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(ws.id)}
                      className="p-0.5 text-green-400 hover:text-green-300"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSwitch(ws.id)}
                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {ws.is_active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                      <span className={ws.is_active ? "font-medium" : ""}>
                        {ws.name}
                      </span>
                    </span>

                    <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(ws.id);
                          setEditName(ws.name);
                        }}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {!ws.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ws.id);
                          }}
                          className="p-0.5 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </button>
                )}
              </div>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              {creating ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") setCreating(false);
                    }}
                    placeholder="Space name..."
                    className="flex-1 h-6 px-1.5 text-xs bg-muted border border-border rounded"
                    autoFocus
                  />
                  <button
                    onClick={handleCreate}
                    className="p-0.5 text-green-400 hover:text-green-300"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3" /> New Space
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
