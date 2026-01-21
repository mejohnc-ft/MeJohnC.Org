/**
 * BrandPage Component
 *
 * Main brand management page for the style guide.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Palette, Plus, Settings } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSEO } from '@/lib/seo';
import { useSupabaseClient } from '@/lib/supabase';
import { StyleServiceSupabase } from '@/services/style';
import type { Brand } from '../schemas';

export default function BrandPage() {
  useSEO({ title: 'Brand Management', noIndex: true });

  const supabase = useSupabaseClient();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    try {
      setIsLoading(true);
      const service = new StyleServiceSupabase();
      const data = await service.getBrands({ client: supabase });
      setBrands(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

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
            <h1 className="text-2xl font-bold text-foreground">Brand Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage your brand identities and design systems
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Brand
          </Button>
        </div>

        {error && (
          <Card className="p-4 border-red-500 bg-red-50 dark:bg-red-950">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}

        {brands.length === 0 ? (
          <Card className="p-12 text-center">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No brands yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first brand to start building your design system.
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Brand
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand, index) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      {brand.logo_url && (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-12 mb-4 object-contain"
                        />
                      )}
                      <h3 className="text-lg font-semibold text-foreground">{brand.name}</h3>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {brand.description}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {(brand.primary_color || brand.secondary_color) && (
                    <div className="flex gap-2 mb-4">
                      {brand.primary_color && (
                        <div
                          className="w-12 h-12 rounded-lg border border-border"
                          style={{ backgroundColor: brand.primary_color }}
                          title="Primary Color"
                        />
                      )}
                      {brand.secondary_color && (
                        <div
                          className="w-12 h-12 rounded-lg border border-border"
                          style={{ backgroundColor: brand.secondary_color }}
                          title="Secondary Color"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {brand.design_tokens && (
                      <Badge variant="outline">
                        {brand.design_tokens.colors.length} colors
                      </Badge>
                    )}
                    {brand.figma_file_key && (
                      <Badge variant="secondary">Figma</Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
