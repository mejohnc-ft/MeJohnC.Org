/**
 * GenerativePage
 *
 * Main admin page for the Generative UI feature.
 * Provides the AI-powered panel generation interface.
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Bookmark } from 'lucide-react';
import { GenerativePanel } from '../components/GenerativePanel';
import { genuiQueries } from '../services/genui-queries';
import type { GeneratedUI } from '../schemas';

export default function GenerativePage() {
  const [savedCount, setSavedCount] = useState(0);

  // Load saved panels count on mount
  useEffect(() => {
    genuiQueries.getPanels().then((panels) => {
      setSavedCount(panels.length);
    }).catch((err) => {
      console.error('Failed to load panels count:', err);
    });
  }, []);

  const handleSave = async (ui: GeneratedUI) => {
    // Generate a slug from the title
    const title = ui.title || 'Untitled Panel';
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    await genuiQueries.createPanel({
      name: title,
      slug,
      description: ui.description,
      prompt: ui.description || title,
      generated_ui: ui,
    });

    setSavedCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3dae2b] to-[#3dae2b]/50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e5e5e5]">Generative UI</h1>
                <p className="text-sm text-[#525252]">AI-powered CentrexStyle components</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href="/admin/generative"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3dae2b]/10 text-[#3dae2b] text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </a>
              <a
                href="/admin/generative/library"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Library
              </a>
              <a
                href="/admin/generative/saved"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Saved ({savedCount})
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <GenerativePanel onSave={handleSave} className="h-[calc(100vh-12rem)]" />
      </main>

      {/* Footer Info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-sm border-t border-[#262626]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-xs text-[#525252]">
          <div className="flex items-center gap-4">
            <span>Powered by CentrexStyle + json-render</span>
            <a
              href="https://json-render.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3dae2b] hover:underline"
            >
              json-render.dev
            </a>
          </div>
          <div className="flex items-center gap-4">
            <span>Components: StatCard, Carousel3D, CommandPalette, MetricChart, ColorPalette</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
