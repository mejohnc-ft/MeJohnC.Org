import { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';
import { generateContentSuggestions, isAIConfigured, type ContentSuggestion } from '@/lib/ai-service';

interface AIContentSuggestionsProps {
  contentType: 'email_subject' | 'email_body' | 'social_post' | 'blog_title' | 'landing_page_copy';
  context?: Record<string, unknown>;
  onSelect?: (suggestion: string) => void;
}

export function AIContentSuggestions({ contentType, context, onSelect }: AIContentSuggestionsProps) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSuggestions = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateContentSuggestions(prompt, contentType, context);

      if (result.data) {
        setSuggestions(result.data);
      }

      if (result.error && !isAIConfigured()) {
        setError('AI service not configured. Showing example suggestions.');
      }
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        context: 'AIContentSuggestions.generateSuggestions',
      });
      setError('Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copySuggestion = (suggestion: ContentSuggestion, index: number) => {
    navigator.clipboard.writeText(suggestion.content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);

    if (onSelect) {
      onSelect(suggestion.content);
    }
  };

  const getPlaceholder = () => {
    const placeholders = {
      email_subject: 'Describe your email campaign...',
      email_body: 'What should the email be about?',
      social_post: 'What do you want to share?',
      blog_title: 'What is your blog post about?',
      landing_page_copy: 'Describe your product or service...',
    };
    return placeholders[contentType];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-foreground">AI Content Helper</h3>
      </div>

      <div className="space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full px-3 py-2 bg-card border border-border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
          disabled={isGenerating}
        />

        <Button
          onClick={generateSuggestions}
          disabled={!prompt.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <span className="animate-spin mr-2">⚡</span>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Suggestions
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-500">{error}</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2 mt-6">
          <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {suggestion.tone}
                  </span>
                  <p className="text-sm text-foreground mt-1">{suggestion.content}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copySuggestion(suggestion, index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {copiedIndex === index ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-4">
        AI suggestions are starting points. Always review and customize before using.
      </p>
    </div>
  );
}
