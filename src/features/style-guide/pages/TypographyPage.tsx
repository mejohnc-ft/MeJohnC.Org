/**
 * TypographyPage Component
 *
 * Displays typography scales from design tokens.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/110
 */

import { useState, useEffect } from 'react';
import { Type, Download } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TypographyScale } from '../components';
import { useSEO } from '@/lib/seo';
import { generateDefaultTokens } from '@/lib/tailwind-generator';
import type { DesignTokens } from '../schemas';

export default function TypographyPage() {
  useSEO({ title: 'Typography', noIndex: true });

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
            <h1 className="text-2xl font-bold text-foreground">Typography</h1>
            <p className="text-muted-foreground mt-1">
              Font families, sizes, and styles
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Typography
          </Button>
        </div>

        {tokens && tokens.typography.length > 0 ? (
          <>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Type className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{tokens.metadata.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {tokens.typography.length} styles • Last updated:{' '}
                    {new Date(tokens.metadata.extractedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <TypographyScale typography={tokens.typography} />
          </>
        ) : (
          <Card className="p-12 text-center">
            <Type className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No typography styles defined
            </h3>
            <p className="text-muted-foreground">
              Connect to Figma or create custom typography tokens.
            </p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
