import { useEffect } from 'react';
import { useSEO } from '@/lib/seo';

/**
 * Territories Project Page
 *
 * This page redirects to the static HTML application located at
 * /projects/territories/index.html which contains the full
 * Design DNA Explorer (Typeset) application.
 */
export default function TerritoriesProject() {
  useSEO({
    title: 'Territories - Design System Explorer',
    description: 'A comprehensive design reference and exploration tool for AI-forward product design. Explore design territories, compare philosophies, build custom design recipes, and travel through design history.',
    url: '/projects/territories',
    type: 'website',
  });

  useEffect(() => {
    // Redirect to the static HTML application
    window.location.href = '/projects/territories/';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading Territories...</p>
      </div>
    </div>
  );
}
