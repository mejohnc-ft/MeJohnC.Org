/**
 * PanelPage
 *
 * Public page for viewing published generative UI panels.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { UIRenderer } from '@/features/generative-ui/components/UIRenderer';
import { genuiQueries } from '@/features/generative-ui/services/genui-queries';
import type { GenerativePanel } from '@/features/generative-ui/schemas';

export default function PanelPage() {
  const { slug } = useParams<{ slug: string }>();
  const [panel, setPanel] = useState<GenerativePanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPanel() {
      if (!slug) return;

      try {
        const data = await genuiQueries.getPanelBySlug(slug);
        setPanel(data);
      } catch (err) {
        console.error('Failed to load panel:', err);
        setError('Panel not found or not published');
      } finally {
        setLoading(false);
      }
    }

    loadPanel();
  }, [slug]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: panel?.name || 'Generative UI Panel',
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3dae2b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#e5e5e5] mb-2">Panel Not Found</h1>
          <p className="text-[#a3a3a3] mb-6">{error || 'This panel does not exist or has not been published.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3dae2b] text-white rounded-lg hover:bg-[#3dae2b]/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[#a3a3a3] hover:text-[#e5e5e5] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-[#e5e5e5]">{panel.name}</h1>
              {panel.description && (
                <p className="text-sm text-[#525252]">{panel.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#e5e5e5] transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <a
              href="/admin/generative"
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#3dae2b] text-white rounded-lg hover:bg-[#3dae2b]/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Create Your Own
            </a>
          </div>
        </div>
      </header>

      {/* Panel Content */}
      <main className="pt-16">
        <UIRenderer ui={panel.generated_ui} />
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-[#262626]">
        <p className="text-sm text-[#525252]">
          Created with{' '}
          <a
            href="/admin/generative"
            className="text-[#3dae2b] hover:underline"
          >
            Generative UI
          </a>
          {' '}• Powered by CentrexStyle
        </p>
      </footer>
    </div>
  );
}
