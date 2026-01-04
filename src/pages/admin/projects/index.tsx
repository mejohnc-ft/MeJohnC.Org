import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, Edit, Trash2, ExternalLink, Loader2, CheckSquare, Square, Send, Archive } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseClient } from '@/lib/supabase';
import { getProjects, deleteProject, bulkDeleteProjects, bulkUpdateProjectStatus, type Project } from '@/lib/supabase-queries';
import { formatDate } from '@/lib/markdown';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';

const AdminProjectsList = () => {
  useSEO({ title: 'Manage Projects', noIndex: true });
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');
  const supabase = useSupabaseClient();
  const [projects, setProjects] = useState<Project[]>([]);
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
      const data = await getProjects(true, supabase);
      setProjects(data);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminProjects.fetchProjects' });
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    setDeletingId(id);
    try {
      await deleteProject(id, supabase);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminProjects.deleteProject' });
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
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} project(s)?`)) return;

    setIsBulkProcessing(true);
    try {
      await bulkDeleteProjects(Array.from(selectedIds), supabase);
      setProjects(projects.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminProjects.bulkDelete' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkPublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateProjectStatus(Array.from(selectedIds), 'published', supabase);
      setProjects(projects.map((p) =>
        selectedIds.has(p.id) ? { ...p, status: 'published' as const } : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminProjects.bulkPublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleBulkUnpublish() {
    setIsBulkProcessing(true);
    try {
      await bulkUpdateProjectStatus(Array.from(selectedIds), 'draft', supabase);
      setProjects(projects.map((p) =>
        selectedIds.has(p.id) ? { ...p, status: 'draft' as const } : p
      ));
      setSelectedIds(new Set());
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { context: 'AdminProjects.bulkUnpublish' });
    } finally {
      setIsBulkProcessing(false);
    }
  }

  const filteredProjects = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">
              Manage your portfolio projects
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Link to="/admin/projects">
            <Badge variant={!statusFilter ? 'default' : 'secondary'}>
              All ({projects.length})
            </Badge>
          </Link>
          <Link to="/admin/projects?status=published">
            <Badge variant={statusFilter === 'published' ? 'default' : 'secondary'}>
              Published ({projects.filter((p) => p.status === 'published').length})
            </Badge>
          </Link>
          <Link to="/admin/projects?status=draft">
            <Badge variant={statusFilter === 'draft' ? 'default' : 'secondary'}>
              Drafts ({projects.filter((p) => p.status === 'draft').length})
            </Badge>
          </Link>
          <Link to="/admin/projects?status=scheduled">
            <Badge variant={statusFilter === 'scheduled' ? 'default' : 'secondary'}>
              Scheduled ({projects.filter((p) => p.status === 'scheduled').length})
            </Badge>
          </Link>
        </div>

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
                  onClick={handleBulkPublish}
                  disabled={isBulkProcessing}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkUnpublish}
                  disabled={isBulkProcessing}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Unpublish
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

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-lg">
            <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No projects yet
            </h2>
            <p className="text-muted-foreground mb-4">
              Create your first project to get started.
            </p>
            <Button asChild>
              <Link to="/admin/projects/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Project
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
                aria-label={selectedIds.size === filteredProjects.length ? 'Deselect all projects' : 'Select all projects'}
              >
                {selectedIds.size === filteredProjects.length ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size === filteredProjects.length ? 'Deselect all' : 'Select all'}
              </span>
            </div>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-4 p-4 ${selectedIds.has(project.id) ? 'bg-primary/5' : ''}`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(project.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={selectedIds.has(project.id) ? `Deselect ${project.name}` : `Select ${project.name}`}
                >
                  {selectedIds.has(project.id) ? (
                    <CheckSquare className="w-5 h-5 text-primary" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>

                {/* Cover Image */}
                <div className="w-16 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                  {project.cover_image ? (
                    <img
                      src={project.cover_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderKanban className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      {project.name}
                    </h3>
                    <Badge variant={project.status === 'published' ? 'default' : project.status === 'scheduled' ? 'outline' : 'secondary'}>
                      {project.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {project.tagline || 'No tagline'}
                  </p>
                  {project.status === 'scheduled' && project.scheduled_for && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Scheduled for {formatDate(project.scheduled_for)}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {project.external_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={project.external_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  <Button asChild size="sm" variant="ghost">
                    <Link to={`/admin/projects/${project.id}/edit`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(project.id)}
                    disabled={deletingId === project.id}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    {deletingId === project.id ? (
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
      </div>
    </AdminLayout>
  );
};

export default AdminProjectsList;
