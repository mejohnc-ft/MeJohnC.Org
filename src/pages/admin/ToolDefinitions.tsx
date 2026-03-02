import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hammer,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSEO } from "@/lib/seo";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import type { ToolDefinition } from "@/lib/schemas";

// ============================================
// MODAL COMPONENT
// ============================================

interface ToolModalProps {
  tool: ToolDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ToolDefinition>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

function ToolModal({
  tool,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: ToolModalProps) {
  const isEdit = !!tool;
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [capabilityName, setCapabilityName] = useState("");
  const [actionName, setActionName] = useState("");
  const [schemaText, setSchemaText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [schemaError, setSchemaError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDisplayName(tool.display_name);
      setDescription(tool.description);
      setCapabilityName(tool.capability_name);
      setActionName(tool.action_name);
      setSchemaText(JSON.stringify(tool.input_schema, null, 2));
      setIsActive(tool.is_active);
    } else {
      setName("");
      setDisplayName("");
      setDescription("");
      setCapabilityName("");
      setActionName("");
      setSchemaText(
        '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
      );
      setIsActive(true);
    }
    setSchemaError("");
    setConfirmDelete(false);
  }, [tool, isOpen]);

  const validateSchema = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        setSchemaError("Schema must be a JSON object");
        return false;
      }
      setSchemaError("");
      return true;
    } catch {
      setSchemaError("Invalid JSON");
      return false;
    }
  };

  const handleSchemaChange = (val: string) => {
    setSchemaText(val);
    if (val.trim()) validateSchema(val);
    else setSchemaError("");
  };

  const handleSave = async () => {
    if (!name.trim() || !displayName.trim() || !description.trim()) return;
    if (!validateSchema(schemaText)) return;

    setSaving(true);
    try {
      const data: Partial<ToolDefinition> = {
        name: name.trim(),
        display_name: displayName.trim(),
        description: description.trim(),
        capability_name: capabilityName.trim(),
        action_name: actionName.trim(),
        input_schema: JSON.parse(schemaText),
        is_active: isActive,
      };
      if (isEdit && tool) {
        data.id = tool.id;
      }
      await onSave(data);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tool || !onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(tool.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-lg mb-8"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">
              {isEdit ? "Edit Tool Definition" : "New Tool Definition"}
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Name (unique identifier)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="search_contacts"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Search Contacts"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this tool does for the AI agent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Capability
                </label>
                <Input
                  value={capabilityName}
                  onChange={(e) => setCapabilityName(e.target.value)}
                  placeholder="crm"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Action Name
                </label>
                <Input
                  value={actionName}
                  onChange={(e) => setActionName(e.target.value)}
                  placeholder="crm.create_contact"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">
                  Input Schema (JSON)
                </label>
                {schemaError && (
                  <span className="text-xs text-red-500">{schemaError}</span>
                )}
              </div>
              <textarea
                value={schemaText}
                onChange={(e) => handleSchemaChange(e.target.value)}
                rows={10}
                className={`w-full rounded-md border bg-[#1a1b26] text-green-400 px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y ${
                  schemaError ? "border-red-500" : "border-input"
                }`}
                placeholder='{"type": "object", "properties": {}, "required": []}'
                spellCheck={false}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsActive(!isActive)}
                className="flex items-center gap-2 text-sm"
              >
                {isActive ? (
                  <ToggleRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                )}
                <span
                  className={
                    isActive ? "text-green-500" : "text-muted-foreground"
                  }
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-6 border-t border-border">
            <div>
              {isEdit && onDelete && (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={
                    confirmDelete
                      ? "text-destructive hover:text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {deleting
                    ? "Deleting..."
                    : confirmDelete
                      ? "Confirm Delete"
                      : "Delete"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving || !name.trim() || !displayName.trim() || !!schemaError
                }
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                {isEdit ? "Save Changes" : "Create Tool"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// MAIN PAGE
// ============================================

function ToolDefinitions() {
  useSEO({ title: "Tool Definitions", noIndex: true });

  const { supabase, isLoading: authLoading } = useAuthenticatedSupabase();
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      let query = supabase
        .from("tool_definitions")
        .select("*")
        .order("capability_name")
        .order("name");

      if (activeFilter === "true") query = query.eq("is_active", true);
      else if (activeFilter === "false") query = query.eq("is_active", false);

      if (capFilter) query = query.eq("capability_name", capFilter);

      const { data } = await query;
      setTools((data as ToolDefinition[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [supabase, capFilter, activeFilter]);

  useEffect(() => {
    if (!authLoading && supabase) fetchTools();
  }, [authLoading, supabase, fetchTools]);

  const filteredTools = useMemo(() => {
    if (!search) return tools;
    const lower = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.display_name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.capability_name.toLowerCase().includes(lower),
    );
  }, [tools, search]);

  const capabilities = useMemo(
    () => [...new Set(tools.map((t) => t.capability_name))].sort(),
    [tools],
  );

  const stats = useMemo(
    () => ({
      total: tools.length,
      active: tools.filter((t) => t.is_active).length,
      capabilities: new Set(tools.map((t) => t.capability_name)).size,
    }),
    [tools],
  );

  const handleSave = async (data: Partial<ToolDefinition>) => {
    if (!supabase) return;
    if (data.id) {
      const { id, ...updates } = data;
      await supabase.from("tool_definitions").update(updates).eq("id", id);
    } else {
      await supabase.from("tool_definitions").insert(data);
    }
    await fetchTools();
  };

  const handleDelete = async (id: string) => {
    if (!supabase) return;
    await supabase.from("tool_definitions").delete().eq("id", id);
    await fetchTools();
  };

  const toggleActive = async (tool: ToolDefinition) => {
    if (!supabase) return;
    await supabase
      .from("tool_definitions")
      .update({ is_active: !tool.is_active })
      .eq("id", tool.id);
    await fetchTools();
  };

  const copySchema = (tool: ToolDefinition) => {
    navigator.clipboard.writeText(JSON.stringify(tool.input_schema, null, 2));
    setCopiedId(tool.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openNew = () => {
    setEditingTool(null);
    setModalOpen(true);
  };
  const openEdit = (tool: ToolDefinition) => {
    setEditingTool(tool);
    setModalOpen(true);
  };

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Hammer className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              Tool Definitions
            </h1>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Tool
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Tools", value: stats.total },
            { label: "Active", value: stats.active },
            { label: "Capabilities", value: stats.capabilities },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="pl-9"
            />
          </div>
          <select
            value={capFilter}
            onChange={(e) => setCapFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Capabilities</option>
            {capabilities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Tool Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-20">
            <Hammer className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              No tool definitions
            </h3>
            <p className="text-muted-foreground mb-4">
              Define tools that AI agents can use.
            </p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-1" /> Create Tool
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTools.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => openEdit(tool)}
                        className="text-foreground font-semibold hover:text-primary transition-colors text-left truncate"
                      >
                        {tool.display_name}
                      </button>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-mono"
                      >
                        {tool.capability_name}
                      </Badge>
                      {!tool.is_active && (
                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
                          inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
                      {tool.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="font-mono">{tool.name}</span>
                      <span>→</span>
                      <span className="font-mono text-primary/70">
                        {tool.action_name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copySchema(tool)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Copy schema"
                    >
                      {copiedId === tool.id ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleActive(tool)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title={tool.is_active ? "Deactivate" : "Activate"}
                    >
                      {tool.is_active ? (
                        <ToggleRight className="w-4 h-4 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(tool)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <ToolModal
        tool={editingTool}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </AdminLayout>
  );
}

export default ToolDefinitions;
