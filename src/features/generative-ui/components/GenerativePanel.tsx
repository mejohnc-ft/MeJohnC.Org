/**
 * GenerativePanel Component
 *
 * Main interface for AI-powered UI generation.
 * Combines prompt input, streaming generation, and preview.
 */

'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Send, Loader2, Copy, Check, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UIRenderer } from './UIRenderer';
import { generationService } from '../services/generation-service';
import type { GeneratedUI } from '../schemas';

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
  'Create a dashboard with 4 KPI stats showing revenue, users, orders, and growth rate',
  'Build a command palette with deployment, database, and monitoring commands',
  'Show me a hero section with feature cards below for a SaaS product',
  'Generate a metrics panel with line charts for the last 7 days',
  'Create a 3D carousel showcasing our product features',
  'Display the CentrexStyle color palette',
];

interface GenerativePanelProps {
  brandId?: string;
  availableDataSources?: string[];
  onSave?: (ui: GeneratedUI) => void;
  className?: string;
}


export function GenerativePanel({
  brandId,
  availableDataSources,
  onSave,
  className,
}: GenerativePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUI, setGeneratedUI] = useState<GeneratedUI | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    try {
      // Try Claude first, falls back to mock if no API key
      const result = await generationService.generateWithClaude(prompt, {
        brandId,
        availableDataSources,
      });

      if (result.success && result.ui) {
        setGeneratedUI(result.ui);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      // Fallback to mock
      const ui = await generationService.generateMock(prompt);
      setGeneratedUI(ui);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, brandId, availableDataSources]);

  const handleCopyJSON = useCallback(async () => {
    if (!generatedUI) return;
    await navigator.clipboard.writeText(JSON.stringify(generatedUI, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedUI]);

  const handleSave = useCallback(() => {
    if (generatedUI && onSave) {
      onSave(generatedUI);
    }
  }, [generatedUI, onSave]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Prompt Input Section */}
      <Card className="p-6 bg-[#121212] border-[#262626]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#3dae2b]" />
          <h2 className="text-lg font-bold text-[#e5e5e5]">Generative UI</h2>
        </div>

        <div className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the UI you want to create... (e.g., 'Create a dashboard with 4 KPIs and a trend chart')"
            className="min-h-[100px] bg-[#1a1a1a] border-[#262626] text-[#e5e5e5] placeholder:text-[#525252] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                handleGenerate();
              }
            }}
          />

          {/* Example Prompts */}
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.slice(0, 3).map((example, i) => (
              <button
                key={i}
                onClick={() => setPrompt(example)}
                className="text-xs px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#262626] text-[#a3a3a3] hover:border-[#3dae2b] hover:text-[#3dae2b] transition-colors truncate max-w-[250px]"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#525252]">
              Press <kbd className="px-1.5 py-0.5 rounded bg-[#262626] text-[#a3a3a3]">Cmd</kbd> +{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[#262626] text-[#a3a3a3]">Enter</kbd> to generate
            </span>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-[#3dae2b] hover:bg-[#3dae2b]/90 text-white"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Generated UI Preview */}
      {generatedUI && (
        <div className="flex-1 mt-6 flex flex-col">
          {/* Preview Controls */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#e5e5e5]">Preview</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate()}
                className="border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                className="border-[#262626] text-[#a3a3a3] hover:text-[#e5e5e5]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy JSON
                  </>
                )}
              </Button>
              {onSave && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="bg-[#3dae2b] hover:bg-[#3dae2b]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to Page
                </Button>
              )}
            </div>
          </div>

          {/* Rendered Preview */}
          <Card className="flex-1 overflow-auto bg-[#050505] border-[#262626] rounded-xl">
            <UIRenderer ui={generatedUI} />
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!generatedUI && !isGenerating && (
        <div className="flex-1 flex items-center justify-center mt-6">
          <div className="text-center text-[#525252]">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Describe your UI</p>
            <p className="text-sm">Enter a prompt above to generate CentrexStyle components</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GenerativePanel;
