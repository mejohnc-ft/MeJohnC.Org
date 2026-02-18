import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  AppWindow,
  Edit,
  Trash2,
  ExternalLink,
  Loader2,
  FolderOpen,
  CheckSquare,
  Square,
  Send,
  Archive,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthenticatedSupabase } from "@/lib/supabase";
import {
  getApps,
  getAppSuites,
  deleteApp,
  deleteAppSuite,
  bulkDeleteApps,
  bulkUpdateAppStatus,
  type App,
  type AppSuite,
} from "@/lib/supabase-queries";
import { useSEO } from "@/lib/seo";
import { captureException } from "@/lib/sentry";

const statusLabels: Record<string, string> = {
  planned: "Planned",
  in_development: "In Development",
  available: "Available",
  archived: "Archived",
};

const statusColors: Record<string, string> = {
  planned: "secondary",
  in_development: "outline",
  available: "default",
  archived: "secondary",
};

const AdminAppsList = () => {
  useSEO({ title: "Manage Apps", noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [apps, setApps] = useState<(App & { suite: AppSuite | null })[]>([]);
  const [suites, setSuites] = useState<AppSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }
    try {
      const [appsData, suitesData] = await Promise.all([
        getApps(true, supabase), // Include all statuses
        getAppSuites(supabase),
      ]);
      setApps(appsData);
      setSuites(suitesData);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.fetchData",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDeleteApp(id: string) {
    if (!confirm("Are you sure you want to delete this app?")) return;

    setDeletingId(id);
    try {
      await deleteApp(id, supabase);
      setApps(apps.filter((a) => a.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.deleteApp",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteSuite(id: string) {
    const appsInSuite = apps.filter((a) => a.suite_id === id);
    if (appsInSuite.length > 0) {
      toast.error(
        "Cannot delete a suite that contains apps. Remove the apps first.",
      );
      return;
    }

    if (!confirm("Are you sure you want to delete this suite?")) return;

    setDeletingId(id);
    try {
      await deleteAppSuite(id, supabase);
      setSuites(suites.filter((s) => s.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.deleteSuite",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // Bulk operations
  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === apps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(apps.map((a) => a.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} app(s)?`))
      return;

    setIsBulkProcessing(true);
    try {
      await bulkDeleteApps(Array.from(selectedIds), supabase);
      setApps(apps.filter((a) => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.bulkDelete",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkMakeAvailable() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateAppStatus(Array.from(selectedIds), "available", supabase);
      setApps(
        apps.map((a) =>
          selectedIds.has(a.id) ? { ...a, status: "available" as const } : a,
        ),
      );
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.bulkUpdate",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkArchive() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateAppStatus(Array.from(selectedIds), "archived", supabase);
      setApps(
        apps.map((a) =>
          selectedIds.has(a.id) ? { ...a, status: "archived" as const } : a,
        ),
      );
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: "AdminApps.bulkArchive",
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Apps</h1>
            <p className="text-muted-foreground">
              Manage your apps and app suites
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/admin/apps/new-suite">
                <FolderOpen className="w-4 h-4 mr-2" />
                New Suite
              </Link>
            </Button>
            <Button asChild>
              <Link to="/admin/apps/new">
                <Plus className="w-4 h-4 mr-2" />
                New App
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Suites */}
            {suites.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  App Suites
                </h2>
                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  {suites.map((suite, index) => (
                    <motion.div
                      key={suite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6 text-primary" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">
                          {suite.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {suite.description || "No description"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {apps.filter((a) => a.suite_id === suite.id).length}{" "}
                          apps
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/admin/apps/suite/${suite.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSuite(suite.id)}
                          disabled={deletingId === suite.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          {deletingId === suite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Bulk Actions Toolbar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg"
                >
                  <span className="text-sm font-medium text-foreground">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkMakeAvailable}
                      disabled={isBulkProcessing}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Make Available
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkArchive}
                      disabled={isBulkProcessing}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleBulkDelete}
                      disabled={isBulkProcessing}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-auto"
                  >
                    Clear selection
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Apps */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                All Apps
              </h2>
              {apps.length === 0 ? (
                <div className="text-center py-20 bg-card border border-border rounded-lg">
                  <AppWindow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    No apps yet
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Create your first app to get started.
                  </p>
                  <Button asChild>
                    <Link to="/admin/apps/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Create App
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg divide-y divide-border">
                  {/* Select All Header */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30">
                    <button
                      onClick={toggleSelectAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={
                        selectedIds.size === apps.length
                          ? "Deselect all apps"
                          : "Select all apps"
                      }
                    >
                      {selectedIds.size === apps.length ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size === apps.length
                        ? "Deselect all"
                        : "Select all"}
                    </span>
                  </div>
                  {apps.map((app, index) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 ${selectedIds.has(app.id) ? "bg-primary/5" : ""}`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(app.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          selectedIds.has(app.id)
                            ? `Deselect ${app.name}`
                            : `Select ${app.name}`
                        }
                      >
                        {selectedIds.has(app.id) ? (
                          <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>

                      {/* Icon */}
                      <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                        {app.icon_url ? (
                          <img
                            src={app.icon_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <AppWindow className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {app.name}
                          </h3>
                          <Badge
                            variant={
                              statusColors[app.status] as
                                | "default"
                                | "secondary"
                                | "outline"
                            }
                          >
                            {statusLabels[app.status]}
                          </Badge>
                          {app.suite && (
                            <Badge variant="outline">{app.suite.name}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {app.tagline || "No tagline"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {app.external_url && (
                          <Button asChild size="sm" variant="ghost">
                            <a
                              href={app.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/admin/apps/${app.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteApp(app.id)}
                          disabled={deletingId === app.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          {deletingId === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAppsList;
