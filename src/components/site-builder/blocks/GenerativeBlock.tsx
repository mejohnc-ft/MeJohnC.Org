/**
 * GenerativeBlock
 *
 * Site builder block that embeds a generative UI panel.
 * Can reference an existing panel or allow inline generation.
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { UIRenderer } from '@/features/generative-ui/components/UIRenderer';
import { generationService } from '@/features/generative-ui/services/generation-service';
import type { GeneratedUI } from '@/features/generative-ui/schemas';

export interface GenerativeBlockProps {
  panelId?: string;
  prompt?: string;
  cachedUI?: GeneratedUI;
  showHeader?: boolean;
  autoGenerate?: boolean;
}

export function GenerativeBlock({
  panelId,
  prompt,
  cachedUI,
  showHeader = false,
  autoGenerate = false,
}: GenerativeBlockProps) {
  const [ui, setUI] = useState<GeneratedUI | null>(cachedUI || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have a cached UI, use it
    if (cachedUI) {
      setUI(cachedUI);
      return;
    }

    // If we have a prompt and autoGenerate is true, generate on mount
    if (prompt && autoGenerate && !ui) {
      handleGenerate();
    }
  }, [cachedUI, prompt, autoGenerate]);

  const handleGenerate = async () => {
    if (!prompt) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generationService.generateWithClaude(prompt);
      if (result.success && result.ui) {
        setUI(result.ui);
      } else {
        setError(result.error || 'Generation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#3dae2b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#a3a3a3]">Generating UI...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[#121212] border border-red-500/30 rounded-xl p-8 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        {prompt && (
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3dae2b] text-white rounded-lg hover:bg-[#3dae2b]/90"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
    );
  }

  // Empty state - no UI and no prompt
  if (!ui && !prompt) {
    return (
      <div className="bg-[#121212] border border-dashed border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#262626] mb-4" />
        <p className="text-[#525252] text-center">
          No generative content configured.
          <br />
          <a
            href="/admin/generative"
            className="text-[#3dae2b] hover:underline"
          >
            Create a panel
          </a>
          {' '}or set a prompt.
        </p>
      </div>
    );
  }

  // Prompt but no UI yet
  if (!ui && prompt) {
    return (
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-8 text-center">
        <Sparkles className="w-8 h-8 text-[#3dae2b] mx-auto mb-4" />
        <p className="text-[#a3a3a3] mb-4">Ready to generate from prompt:</p>
        <p className="text-[#e5e5e5] text-sm bg-[#1a1a1a] px-4 py-2 rounded-lg inline-block mb-4">
          "{prompt.slice(0, 100)}{prompt.length > 100 ? '...' : ''}"
        </p>
        <div>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3dae2b] text-white rounded-lg hover:bg-[#3dae2b]/90"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
    );
  }

  // Render the UI
  return (
    <div className="generative-block">
      {showHeader && ui && (
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2 text-sm text-[#525252]">
            <Sparkles className="w-4 h-4 text-[#3dae2b]" />
            <span>Generated Panel</span>
          </div>
          {panelId && (
            <a
              href={`/panel/${panelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#3dae2b] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
          )}
        </div>
      )}
      {ui && <UIRenderer ui={ui} />}
    </div>
  );
}

export default GenerativeBlock;
