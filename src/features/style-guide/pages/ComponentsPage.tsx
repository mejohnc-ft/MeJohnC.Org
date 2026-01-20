/**
 * ComponentsPage Component
 *
 * Displays component guidelines and documentation.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState, useEffect } from 'react';
import { Layers, Plus } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ComponentShowcase } from '../components';
import { useSEO } from '@/lib/seo';
import { useSupabase } from '@/lib/supabase-client';
import { StyleServiceSupabase } from '@/services/style';
import type { Guideline } from '../schemas';

export default function ComponentsPage() {
  useSEO({ title: 'Components', noIndex: true });

  const supabase = useSupabase();
  const [guidelines, setGuidelines] = useState<Guideline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGuidelines();
  }, []);

  const loadGuidelines = async () => {
    try {
      setIsLoading(true);
      const service = new StyleServiceSupabase();
      const data = await service.getGuidelines(
        { client: supabase },
        { category: 'components' }
      );
      setGuidelines(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load guidelines');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Component Guidelines</h1>
            <p className="text-muted-foreground mt-1">
              Design patterns and component documentation
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Guideline
          </Button>
        </div>

        {error && (
          <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}

        {guidelines.length === 0 && !error ? (
          <Card className="p-12 text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No component guidelines yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start documenting your component patterns and best practices.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Guideline
            </Button>
          </Card>
        ) : (
          <ComponentShowcase guidelines={guidelines} />
        )}
      </div>
    </AdminLayout>
  );
}
