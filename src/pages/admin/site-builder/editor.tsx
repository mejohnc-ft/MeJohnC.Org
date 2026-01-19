import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Clock } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSEO } from '@/lib/seo';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import {
  getSiteBuilderPageWithComponents,
  createSiteBuilderPage,
  updateSiteBuilderPage,
  createSiteBuilderPageComponent,
  updateSiteBuilderPageComponent,
  deleteSiteBuilderPageComponent,
  reorderSiteBuilderPageComponents,
  duplicateSiteBuilderPageComponent,
  getSiteBuilderComponentTemplates,
  getSiteBuilderPageVersions,
  createSiteBuilderPageVersion,
} from '@/lib/site-builder-queries';
import { generateSlug } from '@/lib/supabase-queries';
import type { SiteBuilderPage, SiteBuilderPageComponent, SiteBuilderComponentTemplate, SiteBuilderPageVersion } from '@/lib/schemas';
import { captureException } from '@/lib/sentry';
import { PageCanvas } from '@/components/site-builder/PageCanvas';
import { ComponentLibrary } from '@/components/site-builder/ComponentLibrary';
import { PropertyEditor } from '@/components/site-builder/PropertyEditor';
import { PreviewModal } from '@/components/site-builder/PreviewModal';

export default function SiteBuilderEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { supabase } = useAuthenticatedSupabase();
  useSEO({ title: pageId === 'new' ? 'New Page' : 'Edit Page', noIndex: true });

  const [page, setPage] = useState<Partial<SiteBuilderPage>>({
    title: '',
    slug: '',
    description: '',
    status: 'draft',
  });
  const [components, setComponents] = useState<SiteBuilderPageComponent[]>([]);
  const [templates, setTemplates] = useState<SiteBuilderComponentTemplate[]>([]);
  const [, setVersions] = useState<SiteBuilderPageVersion[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<SiteBuilderPageComponent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, supabase]);

  async function loadData() {
    if (!supabase) return;

    try {
      setIsLoading(true);

      const [templatesData] = await Promise.all([
        getSiteBuilderComponentTemplates(undefined, supabase),
      ]);

      setTemplates(templatesData);

      if (pageId && pageId !== 'new') {
        const pageData = await getSiteBuilderPageWithComponents(pageId, supabase);
        setPage(pageData);
        setComponents(pageData.components);

        const versionsData = await getSiteBuilderPageVersions(pageId, 10, supabase);
        setVersions(versionsData);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.loadData',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!supabase || !user) return;

    try {
      setIsSaving(true);

      let currentPageId = pageId;

      if (pageId === 'new') {
        const newPage = await createSiteBuilderPage(
          {
            title: page.title || 'Untitled Page',
            slug: page.slug || generateSlug(page.title || 'untitled-page'),
            description: page.description,
            status: page.status || 'draft',
            meta_title: page.meta_title,
            meta_description: page.meta_description,
            og_image: page.og_image,
            created_by: user.id,
          },
          supabase
        );
        currentPageId = newPage.id;
        setPage(newPage);
      } else {
        await updateSiteBuilderPage(
          pageId!,
          {
            title: page.title,
            slug: page.slug,
            description: page.description,
            meta_title: page.meta_title,
            meta_description: page.meta_description,
            og_image: page.og_image,
            updated_by: user.id,
          },
          supabase
        );
      }

      if (pageId !== 'new' && currentPageId) {
        navigate(`/admin/site-builder/${currentPageId}`, { replace: true });
      }

      alert('Page saved successfully!');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleSave',
      });
      alert('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddComponent(componentType: string, props: Record<string, unknown>) {
    if (!supabase || !pageId || pageId === 'new') {
      alert('Please save the page first before adding components');
      return;
    }

    try {
      const newComponent = await createSiteBuilderPageComponent(
        {
          page_id: pageId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component_type: componentType as any,
          props,
          order_index: components.length,
          parent_id: null,
        },
        supabase
      );

      setComponents([...components, newComponent]);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleAddComponent',
      });
      alert('Failed to add component');
    }
  }

  async function handleUpdateComponent(componentId: string, props: Record<string, unknown>) {
    if (!supabase) return;

    try {
      const updated = await updateSiteBuilderPageComponent(componentId, { props }, supabase);
      setComponents(components.map((c) => (c.id === componentId ? updated : c)));
      setSelectedComponent(updated);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleUpdateComponent',
      });
      alert('Failed to update component');
    }
  }

  async function handleDeleteComponent(componentId: string) {
    if (!supabase) return;

    try {
      await deleteSiteBuilderPageComponent(componentId, supabase);
      setComponents(components.filter((c) => c.id !== componentId));
      if (selectedComponent?.id === componentId) {
        setSelectedComponent(null);
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleDeleteComponent',
      });
      alert('Failed to delete component');
    }
  }

  async function handleDuplicateComponent(componentId: string) {
    if (!supabase) return;

    try {
      const duplicated = await duplicateSiteBuilderPageComponent(componentId, supabase);
      setComponents([...components, duplicated]);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleDuplicateComponent',
      });
      alert('Failed to duplicate component');
    }
  }

  async function handleReorder(reorderedComponents: SiteBuilderPageComponent[]) {
    if (!supabase) return;

    try {
      await reorderSiteBuilderPageComponents(
        reorderedComponents.map((c) => c.id),
        supabase
      );
      setComponents(reorderedComponents);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleReorder',
      });
      alert('Failed to reorder components');
    }
  }

  async function handleCreateVersion() {
    if (!supabase || !user || !pageId || pageId === 'new') return;

    try {
      await createSiteBuilderPageVersion(pageId, user.id, supabase);
      alert('Version saved successfully!');
      loadData();
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'SiteBuilderEditor.handleCreateVersion',
      });
      alert('Failed to create version');
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/site-builder">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {pageId === 'new' ? 'New Page' : page.title || 'Edit Page'}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              {pageId !== 'new' && (
                <Button variant="outline" onClick={handleCreateVersion}>
                  <Clock className="w-4 h-4 mr-2" />
                  Save Version
                </Button>
              )}
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Page'}
              </Button>
            </div>
          </div>

          {/* Page Settings */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-card border border-border rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-2">Page Title</label>
              <Input
                value={page.title || ''}
                onChange={(e) => {
                  setPage({ ...page, title: e.target.value });
                  if (!page.slug) {
                    setPage((prev) => ({ ...prev, slug: generateSlug(e.target.value) }));
                  }
                }}
                placeholder="Enter page title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">URL Slug</label>
              <Input
                value={page.slug || ''}
                onChange={(e) => setPage({ ...page, slug: e.target.value })}
                placeholder="page-url-slug"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Description</label>
              <Input
                value={page.description || ''}
                onChange={(e) => setPage({ ...page, description: e.target.value })}
                placeholder="Brief description of the page"
              />
            </div>
          </div>

          {/* Editor Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Component Library */}
            <div className="col-span-3 bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold">Components</h3>
              </div>
              <ComponentLibrary templates={templates} onAddComponent={handleAddComponent} />
            </div>

            {/* Canvas */}
            <div className="col-span-6">
              <PageCanvas
                components={components}
                onReorder={handleReorder}
                onSelectComponent={setSelectedComponent}
                selectedComponent={selectedComponent}
                onDeleteComponent={handleDeleteComponent}
                onDuplicateComponent={handleDuplicateComponent}
              />
            </div>

            {/* Property Editor */}
            <div className="col-span-3 bg-card border border-border rounded-lg overflow-hidden">
              <PropertyEditor component={selectedComponent} onUpdate={handleUpdateComponent} />
            </div>
          </div>
        </div>
      </AdminLayout>

      {/* Preview Modal */}
      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        components={components}
        pageTitle={page.title || 'Untitled Page'}
      />
    </>
  );
}
