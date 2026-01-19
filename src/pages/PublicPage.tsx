import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useSEO } from '@/lib/seo';
import { supabase } from '@/lib/supabase';
import { getSiteBuilderPageBySlug, getSiteBuilderPageComponents } from '@/lib/site-builder-queries';
import type { SiteBuilderPage, SiteBuilderPageComponent } from '@/lib/schemas';
import { BLOCK_COMPONENTS } from '@/components/site-builder/blocks';
import { captureException } from '@/lib/sentry';

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SiteBuilderPage | null>(null);
  const [components, setComponents] = useState<SiteBuilderPageComponent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: page?.meta_title || page?.title || 'Page',
    description: page?.meta_description || page?.description || undefined,
    ogImage: page?.og_image || undefined,
  });

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function loadPage() {
    if (!slug) return;

    try {
      setIsLoading(true);
      setError(null);

      const pageData = await getSiteBuilderPageBySlug(slug, supabase);

      if (pageData.status !== 'published') {
        setError('Page not found');
        return;
      }

      setPage(pageData);

      const componentsData = await getSiteBuilderPageComponents(pageData.id, supabase);
      setComponents(componentsData);
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'PublicPage.loadPage',
      });
      setError('Page not found');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !page) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The page you're looking for doesn't exist or has been removed.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
            >
              Go Home
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {components.map((component) => {
          const Component = BLOCK_COMPONENTS[component.component_type as keyof typeof BLOCK_COMPONENTS];

          if (!Component) {
            return null;
          }

          return <Component key={component.id} {...(component.props as Record<string, unknown>)} />;
        })}
      </div>
    </Layout>
  );
}
