/**
 * SavedPanelsPage
 *
 * Displays and manages saved generative UI panels.
 */

'use client';

import { useState } from 'react';
import { Sparkles, BookOpen, Bookmark, Trash2, ExternalLink, Copy, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { GenerativePanel } from '../schemas';

// Mock saved panels for demo
const MOCK_PANELS: GenerativePanel[] = [
  {
    id: '1',
    tenant_id: 'default',
    name: 'Sales Dashboard',
    slug: 'sales-dashboard',
    prompt: 'Create a dashboard with 4 KPI stats showing revenue, users, orders, and growth rate',
    generated_ui: {
      title: 'Sales Dashboard',
      layout: 'stack',
      theme: 'dark',
      nodes: [],
    },
    is_published: true,
    created_by: null,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    tenant_id: 'default',
    name: 'Command Center',
    slug: 'command-center',
    prompt: 'Build a command palette with deployment, database, and monitoring commands',
    generated_ui: {
      title: 'Command Center',
      layout: 'stack',
      theme: 'dark',
      nodes: [],
    },
    is_published: false,
    created_by: null,
    created_at: '2024-01-14T15:45:00Z',
    updated_at: '2024-01-14T15:45:00Z',
  },
];

export default function SavedPanelsPage() {
  const [panels, setPanels] = useState<GenerativePanel[]>(MOCK_PANELS);

  const handleDelete = (id: string) => {
    setPanels((prev) => prev.filter((p) => p.id !== id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Header */}
      <header className="border-b border-[#262626] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3dae2b] to-[#3dae2b]/50 flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e5e5e5]">Saved Panels</h1>
                <p className="text-sm text-[#525252]">{panels.length} panels saved</p>
              </div>
            </div>

            <nav className="flex items-center gap-1">
              <a
                href="/admin/generative"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[#a3a3a3] hover:bg-[#1a1a1a] text-sm font-medium transition-colors"
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
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3dae2b]/10 text-[#3dae2b] text-sm font-medium"
              >
                <Bookmark className="w-4 h-4" />
                Saved
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Panels Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {panels.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 mx-auto mb-4 text-[#262626]" />
            <h2 className="text-xl font-semibold text-[#e5e5e5] mb-2">No saved panels yet</h2>
            <p className="text-[#525252] mb-6">
              Generate a panel and save it to see it here.
            </p>
            <Button asChild className="bg-[#3dae2b] hover:bg-[#3dae2b]/90">
              <a href="/admin/generative">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate New Panel
              </a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {panels.map((panel) => (
              <Card
                key={panel.id}
                className="bg-[#121212] border-[#262626] overflow-hidden hover:border-[#3dae2b] transition-colors"
              >
                {/* Preview Header */}
                <div className="h-32 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
                  <span className="text-4xl opacity-20">
                    {panel.generated_ui.title?.charAt(0) || 'P'}
                  </span>
                </div>

                {/* Panel Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[#e5e5e5]">{panel.name}</h3>
                      <p className="text-xs text-[#525252]">
                        Created {formatDate(panel.created_at)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        panel.is_published
                          ? 'bg-[#3dae2b]/20 text-[#3dae2b]'
                          : 'bg-[#262626] text-[#525252]'
                      }`}
                    >
                      {panel.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <p className="text-sm text-[#a3a3a3] line-clamp-2 mb-4">{panel.prompt}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]"
                      asChild
                    >
                      <a href={`/p/${panel.slug}`}>
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(panel.id)}
                      className="border-[#262626] text-[#a3a3a3] hover:text-red-400 hover:border-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
