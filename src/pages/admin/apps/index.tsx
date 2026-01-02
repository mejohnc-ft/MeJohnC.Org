import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, AppWindow, Edit, Trash2, ExternalLink, Loader2, FolderOpen } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApps, getAppSuites, deleteApp, deleteAppSuite, type App, type AppSuite } from '@/lib/supabase-queries';

const AdminAppsList = () => {
  const [apps, setApps] = useState<(App & { suite: AppSuite | null })[]>([]);
  const [suites, setSuites] = useState<AppSuite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [appsData, suitesData] = await Promise.all([
        getApps(true), // Include unpublished
        getAppSuites(),
      ]);
      setApps(appsData);
      setSuites(suitesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteApp(id: string) {
    if (!confirm('Are you sure you want to delete this app?')) return;

    setDeletingId(id);
    try {
      await deleteApp(id);
      setApps(apps.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Error deleting app:', err);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteSuite(id: string) {
    const appsInSuite = apps.filter((a) => a.suite_id === id);
    if (appsInSuite.length > 0) {
      alert('Cannot delete a suite that contains apps. Remove the apps first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this suite?')) return;

    setDeletingId(id);
    try {
      await deleteAppSuite(id);
      setSuites(suites.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Error deleting suite:', err);
    } finally {
      setDeletingId(null);
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
                <h2 className="text-lg font-semibold text-foreground mb-4">App Suites</h2>
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
                          {suite.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {apps.filter((a) => a.suite_id === suite.id).length} apps
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

            {/* Apps */}
            <section>
              <h2 className="text-lg font-semibold text-foreground mb-4">All Apps</h2>
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
                  {apps.map((app, index) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-4"
                    >
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
                          <Badge variant={app.status === 'published' ? 'default' : 'secondary'}>
                            {app.status}
                          </Badge>
                          {app.suite && (
                            <Badge variant="outline">{app.suite.name}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {app.tagline || 'No tagline'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {app.external_url && (
                          <Button asChild size="sm" variant="ghost">
                            <a href={app.external_url} target="_blank" rel="noopener noreferrer">
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
