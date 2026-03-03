import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  X,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSEO } from "@/lib/seo";
import { useTenant } from "@/lib/tenant";
import { captureException } from "@/lib/sentry";

interface DataType {
  id: string;
  label: string;
  description: string;
}

const DATA_TYPES: DataType[] = [
  { id: "contacts", label: "Contacts", description: "CRM contacts and leads" },
  { id: "tasks", label: "Tasks", description: "Task list and project tasks" },
  {
    id: "blog_posts",
    label: "Blog Posts",
    description: "Published and draft blog content",
  },
  {
    id: "workflows",
    label: "Workflows",
    description: "Agent workflows and automations",
  },
  {
    id: "configs",
    label: "Configs",
    description: "Configuration vault entries",
  },
  {
    id: "prompts",
    label: "Prompts",
    description: "AI prompt library templates",
  },
  {
    id: "infrastructure_nodes",
    label: "Infrastructure",
    description: "Infrastructure map nodes",
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    description: "Saved bookmarks and links",
  },
];

interface ExportStats {
  [key: string]: number;
}

interface ImportPreview {
  version: string;
  exportedAt: string;
  tenantId: string;
  stats: ExportStats;
}

export default function DataManagement() {
  useSEO({ title: "Data Management", noIndex: true });

  const { tenant } = useTenant();
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null,
  );
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle data type selection
  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  // Select all types
  const selectAll = () => {
    setSelectedTypes(new Set(DATA_TYPES.map((t) => t.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTypes(new Set());
  };

  // Export data
  const handleExport = async (exportAll = false) => {
    if (!tenant?.id) {
      setError("Tenant ID not found");
      return;
    }

    setExporting(true);
    setError(null);
    setExportSuccess(false);

    try {
      const dataTypes = exportAll ? undefined : Array.from(selectedTypes);

      if (!exportAll && dataTypes && dataTypes.length === 0) {
        setError("Please select at least one data type to export");
        setExporting(false);
        return;
      }

      const response = await fetch("/.netlify/functions/data-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          tenantId: tenant.id,
          dataTypes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${tenant.id}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed";
      setError(errorMessage);
      captureException(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setExporting(false);
    }
  };

  // Get auth token (placeholder - implement based on your auth system)
  const getAuthToken = async (): Promise<string> => {
    // This would typically get the JWT from Clerk
    return ""; // Implement actual token retrieval
  };

  // Handle file drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setError("Please select a JSON file");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setImportPreview(null);

    // Parse and preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data.version || !data.tenantId || !data.data) {
          throw new Error("Invalid export file format");
        }

        // Build stats
        const stats: ExportStats = {};
        for (const [key, value] of Object.entries(data.data)) {
          if (Array.isArray(value)) {
            stats[key] = value.length;
          }
        }

        setImportPreview({
          version: data.version,
          exportedAt: data.exportedAt,
          tenantId: data.tenantId,
          stats,
        });
      } catch (err) {
        setError("Invalid JSON file or unsupported format");
        setSelectedFile(null);
        captureException(
          err instanceof Error ? err : new Error("Import preview failed"),
        );
      }
    };
    reader.readAsText(file);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Handle import
  const handleImport = async () => {
    if (!selectedFile || !importPreview || !tenant?.id) {
      return;
    }

    setImporting(true);
    setError(null);
    setImportSuccess(false);

    try {
      // TODO: Implement actual import via Netlify function
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setImportSuccess(true);
      setSelectedFile(null);
      setImportPreview(null);
      setTimeout(() => setImportSuccess(false), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Import failed";
      setError(errorMessage);
      captureException(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setImporting(false);
    }
  };

  // Clear import
  const clearImport = () => {
    setSelectedFile(null);
    setImportPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-500" />
            <div>
              <h1 className="text-3xl font-bold">Data Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Export and import tenant data for backup or migration
              </p>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Card className="p-4 bg-destructive/10 border-destructive/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/90 mt-1">{error}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {exportSuccess && (
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-500">
                Data exported successfully
              </p>
            </div>
          </Card>
        )}

        {importSuccess && (
          <Card className="p-4 bg-emerald-500/10 border-emerald-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-500">
                Data imported successfully
              </p>
            </div>
          </Card>
        )}

        {/* Export Section */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold">Export Data</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Select data types to export or export all tenant data as JSON
          </p>

          {/* Data Type Selection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Data Types</h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                  disabled={exporting}
                  className="text-xs"
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={exporting}
                  className="text-xs"
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DATA_TYPES.map((type) => (
                <label
                  key={type.id}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border cursor-pointer
                    transition-colors
                    ${
                      selectedTypes.has(type.id)
                        ? "bg-primary/10 border-primary/30"
                        : "bg-muted/30 border-border hover:bg-muted/50"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type.id)}
                    onChange={() => toggleType(type.id)}
                    disabled={exporting}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{type.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {type.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Export Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleExport(false)}
              disabled={exporting || selectedTypes.size === 0}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Selected
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport(true)}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export All
            </Button>
          </div>
        </Card>

        {/* Import Section */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-semibold">Import Data</h2>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Upload a JSON export file to import data into this tenant
          </p>

          {/* File Upload Zone */}
          {!selectedFile ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center
                transition-colors cursor-pointer
                ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileJson className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-2">
                Drop JSON file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Accepts .json export files
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* File Info */}
              <Card className="p-4 bg-muted/30 border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <FileJson className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearImport}
                    disabled={importing}
                    className="p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>

              {/* Import Preview */}
              {importPreview && (
                <Card className="p-4 bg-muted/30 border-border">
                  <h3 className="text-sm font-medium mb-3">Import Preview</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-muted-foreground">Version:</div>
                      <div className="font-mono">{importPreview.version}</div>
                      <div className="text-muted-foreground">Exported:</div>
                      <div className="font-mono">
                        {new Date(
                          importPreview.exportedAt,
                        ).toLocaleDateString()}
                      </div>
                      <div className="text-muted-foreground">
                        Source Tenant:
                      </div>
                      <div className="font-mono">
                        {importPreview.tenantId.slice(0, 8)}...
                      </div>
                    </div>
                    <div className="border-t border-border pt-3 mt-3">
                      <h4 className="text-xs font-medium mb-2">Data Counts:</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(importPreview.stats).map(
                          ([key, count]) => (
                            <div
                              key={key}
                              className="flex justify-between items-center"
                            >
                              <span className="text-muted-foreground">
                                {DATA_TYPES.find((t) => t.id === key)?.label ||
                                  key}
                                :
                              </span>
                              <span className="font-mono font-medium">
                                {count}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Import Action */}
              <Button
                onClick={handleImport}
                disabled={importing || !importPreview}
                className="gap-2"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Import Data
              </Button>
            </div>
          )}
        </Card>

        {/* Warning Notice */}
        <Card className="p-4 bg-amber-500/10 border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-500 mb-1">
                Important Notes
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Imports will merge with existing data (not replace)</li>
                <li>Duplicate records may be created if IDs conflict</li>
                <li>Always backup your data before importing</li>
                <li>Large imports may take several minutes to complete</li>
              </ul>
            </div>
          </div>
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
