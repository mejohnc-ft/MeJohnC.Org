import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';

interface AIContentSuggestionsProps {
  contentType: 'email_subject' | 'email_body' | 'social_post' | 'blog_title' | 'landing_page_copy';
  context?: Record<string, unknown>;
  onSelect?: (suggestion: string) => void;
}

export function AIContentSuggestions({ contentType, context, onSelect }: AIContentSuggestionsProps) {
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateSuggestions = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      // TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
      // For now, return mock suggestions
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockSuggestions = [
        `${prompt} - Professional Version`,
        `${prompt} - Engaging Version`,
        `${prompt} - Creative Version`,
        `${prompt} - Direct Version`,
      ];

      setSuggestions(mockSuggestions);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'AIContentSuggestions.generateSuggestions',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copySuggestion = (suggestion: string, index: number) => {
    navigator.clipboard.writeText(suggestion);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);

    if (onSelect) {
      onSelect(suggestion);
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

      {suggestions.length > 0 && (
        <div className="space-y-2 mt-6">
          <p className="text-sm font-medium text-muted-foreground">Suggestions:</p>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-3 bg-muted/50 border border-border rounded-md hover:bg-muted transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-foreground flex-1">{suggestion}</p>
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
