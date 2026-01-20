/**
 * ColorsPage Component
 *
 * Displays color palettes from design tokens.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState, useEffect } from 'react';
import { Palette, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ColorPalette } from '../components';
import { useSEO } from '@/lib/seo';
import { generateDefaultTokens } from '@/lib/tailwind-generator';
import type { DesignTokens } from '../schemas';

export default function ColorsPage() {
  useSEO({ title: 'Colors', noIndex: true });

  const [tokens, setTokens] = useState<DesignTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, load default tokens
    // In the future, this would fetch from the selected brand
    const defaultTokens = generateDefaultTokens();
    setTokens(defaultTokens as DesignTokens);
    setIsLoading(false);
  }, []);

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
            <h1 className="text-2xl font-bold text-foreground">Color Palette</h1>
            <p className="text-muted-foreground mt-1">
              Brand colors and design tokens
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Colors
          </Button>
        </div>

        {tokens && tokens.colors.length > 0 ? (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Palette className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{tokens.metadata.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tokens.colors.length} colors • Last updated:{' '}
                    {new Date(tokens.metadata.extractedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <ColorPalette colors={tokens.colors} />
          </>
        ) : (
          <Card className="p-12 text-center">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No colors defined</h3>
            <p className="text-muted-foreground">
              Connect to Figma or create custom color tokens.
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
